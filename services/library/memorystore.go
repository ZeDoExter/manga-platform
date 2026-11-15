package library

import (
	"context"
	"sort"
	"strconv"
	"sync"
	"time"
)

// MemoryStore is the in-memory Store for tests and dev without DATABASE_URL.
type MemoryStore struct {
	mu        sync.RWMutex
	progress  map[string]*Progress // user_id + "\x00" + story_id
	follows   map[string]*Follow
	bookmarks map[string]*Bookmark
	reads     map[string]*ReadEvent // reader + "\x00" + story + "\x00" + chapter + "\x00" + day
}

// NewMemoryStore creates an empty in-memory store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		progress:  make(map[string]*Progress),
		follows:   make(map[string]*Follow),
		bookmarks: make(map[string]*Bookmark),
		reads:     make(map[string]*ReadEvent),
	}
}

func progKey(userID, storyID string) string  { return userID + "\x00" + storyID }
func follKey(userID, storyID string) string  { return userID + "\x00" + storyID }
func bookKey(userID, chapID string) string    { return userID + "\x00" + chapID }
func readKey(reader, story string, chapter int, day string) string {
	return reader + "\x00" + story + "\x00" + strconv.Itoa(chapter) + "\x00" + day
}

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

func (m *MemoryStore) InsertRead(_ context.Context, e *ReadEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	k := readKey(e.ReaderID, e.StoryID, e.Chapter, e.Day)
	if _, ok := m.reads[k]; ok {
		return nil // same reader/story/chapter/day counts once
	}
	c := *e
	m.reads[k] = &c
	return nil
}

func (m *MemoryStore) TrendingReads(_ context.Context, rng Range, limit int) ([]*StoryReads, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	today := time.Now().UTC().Format("2006-01-02")
	weekStart := time.Now().UTC().AddDate(0, 0, -6).Format("2006-01-02")
	counts := make(map[string]int)
	for _, e := range m.reads {
		switch rng {
		case RangeToday:
			if e.Day != today {
				continue
			}
		case RangeWeek:
			if e.Day < weekStart {
				continue
			}
		case RangeAll:
		default:
			return nil, ErrInvalidRange
		}
		counts[e.StoryID]++
	}
	out := make([]*StoryReads, 0, len(counts))
	for id, n := range counts {
		out = append(out, &StoryReads{StoryID: id, Reads: n})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Reads != out[j].Reads {
			return out[i].Reads > out[j].Reads
		}
		return out[i].StoryID < out[j].StoryID
	})
	if len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}
