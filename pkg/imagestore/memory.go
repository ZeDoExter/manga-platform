package imagestore

import (
	"bytes"
	"context"
	"io"
	"sync"
	"time"
)

type memoryObject struct {
	data        []byte
	contentType string
}

// MemoryStore implements ImageStore in memory for testing and local dev.
type MemoryStore struct {
	mu      sync.RWMutex
	objects map[string]memoryObject
	baseURL string
	secret  []byte
}

func NewMemoryStore(baseURL string, secret []byte) *MemoryStore {
	return &MemoryStore{
		objects: make(map[string]memoryObject),
		baseURL: baseURL,
		secret:  secret,
	}
}

func (m *MemoryStore) Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error {
	cleaned, err := CleanKey(key)
	if err != nil {
		return err
	}
	data, err := io.ReadAll(r)
	if err != nil {
		return err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.objects[cleaned] = memoryObject{
		data:        data,
		contentType: contentType,
	}
	return nil
}

func (m *MemoryStore) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	cleaned, err := CleanKey(key)
	if err != nil {
		return nil, err
	}
	m.mu.RLock()
	defer m.mu.RUnlock()
	obj, exists := m.objects[cleaned]
	if !exists {
		return nil, ErrNotFound
	}
	return io.NopCloser(bytes.NewReader(obj.data)), nil
}

func (m *MemoryStore) Delete(ctx context.Context, key string) error {
	cleaned, err := CleanKey(key)
	if err != nil {
		return err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.objects, cleaned)
	return nil
}

func (m *MemoryStore) ListPrefix(_ context.Context, prefix string) ([]string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []string{}
	for k := range m.objects {
		if len(k) >= len(prefix) && k[:len(prefix)] == prefix {
			out = append(out, k)
		}
	}
	return out, nil
}

func (m *MemoryStore) SignURL(ctx context.Context, key string, expires time.Duration) (string, error) {
	return BuildSignedURL(m.baseURL, key, expires, m.secret)
}
