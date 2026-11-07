package library

import (
	"context"
	"sort"
	"sync"
	"time"
)

// MemoryStore is the in-memory Store for tests and dev without DATABASE_URL.
type MemoryStore struct {
	mu        sync.RWMutex
	progress  map[string]*Progress // user_id + "\x00" + story_id
	follows   map[string]*Follow
	bookmarks map[string]*Bookmark
}

// NewMemoryStore creates an empty in-memory store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		progress:  make(map[string]*Progress),
		follows:   make(map[string]*Follow),
		bookmarks: make(map[string]*Bookmark),
	}
}

func progKey(userID, storyID string) string  { return userID + "\x00" + storyID }
func follKey(userID, storyID string) string  { return userID + "\x00" + storyID }
func bookKey(userID, chapID string) string    { return userID + "\x00" + chapID }

func (m *MemoryStore) UpsertProgress(_ context.Context, p *Progress) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	c := *p
	m.progress[progKey(p.UserID, p.StoryID)] = &c
	return nil
}

func (m *MemoryStore) GetProgress(_ context.Context, userID, storyID string) (*Progress, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	p, ok := m.progress[progKey(userID, storyID)]
	if !ok {
		return nil, nil
	}
	c := *p
	return &c, nil
}

func (m *MemoryStore) ListRecent(_ context.Context, userID string, limit int) ([]*Progress, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []*Progress{}
	for _, p := range m.progress {
		if p.UserID == userID {
			c := *p
			out = append(out, &c)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].UpdatedAt.After(out[j].UpdatedAt) })
	if len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *MemoryStore) MergeProgress(_ context.Context, userID string, items []*Progress) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, p := range items {
		k := progKey(userID, p.StoryID)
		if cur, ok := m.progress[k]; ok && !p.UpdatedAt.After(cur.UpdatedAt) {
			continue // last-write-wins
		}
		c := *p
		c.UserID = userID
		m.progress[k] = &c
	}
	return nil
}

func (m *MemoryStore) PutFollow(_ context.Context, userID, storyID string, at time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.follows[follKey(userID, storyID)] = &Follow{UserID: userID, StoryID: storyID, CreatedAt: at}
	return nil
}

func (m *MemoryStore) DeleteFollow(_ context.Context, userID, storyID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.follows, follKey(userID, storyID))
	return nil
}

func (m *MemoryStore) ListFollows(_ context.Context, userID string) ([]*Follow, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []*Follow{}
	for _, f := range m.follows {
		if f.UserID == userID {
			c := *f
			out = append(out, &c)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

func (m *MemoryStore) PutBookmark(_ context.Context, userID, chapterID, storyID string, at time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.bookmarks[bookKey(userID, chapterID)] = &Bookmark{UserID: userID, ChapterID: chapterID, StoryID: storyID, CreatedAt: at}
	return nil
}

func (m *MemoryStore) DeleteBookmark(_ context.Context, userID, chapterID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.bookmarks, bookKey(userID, chapterID))
	return nil
}

func (m *MemoryStore) ListBookmarks(_ context.Context, userID string) ([]*Bookmark, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []*Bookmark{}
	for _, b := range m.bookmarks {
		if b.UserID == userID {
			c := *b
			out = append(out, &c)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}
