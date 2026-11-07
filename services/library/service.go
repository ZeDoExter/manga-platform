package library

import (
	"context"
	"time"
)

// Service holds validation + business rules; persistence goes through Store.
type Service struct {
	store Store
}

// NewService creates an in-memory service (tests, local dev without DATABASE_URL).
func NewService() *Service {
	return &Service{store: NewMemoryStore()}
}

// NewServiceWithStore creates a service over any Store (e.g. PGStore).
func NewServiceWithStore(store Store) *Service {
	return &Service{store: store}
}

func validateProgress(p *Progress) error {
	if p.UserID == "" || p.StoryID == "" || p.ChapterID == "" {
		return ErrInvalidID
	}
	if p.Position < 0 {
		return ErrInvalidPosition
	}
	if p.ContentType != ContentManga && p.ContentType != ContentNovel {
		return ErrInvalidType
	}
	return nil
}

// SaveProgress upserts the reading position for (user, story) (FR-L1).
// Idempotent: same payload twice yields the same row.
func (s *Service) SaveProgress(ctx context.Context, userID, storyID, chapterID string, contentType ContentType, position int64) (*Progress, error) {
	p := &Progress{
		UserID: userID, StoryID: storyID, ChapterID: chapterID,
		ContentType: contentType, Position: position, UpdatedAt: time.Now(),
	}
	if err := validateProgress(p); err != nil {
		return nil, err
	}
	if err := s.store.UpsertProgress(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

// GetProgress returns the saved position, or nil if never read.
func (s *Service) GetProgress(ctx context.Context, userID, storyID string) (*Progress, error) {
	if userID == "" || storyID == "" {
		return nil, ErrInvalidID
	}
	return s.store.GetProgress(ctx, userID, storyID)
}

// ContinueReading returns the most recent progress rows for the home row (FR-L3).
func (s *Service) ContinueReading(ctx context.Context, userID string, limit int) ([]*Progress, error) {
	if userID == "" {
		return nil, ErrInvalidID
	}
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	return s.store.ListRecent(ctx, userID, limit)
}

// Follow adds a story follow (FR-L2). Idempotent.
func (s *Service) Follow(ctx context.Context, userID, storyID string) error {
	if userID == "" || storyID == "" {
		return ErrInvalidID
	}
	return s.store.PutFollow(ctx, userID, storyID, time.Now())
}

// Unfollow removes a follow. Idempotent.
func (s *Service) Unfollow(ctx context.Context, userID, storyID string) error {
	if userID == "" || storyID == "" {
		return ErrInvalidID
	}
	return s.store.DeleteFollow(ctx, userID, storyID)
}

// ListFollows returns followed stories.
func (s *Service) ListFollows(ctx context.Context, userID string) ([]*Follow, error) {
	if userID == "" {
		return nil, ErrInvalidID
	}
	return s.store.ListFollows(ctx, userID)
}

// AddBookmark adds a chapter bookmark (FR-L2). Idempotent.
func (s *Service) AddBookmark(ctx context.Context, userID, chapterID, storyID string) error {
	if userID == "" || chapterID == "" {
		return ErrInvalidID
	}
	return s.store.PutBookmark(ctx, userID, chapterID, storyID, time.Now())
}

// RemoveBookmark removes a bookmark. Idempotent.
func (s *Service) RemoveBookmark(ctx context.Context, userID, chapterID string) error {
	if userID == "" || chapterID == "" {
		return ErrInvalidID
	}
	return s.store.DeleteBookmark(ctx, userID, chapterID)
}

// ListBookmarks returns bookmarked chapters.
func (s *Service) ListBookmarks(ctx context.Context, userID string) ([]*Bookmark, error) {
	if userID == "" {
		return nil, ErrInvalidID
	}
	return s.store.ListBookmarks(ctx, userID)
}

// MergeGuestProgress folds guest progress into the account (FR-L4).
// Last-write-wins per story; idempotent; validated before any write.
func (s *Service) MergeGuestProgress(ctx context.Context, userID string, items []*Progress) error {
	if userID == "" {
		return ErrInvalidID
	}
	if len(items) > MaxMergeItems {
		return ErrPayloadTooLarge
	}
	for _, p := range items {
		cp := *p
		cp.UserID = userID
		if err := validateProgress(&cp); err != nil {
			return err
		}
	}
	return s.store.MergeProgress(ctx, userID, items)
}
