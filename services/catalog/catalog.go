package catalog

import (
	"errors"
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

// NOTE: Service (business logic) lives in service.go, stores in
// memorystore.go (in-memory) and pgstore.go (PostgreSQL).
