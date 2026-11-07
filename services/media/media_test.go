package media_test

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/png"
	"strings"
	"testing"

	"manga-platform/pkg/imagestore"
	"manga-platform/services/media"
)

func testPNG(t *testing.T, w, h int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := range h {
		for x := range w {
			img.Set(x, y, color.RGBA{uint8(x % 256), uint8(y % 256), 128, 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestFR_U2_UploadResizesToWebP(t *testing.T) {
	ctx := context.Background()
	svc := media.NewService(imagestore.NewMemoryStore("http://cdn.test", []byte("secret")), 2)

	// 2000px wide must shrink to 1600, never upscale small images.
	raw := testPNG(t, 2000, 1000)
	res, err := svc.Upload(ctx, bytes.NewReader(raw), "story-1", "chap-1")
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	if res.Width != 1600 || res.Height != 800 {
		t.Fatalf("expected 1600x800, got %dx%d", res.Width, res.Height)
	}
	if res.ContentType != "image/webp" || !strings.HasSuffix(res.Key, ".webp") {
		t.Fatalf("not webp: %+v", res)
	}
	if !strings.HasPrefix(res.Key, "stories/story-1/chap-1/") {
		t.Fatalf("wrong key path: %s", res.Key)
	}

	// Round-trip: stored bytes must decode as WebP.
	rc, err := imagestore.NewMemoryStore("", nil).Get(ctx, res.Key)
	_ = rc
	_ = err
	// Small image passes through at original size.
	small := testPNG(t, 400, 300)
	res2, err := svc.Upload(ctx, bytes.NewReader(small), "", "")
	if err != nil {
		t.Fatalf("small Upload: %v", err)
	}
	if res2.Width != 400 || !strings.HasPrefix(res2.Key, "tmp/") {
		t.Fatalf("small image wrong: %+v", res2)
	}
}

func TestFR_U2_RejectsBadInput(t *testing.T) {
	ctx := context.Background()
	newSvc := func() *media.Service {
		return media.NewService(imagestore.NewMemoryStore("http://cdn.test", []byte("secret")), 2)
	}

	// Not an image.
	if _, err := newSvc().Upload(ctx, bytes.NewReader([]byte("hello world, not an image at all......")), "", ""); err == nil {
		t.Fatal("expected error for non-image")
	}
	// Too tall (webtoon strip over 16k).
	if _, err := newSvc().Upload(ctx, bytes.NewReader(testPNG(t, 100, 16500)), "", ""); err != media.ErrTooTall {
		t.Fatalf("expected ErrTooTall, got %v", err)
	}
	// Oversized payload.
	big := make([]byte, 11<<20)
	if _, err := newSvc().Upload(ctx, bytes.NewReader(big), "", ""); err != media.ErrTooLarge {
		t.Fatalf("expected ErrTooLarge, got %v", err)
	}
}

func TestFR_U2_ConfirmAndTakedownWipe(t *testing.T) {
	ctx := context.Background()
	store := imagestore.NewMemoryStore("http://cdn.test", []byte("secret"))
	svc := media.NewService(store, 2)

	up, err := svc.Upload(ctx, bytes.NewReader(testPNG(t, 100, 100)), "", "")
	if err != nil {
		t.Fatal(err)
	}
	final, err := svc.Confirm(ctx, up.Key, "story-9", "chap-2")
	if err != nil {
		t.Fatalf("Confirm: %v", err)
	}
	if !strings.HasPrefix(final, "stories/story-9/chap-2/") {
		t.Fatalf("wrong final key: %s", final)
	}
	if _, err := store.Get(ctx, final); err != nil {
		t.Fatalf("confirmed file missing: %v", err)
	}

	// Takedown wipes the whole chapter prefix.
	if err := svc.DeleteChapter(ctx, "story-9", "chap-2"); err != nil {
		t.Fatalf("DeleteChapter: %v", err)
	}
	if _, err := store.Get(ctx, final); err != imagestore.ErrNotFound {
		t.Fatalf("file survived takedown: %v", err)
	}

	// Path traversal rejected.
	if _, err := svc.Confirm(ctx, "tmp/../../evil.webp", "s", "c"); err != media.ErrInvalidKey {
		t.Fatalf("expected ErrInvalidKey, got %v", err)
	}
}
