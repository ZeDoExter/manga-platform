package community

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"strconv"
	"strings"
	"sync"
	"time"

	"manga-platform/services/catalog"
)

type PostCommentRequest struct {
	StoryID    string
	ChapterID  string
	UserID     string
	AuthorName string
	ParentID   string // optional: ID of top-level comment being replied to
	Body       string
}

type Catalog interface {
	GetChapter(ctx context.Context, chapterID string) (*catalog.Chapter, error)
}

type Commerce interface {
	CheckEntitlement(ctx context.Context, userID, chapterID string) (bool, error)
}

type Service struct {
	mu           sync.RWMutex
	comments     map[string]*Comment   // key: comment_id
	byChapter    map[string][]*Comment // key: chapter_id -> slice in chronological order
	byStory      map[string][]*Comment // key: story_id -> slice in chronological order
	blockedWords []string
	catalog      Catalog
	commerce     Commerce
}

func NewService(cat Catalog, com Commerce) *Service {
	return &Service{
		comments:     make(map[string]*Comment),
		byChapter:    make(map[string][]*Comment),
		byStory:      make(map[string][]*Comment),
		blockedWords: []string{"spam", "scam", "phishing", "illegal-download"},
		catalog:      cat,
		commerce:     com,
	}
}

func generateID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return prefix + "_" + hex.EncodeToString(b)
}

// AddBlockedWord configures prohibited words for moderation (FR-CM7).
func (s *Service) AddBlockedWord(word string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.blockedWords = append(s.blockedWords, strings.ToLower(strings.TrimSpace(word)))
}

// PostComment posts a comment or a one-level reply (FR-CM2, FR-CM4, FR-CM5, FR-CM12).
func (s *Service) PostComment(ctx context.Context, req PostCommentRequest) (*Comment, error) {
	// 1. Authentication check (FR-CM4: Guests cannot post)
	if req.UserID == "" {
		return nil, ErrLoginRequired
	}

	body := strings.TrimSpace(req.Body)
	if body == "" || len(body) > 2000 {
		return nil, ErrInvalidCommentBody
	}

	// 2. Blocked word check (FR-CM7)
	s.mu.RLock()
	lowerBody := strings.ToLower(body)
	for _, bw := range s.blockedWords {
		if strings.Contains(lowerBody, bw) {
			s.mu.RUnlock()
			return nil, ErrBlockedWordFound
		}
	}
	s.mu.RUnlock()

	// 3. FR-CM12: Posting on a coin-locked chapter requires having unlocked it
	if s.catalog != nil && s.commerce != nil {
		chap, err := s.catalog.GetChapter(ctx, req.ChapterID)
		if err == nil && !chap.IsFree() {
			entitled, err := s.commerce.CheckEntitlement(ctx, req.UserID, req.ChapterID)
			if err != nil || !entitled {
				return nil, ErrUnlockRequired
			}
		}
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// 4. One-level reply enforcement (FR-CM5)
	if req.ParentID != "" {
		parent, exists := s.comments[req.ParentID]
		if !exists {
			return nil, ErrCommentNotFound
		}
		// If the parent is already a reply, reject (one level only)
		if parent.ParentID != "" {
			return nil, ErrMaxReplyDepth
		}
		parent.ReplyCount++
	}

	comment := &Comment{
		ID:         generateID("cmt"),
		StoryID:    req.StoryID,
		ChapterID:  req.ChapterID,
		UserID:     req.UserID,
		AuthorName: req.AuthorName,
		ParentID:   req.ParentID,
		Body:       body,
		Status:     StatusVisible,
		LikeCount:  0,
		ReplyCount: 0,
		CreatedAt:  time.Now(),
	}

	s.comments[comment.ID] = comment
	s.byChapter[req.ChapterID] = append(s.byChapter[req.ChapterID], comment)
	s.byStory[req.StoryID] = append(s.byStory[req.StoryID], comment)

	return comment, nil
}

// ListChapterComments returns visible comments for a chapter using cursor pagination (FR-CM2).
func (s *Service) ListChapterComments(ctx context.Context, chapterID string, cursor string, limit int) (*CommentPage, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	all := s.byChapter[chapterID]
	return s.paginateComments(all, cursor, limit)
}

// ListStoryComments returns story-wide comments labelled with chapter for all-comments view (FR-CM3).
func (s *Service) ListStoryComments(ctx context.Context, storyID string, cursor string, limit int) (*CommentPage, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	all := s.byStory[storyID]
	return s.paginateComments(all, cursor, limit)
}

func (s *Service) paginateComments(all []*Comment, cursor string, limit int) (*CommentPage, error) {
	var cursorNano int64 = 0
	if cursor != "" {
		if val, err := strconv.ParseInt(cursor, 10, 64); err == nil {
			cursorNano = val
		}
	}

	var results []*Comment
	// Iterate newest to oldest
	for i := len(all) - 1; i >= 0; i-- {
		item := all[i]
		if item.Status == StatusHidden {
			continue // Moderation hidden
		}

		itemNano := item.CreatedAt.UnixNano()
		if cursorNano > 0 && itemNano >= cursorNano {
			continue // Already seen in prior page
		}

		results = append(results, item)
		if len(results) == limit {
			break
		}
	}

	hasMore := false
	var nextCursor string
	if len(results) > 0 {
		lastItem := results[len(results)-1]
		nextCursor = strconv.FormatInt(lastItem.CreatedAt.UnixNano(), 10)

		// Check if more items exist past lastItem
		for i := len(all) - 1; i >= 0; i-- {
			if all[i].Status != StatusHidden && all[i].CreatedAt.UnixNano() < lastItem.CreatedAt.UnixNano() {
				hasMore = true
				break
			}
		}
	}

	return &CommentPage{
		Comments:   results,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

// EditComment allows the author to edit their comment within a 15-minute window (FR-CM5).
func (s *Service) EditComment(ctx context.Context, commentID, userID, newBody string) (*Comment, error) {
	newBody = strings.TrimSpace(newBody)
	if newBody == "" || len(newBody) > 2000 {
		return nil, ErrInvalidCommentBody
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	comment, exists := s.comments[commentID]
	if !exists {
		return nil, ErrCommentNotFound
	}
	if comment.UserID != userID {
		return nil, ErrPermissionDenied // IDOR protection
	}
	if time.Since(comment.CreatedAt) > 15*time.Minute {
		return nil, ErrEditWindowExpired
	}

	now := time.Now()
	comment.Body = newBody
	comment.EditedAt = &now
	return comment, nil
}

// SoftDeleteComment marks a comment as deleted (FR-CM5).
func (s *Service) SoftDeleteComment(ctx context.Context, commentID, userID string, isAdmin bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	comment, exists := s.comments[commentID]
	if !exists {
		return ErrCommentNotFound
	}
	if !isAdmin && comment.UserID != userID {
		return ErrPermissionDenied
	}

	comment.Status = StatusDeleted
	comment.Body = "[This comment has been deleted]"
	return nil
}

// SetCommentStatus allows Admins or Creators to hide/restore comments (FR-CM7, FR-CM8).
func (s *Service) SetCommentStatus(ctx context.Context, commentID string, status CommentStatus) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	comment, exists := s.comments[commentID]
	if !exists {
		return ErrCommentNotFound
	}
	comment.Status = status
	return nil
}
