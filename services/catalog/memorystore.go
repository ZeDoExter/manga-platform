package catalog

import (
	"context"
	"sync"
)

// MemoryStore is the in-memory Store: fast, hermetic, used by unit tests
// and local dev without DATABASE_URL.
type MemoryStore struct {
	mu            sync.RWMutex
	stories       map[string]*Story
	chapters      map[string]*Chapter
	storyChapters map[string][]string
}

// NewMemoryStore creates an empty in-memory store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		stories:       make(map[string]*Story),
		chapters:      make(map[string]*Chapter),
		storyChapters: make(map[string][]string),
	}
}

func copyStory(s *Story) *Story {
	c := *s
	c.Tags = append([]string(nil), s.Tags...)
	c.CreatorSplits = append([]CreatorSplit(nil), s.CreatorSplits...)
	return &c
}

func copyChapter(c *Chapter) *Chapter {
	d := *c
	d.PageKeys = append([]string(nil), c.PageKeys...)
	return &d
}

func (m *MemoryStore) InsertStory(_ context.Context, s *Story) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, exists := m.stories[s.ID]; exists {
		return ErrStoryExists
	}
	m.stories[s.ID] = copyStory(s)
	return nil
}

func (m *MemoryStore) GetStory(_ context.Context, storyID string) (*Story, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s, exists := m.stories[storyID]
	if !exists {
		return nil, ErrStoryNotFound
	}
	return copyStory(s), nil
}

func (m *MemoryStore) InsertChapter(_ context.Context, c *Chapter) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, exists := m.stories[c.StoryID]; !exists {
		return ErrStoryNotFound
	}
	if _, exists := m.chapters[c.ID]; exists {
		return ErrChapterExists
	}
	m.chapters[c.ID] = copyChapter(c)
	m.storyChapters[c.StoryID] = append(m.storyChapters[c.StoryID], c.ID)
	return nil
}

func (m *MemoryStore) GetChapter(_ context.Context, chapterID string) (*Chapter, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	c, exists := m.chapters[chapterID]
	if !exists {
		return nil, ErrChapterNotFound
	}
	return copyChapter(c), nil
}

func (m *MemoryStore) UpdateChapter(_ context.Context, chapterID, title string, priceCoins int64) (*Chapter, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	c, exists := m.chapters[chapterID]
	if !exists {
		return nil, ErrChapterNotFound
	}
	c.Title = title
	c.PriceCoins = priceCoins
	return copyChapter(c), nil
}

func (m *MemoryStore) SetChapterStatus(_ context.Context, chapterID string, status ContentStatus) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	c, exists := m.chapters[chapterID]
	if !exists {
		return ErrChapterNotFound
	}
	c.Status = status
	return nil
}
