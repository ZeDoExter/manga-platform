package imagestore

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/url"
	"strconv"
	"strings"
	"time"
)

var (
	ErrNotFound   = errors.New("image not found")
	ErrInvalidKey = errors.New("invalid image key")
)

// ImageStore defines the required storage interface per docs/02-architecture.md ADR-001.
// All image reads, writes, and URL signings must route through this interface.
type ImageStore interface {
	Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error
	Get(ctx context.Context, key string) (io.ReadCloser, error)
	Delete(ctx context.Context, key string) error
	// SignURL generates an expiring, signed URL for CDN / client access (FR-R4).
	SignURL(ctx context.Context, key string, expires time.Duration) (string, error)
}

// CleanKey validates and normalizes an object key to prevent path traversal.
func CleanKey(key string) (string, error) {
	cleaned := strings.Trim(key, "/ ")
	if cleaned == "" || strings.Contains(cleaned, "..") {
		return "", ErrInvalidKey
	}
	return cleaned, nil
}

// SignToken generates an HMAC-SHA256 signature for Cloudflare/CDN token auth (ADR-001).
func SignToken(key string, exp time.Time, secret []byte) string {
	mac := hmac.New(sha256.New, secret)
	payload := key + ":" + strconv.FormatInt(exp.Unix(), 10)
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}

// VerifyToken verifies whether an expiring token is valid and not expired.
func VerifyToken(key, token string, exp time.Time, secret []byte) bool {
	if time.Now().After(exp) {
		return false
	}
	expected := SignToken(key, exp, secret)
	return hmac.Equal([]byte(token), []byte(expected))
}

// BuildSignedURL creates a URL containing the key, exp timestamp, and HMAC token.
func BuildSignedURL(baseURL, key string, expires time.Duration, secret []byte) (string, error) {
	cleaned, err := CleanKey(key)
	if err != nil {
		return "", err
	}
	exp := time.Now().Add(expires)
	token := SignToken(cleaned, exp, secret)

	u, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("invalid base url: %w", err)
	}

	u.Path = strings.TrimRight(u.Path, "/") + "/" + cleaned
	q := u.Query()
	q.Set("exp", strconv.FormatInt(exp.Unix(), 10))
	q.Set("token", token)
	u.RawQuery = q.Encode()

	return u.String(), nil
}
