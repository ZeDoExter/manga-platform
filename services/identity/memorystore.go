package identity

import (
	"context"
	"sync"
)

// MemoryStore is the in-memory Store: fast, hermetic, used by unit tests
// and local dev without DATABASE_URL.
type MemoryStore struct {
	mu       sync.RWMutex
	users    map[string]*User
	byEmail  map[string]*User
	sessions map[string]*Session
}

// NewMemoryStore creates an empty in-memory store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		users:    make(map[string]*User),
		byEmail:  make(map[string]*User),
		sessions: make(map[string]*Session),
	}
}

func copyUser(u *User) *User {
	c := *u
	return &c
}

func copySession(s *Session) *Session {
	c := *s
	return &c
}

func (m *MemoryStore) InsertUser(_ context.Context, u *User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, exists := m.byEmail[u.Email]; exists {
		return ErrUserExists
	}
	if _, exists := m.users[u.ID]; exists {
		return ErrUserExists
	}
	m.users[u.ID] = copyUser(u)
	m.byEmail[u.Email] = m.users[u.ID]
	return nil
}

func (m *MemoryStore) GetUser(_ context.Context, userID string) (*User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	u, exists := m.users[userID]
	if !exists {
		return nil, ErrUserNotFound
	}
	return copyUser(u), nil
}

func (m *MemoryStore) GetUserByEmail(_ context.Context, normEmail string) (*User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	u, exists := m.byEmail[normEmail]
	if !exists {
		return nil, ErrUserNotFound
	}
	return copyUser(u), nil
}

func (m *MemoryStore) SetBanStatus(_ context.Context, userID string, banned bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	u, exists := m.users[userID]
	if !exists {
		return ErrUserNotFound
	}
	u.Banned = banned
	return nil
}

func (m *MemoryStore) InsertSession(_ context.Context, s *Session) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sessions[s.Token] = copySession(s)
	return nil
}

func (m *MemoryStore) GetSession(_ context.Context, token string) (*Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s, exists := m.sessions[token]
	if !exists {
		return nil, ErrUnauthorized
	}
	return copySession(s), nil
}

func (m *MemoryStore) DeleteSession(_ context.Context, token string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, token)
	return nil
}
