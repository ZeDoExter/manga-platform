package imagestore

import (
	"context"
	"errors"
	"io"
	"time"
)

// R2Config holds connection settings for Cloudflare R2 (ADR-001).
type R2Config struct {
	AccountID       string
	AccessKeyID     string
	SecretAccessKey string
	BucketName      string
	CustomDomain    string // e.g. "https://img.yourmanga.com"
	TokenSecret     []byte // HMAC secret validated at Cloudflare edge worker/WAF
}

// R2Store implements ImageStore for Cloudflare R2.
// Per ADR-001, reads are served via Cloudflare edge using HMAC-signed expiring tokens,
// while writes/deletes go to R2 via S3-compatible API.
type R2Store struct {
	cfg R2Config
}

// NewR2Store creates an R2Store instance.
func NewR2Store(cfg R2Config) (*R2Store, error) {
	if cfg.CustomDomain == "" {
		return nil, errors.New("custom domain is required for R2 store")
	}
	return &R2Store{cfg: cfg}, nil
}

// SignURL satisfies ImageStore and FR-R4 using edge HMAC tokens.
func (r *R2Store) SignURL(ctx context.Context, key string, expires time.Duration) (string, error) {
	return BuildSignedURL(r.cfg.CustomDomain, key, expires, r.cfg.TokenSecret)
}

// Put uploads an object to R2.
// ponytail: S3 API client wire-up deferred until live cloud deployment; local and tests use MemoryStore/LocalStore.
func (r *R2Store) Put(ctx context.Context, key string, reader io.Reader, size int64, contentType string) error {
	if r.cfg.AccountID == "" || r.cfg.AccessKeyID == "" {
		return errors.New("r2 credentials not configured for Put; use LocalStore or MemoryStore in local dev")
	}
	return errors.New("r2 S3 Put not yet wired with cloud credentials")
}

// Get fetches an object directly. Note that readers should fetch via SignURL/CDN (NFR-Scale-2).
func (r *R2Store) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	return nil, errors.New("direct Get on R2 disallowed: use CDN signed URL per NFR-Scale-2")
}

// Delete removes an object from R2.
func (r *R2Store) Delete(ctx context.Context, key string) error {
	if r.cfg.AccountID == "" {
		return errors.New("r2 credentials not configured for Delete")
	}
	return errors.New("r2 S3 Delete not yet wired with cloud credentials")
}
