package imagestore_test

import (
	"bytes"
	"context"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"manga-platform/pkg/imagestore"
)

var testSecret = []byte("test-hmac-secret-32-bytes-long!")

// TestFR_R4_SignedExpiringURL tests requirement FR-R4 (Manga pages served via expiring links).
func TestFR_R4_SignedExpiringURL(t *testing.T) {
	key := "stories/story-123/chapters/1/page-001.webp"
	exp := time.Now().Add(10 * time.Minute)

	token := imagestore.SignToken(key, exp, testSecret)
	if token == "" {
		t.Fatal("expected non-empty token")
	}

	// 1. Valid token
	if !imagestore.VerifyToken(key, token, exp, testSecret) {
		t.Fatal("expected token to be valid")
	}

	// 2. Expired token
	pastExp := time.Now().Add(-1 * time.Minute)
	pastToken := imagestore.SignToken(key, pastExp, testSecret)
	if imagestore.VerifyToken(key, pastToken, pastExp, testSecret) {
		t.Fatal("expected expired token to fail verification")
	}

	// 3. Tampered key (acceptance test for B-D3: token cannot be reused for another chapter)
	otherKey := "stories/story-123/chapters/2/page-001.webp"
	if imagestore.VerifyToken(otherKey, token, exp, testSecret) {
		t.Fatal("expected tampered key to fail verification")
	}

	// 4. URL format
	signedURL, err := imagestore.BuildSignedURL("https://img.yourmanga.com", key, 15*time.Minute, testSecret)
	if err != nil {
		t.Fatalf("BuildSignedURL failed: %v", err)
	}

	u, err := url.Parse(signedURL)
	if err != nil {
		t.Fatalf("failed to parse signed URL: %v", err)
	}

	if u.Path != "/stories/story-123/chapters/1/page-001.webp" {
		t.Errorf("unexpected path: %s", u.Path)
	}

	q := u.Query()
	if q.Get("token") == "" || q.Get("exp") == "" {
		t.Errorf("missing query params in signed URL: %s", signedURL)
	}
	parsedExp, _ := strconv.ParseInt(q.Get("exp"), 10, 64)
	if !imagestore.VerifyToken(key, q.Get("token"), time.Unix(parsedExp, 0), testSecret) {
		t.Error("token in signed URL failed verification")
	}
}

// TestNFR_Sec1_PathTraversalProtection tests path traversal rejection (OWASP / NFR-Sec-1).
func TestNFR_Sec1_PathTraversalProtection(t *testing.T) {
	badKeys := []string{
		"../secret.txt",
		"stories/../../etc/passwd",
		"..",
		"/",
		"  ",
	}

	for _, k := range badKeys {
		_, err := imagestore.CleanKey(k)
		if err == nil {
			t.Errorf("expected key %q to be rejected, got nil error", k)
		}
	}
}

// TestB_D5_MemoryStore tests the in-memory ImageStore implementation.
func TestB_D5_MemoryStore(t *testing.T) {
	ctx := context.Background()
	store := imagestore.NewMemoryStore("https://img.yourmanga.com", testSecret)

	key := "test/page1.webp"
	data := []byte("fake-image-bytes-12345")

	// Put
	err := store.Put(ctx, key, bytes.NewReader(data), int64(len(data)), "image/webp")
	if err != nil {
		t.Fatalf("Put failed: %v", err)
	}

	// Get
	rc, err := store.Get(ctx, key)
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	defer rc.Close()
	fetched, err := io.ReadAll(rc)
	if err != nil {
		t.Fatalf("ReadAll failed: %v", err)
	}
	if !bytes.Equal(fetched, data) {
		t.Errorf("fetched data does not match original data")
	}

	// SignURL
	signedURL, err := store.SignURL(ctx, key, 5*time.Minute)
	if err != nil {
		t.Fatalf("SignURL failed: %v", err)
	}
	if signedURL == "" {
		t.Error("expected non-empty signed URL")
	}

	// Delete
	err = store.Delete(ctx, key)
	if err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	// Get after Delete should return ErrNotFound
	_, err = store.Get(ctx, key)
	if err != imagestore.ErrNotFound {
		t.Errorf("expected ErrNotFound after delete, got %v", err)
	}
}

// TestB_D5_LocalStore tests the filesystem ImageStore implementation.
func TestB_D5_LocalStore(t *testing.T) {
	ctx := context.Background()
	tmpDir, err := os.MkdirTemp("", "imagestore-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	store, err := imagestore.NewLocalStore(tmpDir, "http://localhost:8080/images", testSecret)
	if err != nil {
		t.Fatalf("NewLocalStore failed: %v", err)
	}

	key := "stories/chapter1/page01.png"
	data := []byte("png-file-content-header-data")

	// Put
	err = store.Put(ctx, key, bytes.NewReader(data), int64(len(data)), "image/png")
	if err != nil {
		t.Fatalf("Put failed: %v", err)
	}

	// Verify file exists on disk
	filePath := filepath.Join(tmpDir, "stories", "chapter1", "page01.png")
	if _, err := os.Stat(filePath); err != nil {
		t.Fatalf("file not found on disk at %s: %v", filePath, err)
	}

	// Get
	rc, err := store.Get(ctx, key)
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	fetched, err := io.ReadAll(rc)
	_ = rc.Close()
	if err != nil {
		t.Fatalf("ReadAll failed: %v", err)
	}
	if !bytes.Equal(fetched, data) {
		t.Errorf("data mismatch")
	}

	// Path traversal attack on LocalStore
	err = store.Put(ctx, "../../escaped.txt", bytes.NewReader(data), int64(len(data)), "text/plain")
	if err == nil {
		t.Error("expected path traversal in Put to fail, got nil")
	}
	// Delete
	err = store.Delete(ctx, key)
	if err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	// Get after Delete
	_, err = store.Get(ctx, key)
	if err != imagestore.ErrNotFound {
		t.Errorf("expected ErrNotFound after delete, got %v", err)
	}
}
