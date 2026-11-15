package library

import (
	"errors"
	"time"
)

var (
	ErrInvalidID       = errors.New("id cannot be empty")
	ErrInvalidPosition = errors.New("position cannot be negative")
	ErrInvalidType     = errors.New("content type must be manga or novel")
	ErrPayloadTooLarge = errors.New("merge payload too large")
	ErrInvalidChapter  = errors.New("chapter must be a positive number")
	ErrInvalidRange    = errors.New("range must be today, week or all")
	ErrInvalidAnonID   = errors.New("anon id must be 8-64 chars of letters, digits, - or _")
)

// Range selects the trending window.
type Range string
const (
	RangeToday Range = "today"
	RangeWeek  Range = "week"
	RangeAll   Range = "all"
)

const MaxMergeItems = 200

type ContentType string

const (
	ContentManga ContentType = "manga"
	ContentNovel ContentType = "novel"
)

// Progress is one row per (user, story): the latest reading position.
type Progress struct {
	UserID      string      `json:"user_id"`
	StoryID     string      `json:"story_id"`
	ChapterID   string      `json:"chapter_id"`
	ContentType ContentType `json:"content_type"`
	Position    int64       `json:"position"` // manga: page index, novel: percent*100
	UpdatedAt   time.Time   `json:"updated_at"`
}

// Follow marks a story the user follows (FR-L2).
type Follow struct {
	UserID    string    `json:"user_id"`
	StoryID   string    `json:"story_id"`
	CreatedAt time.Time `json:"created_at"`
}

// Bookmark marks a chapter the user bookmarked (FR-L2).
type Bookmark struct {
	UserID    string    `json:"user_id"`
	ChapterID string    `json:"chapter_id"`
	StoryID   string    `json:"story_id"`
	CreatedAt time.Time `json:"created_at"`
}

// ReadEvent is one counted chapter-open per (reader, story, chapter, day).
type ReadEvent struct {
	ReaderID  string    `json:"reader_id"`
	StoryID   string    `json:"story_id"`
	Chapter   int       `json:"chapter"`
	Day       string    `json:"day"` // YYYY-MM-DD (UTC)
	CreatedAt time.Time `json:"created_at"`
}

// StoryReads is an aggregate read count for trending.
type StoryReads struct {
	StoryID string `json:"story_id"`
	Reads   int    `json:"reads"`
}
