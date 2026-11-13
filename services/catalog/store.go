package catalog

import (
	"context"
)

// Store persists stories and chapters. MemoryStore (in catalog.go) and
// PGStore (in pgstore.go) both implement it; contract tests in
// contract_test.go run the same suite against both.
type Store interface {
	InsertStory(ctx context.Context, s *Story) error
	GetStory(ctx context.Context, storyID string) (*Story, error)
	ListStories(ctx context.Context) ([]*Story, error)
	DeleteStory(ctx context.Context, storyID string) error
	InsertChapter(ctx context.Context, c *Chapter) error
	GetChapter(ctx context.Context, chapterID string) (*Chapter, error)
	ListChaptersByStory(ctx context.Context, storyID string) ([]*Chapter, error)
	UpdateChapter(ctx context.Context, chapterID, title string, priceCoins int64, pageKeys []string, novelText string) (*Chapter, error)
	SetChapterStatus(ctx context.Context, chapterID string, status ContentStatus) error
}
