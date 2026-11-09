package community

import (
	"context"
	"strconv"
	"strings"
	"time"

	"manga-platform/pkg/ids"
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

// Service holds validation + business rules; persistence goes through Store.
type Service struct {
	catalog  Catalog
	commerce Commerce
	store    Store
}

func NewService(cat Catalog, com Commerce) *Service {
	return NewServiceWithStore(cat, com, NewMemoryStore())
}

// NewServiceWithStore creates a service over any Store (e.g. PGStore).
func NewServiceWithStore(cat Catalog, com Commerce, store Store) *Service {
	return &Service{
		catalog:  cat,
		commerce: com,
		store:    store,
	}
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
	blocked, err := s.store.ListBlockedWords(ctx)
	if err != nil {
		return nil, err
	}
	lowerBody := strings.ToLower(body)
	for _, bw := range blocked {
		if strings.Contains(lowerBody, bw) {
			return nil, ErrBlockedWordFound
		}
	}

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

	// 4. One-level reply enforcement (FR-CM5)
	if req.ParentID != "" {
		parent, err := s.store.GetComment(ctx, req.ParentID)
		if err != nil {
			return nil, ErrCommentNotFound
		}
		// If the parent is already a reply, reject (one level only)
		if parent.ParentID != "" {
			return nil, ErrMaxReplyDepth
		}
		if err := s.store.IncrementReplyCount(ctx, req.ParentID); err != nil {
			return nil, err
		}
	}

	comment := &Comment{
		ID:         ids.New("cmt"),
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

	if err := s.store.InsertComment(ctx, comment); err != nil {
		return nil, err
	}

	return comment, nil
}

// AddBlockedWord configures prohibited words for moderation (FR-CM7).
func (s *Service) AddBlockedWord(ctx context.Context, word string) error {
	return s.store.AddBlockedWord(ctx, strings.ToLower(strings.TrimSpace(word)))
}

// ListChapterComments returns visible comments for a chapter using cursor pagination (FR-CM2).
func (s *Service) ListChapterComments(ctx context.Context, chapterID string, cursor string, limit int) (*CommentPage, error) {
	return s.listScoped(ctx, "chapter", chapterID, cursor, limit)
}

// ListStoryComments returns story-wide comments labelled with chapter for all-comments view (FR-CM3).
func (s *Service) ListStoryComments(ctx context.Context, storyID string, cursor string, limit int) (*CommentPage, error) {
	return s.listScoped(ctx, "story", storyID, cursor, limit)
}

func (s *Service) listScoped(ctx context.Context, scope, scopeID, cursor string, limit int) (*CommentPage, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	var cursorNano int64
	if cursor != "" {
		if val, err := strconv.ParseInt(cursor, 10, 64); err == nil {
			cursorNano = val
		}
	}

	rows, err := s.store.ListComments(ctx, scope, scopeID, cursorNano, limit)
	if err != nil {
		return nil, err
	}

	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}
	var nextCursor string
	if len(rows) > 0 {
		nextCursor = strconv.FormatInt(rows[len(rows)-1].CreatedAt.UnixNano(), 10)
	}

	return &CommentPage{
		Comments:   rows,
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

	comment, err := s.store.GetComment(ctx, commentID)
	if err != nil {
		return nil, ErrCommentNotFound
	}
	if comment.UserID != userID {
		return nil, ErrPermissionDenied // IDOR protection
	}
	if time.Since(comment.CreatedAt) > 15*time.Minute {
		return nil, ErrEditWindowExpired
	}

	if err := s.store.UpdateCommentBody(ctx, commentID, newBody); err != nil {
		return nil, err
	}
	now := time.Now()
	comment.Body = newBody
	comment.EditedAt = &now
	return comment, nil
}

// SoftDeleteComment marks a comment as deleted (FR-CM5).
func (s *Service) SoftDeleteComment(ctx context.Context, commentID, userID string, isAdmin bool) error {
	comment, err := s.store.GetComment(ctx, commentID)
	if err != nil {
		return ErrCommentNotFound
	}
	if !isAdmin && comment.UserID != userID {
		return ErrPermissionDenied
	}

	if err := s.store.SetCommentStatus(ctx, commentID, StatusDeleted); err != nil {
		return err
	}
	return s.store.UpdateCommentBody(ctx, commentID, "[This comment has been deleted]")
}

// SetCommentStatus allows Admins or Creators to hide/restore comments (FR-CM7, FR-CM8).
func (s *Service) SetCommentStatus(ctx context.Context, commentID string, status CommentStatus) error {
	return s.store.SetCommentStatus(ctx, commentID, status)
}
