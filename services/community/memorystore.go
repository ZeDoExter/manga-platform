package community

import (
	"context"
	"sort"
	"strings"
	"sync"
)

// MemoryStore is the in-memory Store: fast, hermetic, used by unit tests
// and local dev without DATABASE_URL.
type MemoryStore struct {
	mu           sync.RWMutex
	comments     map[string]*Comment
	blockedWords []string
}

// NewMemoryStore creates an empty in-memory store with the default blocklist.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		comments:     make(map[string]*Comment),
		blockedWords: []string{"spam", "scam", "phishing", "illegal-download"},
	}
}

func copyComment(c *Comment) *Comment {
	d := *c
	return &d
}

func (m *MemoryStore) InsertComment(_ context.Context, c *Comment) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.comments[c.ID] = copyComment(c)
	return nil
}

func (m *MemoryStore) GetComment(_ context.Context, commentID string) (*Comment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	c, exists := m.comments[commentID]
	if !exists {
		return nil, ErrCommentNotFound
	}
	return copyComment(c), nil
}

func (m *MemoryStore) ListComments(_ context.Context, scope, scopeID string, cursorNano int64, limit int) ([]*Comment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []*Comment
	for _, c := range m.comments {
		if c.Status == StatusHidden {
			continue
		}
		if scope == "chapter" && c.ChapterID != scopeID {
			continue
		}
		if scope == "story" && c.StoryID != scopeID {
			continue
		}
		if cursorNano > 0 && c.CreatedAt.UnixNano() >= cursorNano {
			continue
		}
		out = append(out, copyComment(c))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	if len(out) > limit+1 {
		out = out[:limit+1]
	}
	return out, nil
}

func (m *MemoryStore) UpdateCommentBody(_ context.Context, commentID, body string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	c, exists := m.comments[commentID]
	if !exists {
		return ErrCommentNotFound
	}
	c.Body = body
	return nil
}

func (m *MemoryStore) SetCommentStatus(_ context.Context, commentID string, status CommentStatus) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	c, exists := m.comments[commentID]
	if !exists {
		return ErrCommentNotFound
	}
	c.Status = status
	return nil
}

func (m *MemoryStore) IncrementReplyCount(_ context.Context, commentID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if c, exists := m.comments[commentID]; exists {
		c.ReplyCount++
	}
	return nil
}

func (m *MemoryStore) AddBlockedWord(_ context.Context, word string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.blockedWords = append(m.blockedWords, strings.ToLower(strings.TrimSpace(word)))
	return nil
}

func (m *MemoryStore) ListBlockedWords(_ context.Context) ([]string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return append([]string(nil), m.blockedWords...), nil
}
