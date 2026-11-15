package imagestore

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// LocalStore implements ImageStore on the local filesystem.
type LocalStore struct {
	baseDir string
	baseURL string
	secret  []byte
}

func NewLocalStore(baseDir, baseURL string, secret []byte) (*LocalStore, error) {
	absBase, err := filepath.Abs(baseDir)
	if err != nil {
		return nil, fmt.Errorf("invalid base dir: %w", err)
	}
	if err := os.MkdirAll(absBase, 0750); err != nil {
		return nil, fmt.Errorf("failed to create base directory: %w", err)
	}
	return &LocalStore{
		baseDir: absBase,
		baseURL: baseURL,
		secret:  secret,
	}, nil
}

func (s *LocalStore) resolvePath(key string) (string, error) {
	cleaned, err := CleanKey(key)
	if err != nil {
		return "", err
	}
	target := filepath.Join(s.baseDir, filepath.FromSlash(cleaned))
	rel, err := filepath.Rel(s.baseDir, target)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", ErrInvalidKey
	}
	return target, nil
}

func (s *LocalStore) Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error {
	target, err := s.resolvePath(key)
	if err != nil {
		return err
	}

	dir := filepath.Dir(target)
	if err := os.MkdirAll(dir, 0750); err != nil {
		return fmt.Errorf("failed to create target directory: %w", err)
	}

	// #nosec G304 -- target validated by resolvePath (CleanKey + ".." containment).
	f, err := os.Create(target)
	if err != nil {
		return fmt.Errorf("failed to create target file: %w", err)
	}
	defer f.Close()

	if _, err := io.Copy(f, r); err != nil {
		return fmt.Errorf("failed to write content: %w", err)
	}
	return nil
}

func (s *LocalStore) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	target, err := s.resolvePath(key)
	if err != nil {
		return nil, err
	}

	f, err := os.Open(target)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return f, nil
}

func (s *LocalStore) Delete(ctx context.Context, key string) error {
	target, err := s.resolvePath(key)
	if err != nil {
		return err
	}
	err = os.Remove(target)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func (s *LocalStore) ListPrefix(_ context.Context, prefix string) ([]string, error) {
	cleaned, err := CleanKey(prefix)
	if err != nil {
		return nil, err
	}
	dir := filepath.Join(s.baseDir, filepath.FromSlash(cleaned))
	entries, err := os.ReadDir(dir)
	if errors.Is(err, os.ErrNotExist) {
		return []string{}, nil
	}
	if err != nil {
		return nil, err
	}
	out := []string{}
	for _, e := range entries {
		if !e.IsDir() {
			out = append(out, cleaned+"/"+e.Name())
		}
	}
	return out, nil
}

func (s *LocalStore) SignURL(ctx context.Context, key string, expires time.Duration) (string, error) {
	return BuildSignedURL(s.baseURL, key, expires, s.secret)
}
