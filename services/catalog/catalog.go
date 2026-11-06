package catalog

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"
)

var (
	ErrStoryNotFound   = errors.New("story not found")
	ErrChapterNotFound = errors.New("chapter not found")
	ErrStoryExists     = errors.New("story already exists")
	ErrChapterExists   = errors.New("chapter already exists")
	ErrInvalidID       = errors.New("id cannot be empty")
	ErrInvalidSplit    = errors.New("creator split must sum to 100%")
	ErrInvalidPrice    = errors.New("chapter price cannot be negative")
	ErrInvalidTitle    = errors.New("title cannot be empty")
)

type StoryType string

const (
	StoryTypeManga StoryType = "manga"
	StoryTypeNovel StoryType = "novel"
)

type ContentStatus string

const (
	StatusDraft     ContentStatus = "draft"
	StatusPublished ContentStatus = "published"
	StatusHidden    ContentStatus = "hidden"
	StatusTakenDown ContentStatus = "taken_down"
)

type CreatorSplit struct {
	CreatorID  string `json:"creator_id"`
	Percentage int    `json:"percentage"`
}

type Story struct {
	ID            string         `json:"id"`
	OwnerID       string         `json:"owner_id"`
	Type          StoryType      `json:"type"`
	Title         string         `json:"title"`
	CoverKey      string         `json:"cover_key"`
	Synopsis      string         `json:"synopsis"`
	Tags          []string       `json:"tags"`
	Status        ContentStatus  `json:"status"`
	CreatorSplits []CreatorSplit `json:"creator_splits"`
	CreatedAt     time.Time      `json:"created_at"`
}

type Chapter struct {
	ID           string        `json:"id"`
	StoryID      string        `json:"story_id"`
	OrderIndex   int           `json:"order_index"`
	Title        string        `json:"title"`
	PriceCoins   int64         `json:"price_coins"` // 0 = free chapter
	PageKeys     []string      `json:"page_keys"`   // S3/R2 object keys for manga pages
	NovelText    string        `json:"novel_text"`  // Body text for novels
	Status       ContentStatus `json:"status"`
	AutoUnlockAt *time.Time    `json:"auto_unlock_at,omitempty"`
	CreatedAt    time.Time     `json:"created_at"`
}

// IsFree checks whether this chapter can be read without purchasing.
func (c *Chapter) IsFree() bool {
	if c.PriceCoins == 0 {
		return true
	}
	if c.AutoUnlockAt != nil && time.Now().After(*c.AutoUnlockAt) {
		return true
	}
	return false
}

type Service struct {
	mu            sync.RWMutex
	stories       map[string]*Story   // key: story_id
	chapters      map[string]*Chapter // key: chapter_id
	storyChapters map[string][]string // key: story_id -> []chapter_id
}

func NewService() *Service {
	return &Service{
		stories:       make(map[string]*Story),
		chapters:      make(map[string]*Chapter),
		storyChapters: make(map[string][]string),
	}
}

func generateID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return prefix + "_" + hex.EncodeToString(b)
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

	// Validate creator split sums to 100%
	if len(splits) > 0 {
		total := 0
		for _, sp := range splits {
			total += sp.Percentage
		}
		if total != 100 {
			return nil, ErrInvalidSplit
		}
	} else {
		// Default 100% to owner
		splits = []CreatorSplit{{CreatorID: ownerID, Percentage: 100}}
	}

	if id == "" {
		id = generateID("story")
	}

	story := &Story{
		ID:            id,
		OwnerID:       ownerID,
		Type:          storyType,
		Title:         title,
		Synopsis:      synopsis,
		Tags:          tags,
		Status:        StatusPublished,
		CreatorSplits: splits,
		CreatedAt:     time.Now(),
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.stories[story.ID]; exists {
		return nil, ErrStoryExists
	}
	s.stories[story.ID] = story
	return story, nil
}

// GetStory retrieves a story by ID.
func (s *Service) GetStory(ctx context.Context, storyID string) (*Story, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	story, exists := s.stories[storyID]
	if !exists {
		return nil, ErrStoryNotFound
	}
	return story, nil
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

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.stories[storyID]; !exists {
		return nil, ErrStoryNotFound
	}

	if id == "" {
		id = generateID("chap")
	}
	if _, exists := s.chapters[id]; exists {
		return nil, ErrChapterExists
	}

	chap := &Chapter{
		ID:           id,
		StoryID:      storyID,
		OrderIndex:   orderIndex,
		Title:        title,
		PriceCoins:   priceCoins,
		PageKeys:     pageKeys,
		NovelText:    novelText,
		Status:       StatusPublished,
		AutoUnlockAt: autoUnlockAt,
		CreatedAt:    time.Now(),
	}

	s.chapters[chap.ID] = chap
	s.storyChapters[storyID] = append(s.storyChapters[storyID], chap.ID)
	return chap, nil
}

// GetChapter retrieves a chapter by ID.
func (s *Service) GetChapter(ctx context.Context, chapterID string) (*Chapter, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	chap, exists := s.chapters[chapterID]
	if !exists {
		return nil, ErrChapterNotFound
	}
	return chap, nil
}

// UpdateChapter refreshes the editable metadata used by the web sync.
func (s *Service) UpdateChapter(ctx context.Context, chapterID, title string, priceCoins int64) (*Chapter, error) {
	if title == "" {
		return nil, ErrInvalidTitle
	}
	if priceCoins < 0 {
		return nil, ErrInvalidPrice
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	chap, exists := s.chapters[chapterID]
	if !exists {
		return nil, ErrChapterNotFound
	}
	chap.Title = title
	chap.PriceCoins = priceCoins
	c := *chap
	return &c, nil
}

// SetChapterStatus updates status (e.g. StatusTakenDown on moderation takedown FR-D1, FR-D2).
func (s *Service) SetChapterStatus(ctx context.Context, chapterID string, status ContentStatus) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	chap, exists := s.chapters[chapterID]
	if !exists {
		return ErrChapterNotFound
	}
	chap.Status = status
	return nil
}
