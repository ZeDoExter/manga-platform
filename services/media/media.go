package media

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"strings"

	"manga-platform/pkg/imagestore"
)

var (
	ErrTooLarge       = errors.New("image exceeds 10MB")
	ErrTooManyPixels  = errors.New("image exceeds 40 megapixels")
	ErrTooTall        = errors.New("image taller than 16000px (webtoon strips must be split client-side)")
	ErrUnsupportedFmt = errors.New("unsupported image format (need JPEG or PNG)")
	ErrInvalidKey     = errors.New("invalid image key")
	ErrNotAZip        = errors.New("not a zip archive")
	ErrZipTooLarge    = errors.New("zip exceeds 100MB or 1GB unpacked")
	ErrZipTooMany     = errors.New("zip exceeds 100 images")
)

const (
	MaxUploadBytes = 10 << 20
	MaxPixels      = 40_000_000
	MaxWidth       = 1600
	MaxHeight      = 16000
	WebPQuality    = 80
	MaxZipBytes    = 100 << 20
	MaxZipUnpacked = 1000 << 20
	MaxZipFiles    = 100
)

// Service resizes uploads to WebP and stores them under content-hash keys.
// Re-encoding also strips EXIF (GPS, camera) and foreign payloads.
type Service struct {
	store imagestore.ImageStore
	sem   chan struct{} // bounds concurrent decodes (each can hold ~160MB)
}

// NewService creates a media service over any ImageStore.
func NewService(store imagestore.ImageStore, maxConcurrent int) *Service {
	if maxConcurrent < 1 {
		maxConcurrent = 4
	}
	return &Service{store: store, sem: make(chan struct{}, maxConcurrent)}
}

// UploadResult describes a stored image.
type UploadResult struct {
	Key         string `json:"key"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	SizeBytes   int64  `json:"size_bytes"`
	ContentType string `json:"content_type"`
	Animated    bool   `json:"animated_dropped"` // true if a GIF lost its animation
}

// Upload decodes, validates, resizes, re-encodes to WebP, and stores the image.
// Keys are content-addressed: tmp/{sha256}.webp for staging, stories/... after confirm.
func (s *Service) Upload(ctx context.Context, r io.Reader, storyID, chapterID string) (*UploadResult, error) {
	select {
	case s.sem <- struct{}{}:
		defer func() { <-s.sem }()
	case <-ctx.Done():
		return nil, ctx.Err()
	}

	limited := io.LimitReader(r, MaxUploadBytes+1)
	raw, err := io.ReadAll(limited)
	if err != nil {
		return nil, err
	}
	if len(raw) > MaxUploadBytes {
		return nil, ErrTooLarge
	}

	out, w, h, animated, err := processOne(raw)
	if err != nil {
		return nil, err
	}

	sum := sha256.Sum256(out)
	hash := hex.EncodeToString(sum[:])
	var key string
	if storyID != "" && chapterID != "" {
		key = fmt.Sprintf("stories/%s/%s/%s.webp", storyID, chapterID, hash)
	} else {
		key = fmt.Sprintf("tmp/%s.webp", hash)
	}

	if err := s.store.Put(ctx, key, bytes.NewReader(out), int64(len(out)), "image/webp"); err != nil {
		return nil, err
	}
	return &UploadResult{
		Key: key, Width: w, Height: h,
		SizeBytes: int64(len(out)), ContentType: "image/webp", Animated: animated,
	}, nil
}

// Confirm moves a tmp/ upload into its final stories/ path (no-op if already there).
func (s *Service) Confirm(ctx context.Context, tmpKey, storyID, chapterID string) (string, error) {
	if !strings.HasPrefix(tmpKey, "tmp/") || strings.Contains(tmpKey, "..") {
		return "", ErrInvalidKey
	}
	if storyID == "" || chapterID == "" {
		return "", ErrInvalidKey
	}
	rc, err := s.store.Get(ctx, tmpKey)
	if err != nil {
		return "", err
	}
	defer rc.Close()
	raw, err := io.ReadAll(io.LimitReader(rc, MaxUploadBytes+1))
	if err != nil {
		return "", err
	}
	name := strings.TrimPrefix(tmpKey, "tmp/")
	final := fmt.Sprintf("stories/%s/%s/%s", storyID, chapterID, name)
	if err := s.store.Put(ctx, final, bytes.NewReader(raw), int64(len(raw)), "image/webp"); err != nil {
		return "", err
	}
	_ = s.store.Delete(ctx, tmpKey) // staging cleanup; lifecycle rule is the backstop
	return final, nil
}

// DeleteChapter removes every image under stories/{storyID}/{chapterID}/ (takedown).
func (s *Service) DeleteChapter(ctx context.Context, storyID, chapterID string) error {
	if storyID == "" || chapterID == "" {
		return ErrInvalidKey
	}
	prefix := fmt.Sprintf("stories/%s/%s/", storyID, chapterID)
	lister, ok := s.store.(imagestore.PrefixLister)
	if !ok {
		return fmt.Errorf("store does not support prefix delete")
	}
	keys, err := lister.ListPrefix(ctx, prefix)
	if err != nil {
		return err
	}
	for _, k := range keys {
		if err := s.store.Delete(ctx, k); err != nil && !errors.Is(err, imagestore.ErrNotFound) {
			return err
		}
	}
	return nil
}
