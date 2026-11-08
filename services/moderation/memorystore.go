package moderation

import (
	"context"
	"sync"
)

// MemoryStore is the in-memory Store: fast, hermetic, used by unit tests
// and local dev without DATABASE_URL.
type MemoryStore struct {
	mu        sync.RWMutex
	auditLogs []*AuditLog
}

// NewMemoryStore creates an empty in-memory store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{auditLogs: make([]*AuditLog, 0)}
}

func (m *MemoryStore) InsertAuditLog(_ context.Context, l *AuditLog) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	c := *l
	m.auditLogs = append(m.auditLogs, &c)
	return nil
}

func (m *MemoryStore) ListAuditLogs(_ context.Context) ([]*AuditLog, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*AuditLog, len(m.auditLogs))
	for i, l := range m.auditLogs {
		c := *l
		out[i] = &c
	}
	return out, nil
}
