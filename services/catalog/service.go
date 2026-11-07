package catalog

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"
)

// Service holds validation + business rules; persistence goes through Store.
type Service struct {
	store Store
}

// NewService creates an in-memory service (default for tests and local dev
// without DATABASE_URL).
func NewService() *Service {
	return &Service{store: NewMemoryStore()}
}

// NewServiceWithStore creates a service over any Store (e.g. PGStore).
func NewServiceWithStore(store Store) *Service {
	return &Service{store: store}
}

func generateID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return prefix + "_" + hex.EncodeToString(b)
}

func validateSplits(ownerID string, splits []CreatorSplit) ([]CreatorSplit, error) {
	if len(splits) > 0 {
		total := 0
		for _, sp := range splits {
			total += sp.Percentage
		}
		if total != 100 {
			return nil, ErrInvalidSplit
		}
		return splits, nil
	}
	return []CreatorSplit{{CreatorID: ownerID, Percentage: 100}}, nil
}

// CreateStory registers a new story with creator splits (FR-C1, FR-C3).
func (s *Service) CreateStory(ctx context.Context, ownerID string, storyType StoryType, title, synopsis string, tags []string, splits []CreatorSplit) (*Story, error) {
	return s.createStory(ctx, "", ownerID, storyType, title, synopsis, tags, splits)
}

// CreateStoryWithID registers a story with a caller-assigned ID for idempotent syncs.
func (s *Service) CreateStoryWithID(ctx context.Context, id, ownerID string, storyType StoryType, title, synopsis string, tags []string, splits []CreatorSplit) (*Story, error) {
	if id == "" {
		return nil, ErrInvalidID
	}
	return s.createStory(ctx, id, ownerID, storyType, title, synopsis, tags, splits)
}

func (s *Service) createStory(ctx context.Context, id, ownerID string, storyType StoryType, title, synopsis string, tags []string, splits []CreatorSplit) (*Story, error) {
	if title == "" {
		return nil, ErrInvalidTitle
	}
	splits, err := validateSplits(ownerID, splits)
	if err != nil {
		return nil, err
	}
	if id == "" {
		id = generateID("story")
	}
	story := &Story{
		ID: id, OwnerID: ownerID, Type: storyType, Title: title,
		Synopsis: synopsis, Tags: tags, Status: StatusPublished,
		CreatorSplits: splits, CreatedAt: time.Now(),
	}
	if err := s.store.InsertStory(ctx, story); err != nil {
		return nil, err
	}
	return story, nil
}

// GetStory retrieves a story by ID.
func (s *Service) GetStory(ctx context.Context, storyID string) (*Story, error) {
	return s.store.GetStory(ctx, storyID)
}

// CreateChapter adds a chapter to a story (FR-C2).
func (s *Service) CreateChapter(ctx context.Context, storyID string, orderIndex int, title string, priceCoins int64, pageKeys []string, novelText string, autoUnlockAt *time.Time) (*Chapter, error) {
	return s.createChapter(ctx, "", storyID, orderIndex, title, priceCoins, pageKeys, novelText, autoUnlockAt)
}

// CreateChapterWithID adds a chapter with a caller-assigned ID for idempotent syncs.
func (s *Service) CreateChapterWithID(ctx context.Context, id, storyID string, orderIndex int, title string, priceCoins int64, pageKeys []string, novelText string, autoUnlockAt *time.Time) (*Chapter, error) {
	if id == "" {
		return nil, ErrInvalidID
	}
	return s.createChapter(ctx, id, storyID, orderIndex, title, priceCoins, pageKeys, novelText, autoUnlockAt)
}

func (s *Service) createChapter(ctx context.Context, id, storyID string, orderIndex int, title string, priceCoins int64, pageKeys []string, novelText string, autoUnlockAt *time.Time) (*Chapter, error) {
	if title == "" {
		return nil, ErrInvalidTitle
	}
	if priceCoins < 0 {
		return nil, ErrInvalidPrice
	}
	if id == "" {
		id = generateID("chap")
	}
	chap := &Chapter{
		ID: id, StoryID: storyID, OrderIndex: orderIndex, Title: title,
		PriceCoins: priceCoins, PageKeys: pageKeys, NovelText: novelText,
		Status: StatusPublished, AutoUnlockAt: autoUnlockAt, CreatedAt: time.Now(),
	}
	if err := s.store.InsertChapter(ctx, chap); err != nil {
		return nil, err
	}
	return chap, nil
}

// GetChapter retrieves a chapter by ID.
func (s *Service) GetChapter(ctx context.Context, chapterID string) (*Chapter, error) {
	return s.store.GetChapter(ctx, chapterID)
}

// UpdateChapter refreshes the editable metadata used by the web sync.
func (s *Service) UpdateChapter(ctx context.Context, chapterID, title string, priceCoins int64) (*Chapter, error) {
	if title == "" {
		return nil, ErrInvalidTitle
	}
	if priceCoins < 0 {
		return nil, ErrInvalidPrice
	}
	return s.store.UpdateChapter(ctx, chapterID, title, priceCoins)
}

// SetChapterStatus updates status (e.g. StatusTakenDown on moderation takedown FR-D1, FR-D2).
func (s *Service) SetChapterStatus(ctx context.Context, chapterID string, status ContentStatus) error {
	return s.store.SetChapterStatus(ctx, chapterID, status)
}
