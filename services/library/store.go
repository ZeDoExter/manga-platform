package library

import (
	"context"
	"time"
)

// ProgressRepository persists reading progress. PG implementation today;
// a cache layer can wrap it later behind this same interface.
type ProgressRepository interface {
	UpsertProgress(ctx context.Context, p *Progress) error
	GetProgress(ctx context.Context, userID, storyID string) (*Progress, error)
	ListRecent(ctx context.Context, userID string, limit int) ([]*Progress, error)
	MergeProgress(ctx context.Context, userID string, items []*Progress) error
}

// FollowRepository persists story follows (idempotent put/delete).
type FollowRepository interface {
	PutFollow(ctx context.Context, userID, storyID string, at time.Time) error
	DeleteFollow(ctx context.Context, userID, storyID string) error
	ListFollows(ctx context.Context, userID string) ([]*Follow, error)
}

// BookmarkRepository persists chapter bookmarks (idempotent put/delete).
type BookmarkRepository interface {
	PutBookmark(ctx context.Context, userID, chapterID, storyID string, at time.Time) error
	DeleteBookmark(ctx context.Context, userID, chapterID string) error
	ListBookmarks(ctx context.Context, userID string) ([]*Bookmark, error)
}

// Store bundles the three repositories. MemoryStore and PGStore implement it.
type Store interface {
	ProgressRepository
	FollowRepository
	BookmarkRepository
}
