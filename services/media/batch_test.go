package media_test

import (
	"archive/zip"
	"bytes"
	"context"
	"testing"

	"manga-platform/pkg/imagestore"
	"manga-platform/services/media"
)

func testZip(t *testing.T, names []string) []byte {
	t.Helper()
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	for _, n := range names {
		fw, err := w.Create(n)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := fw.Write(testPNG(t, 100, 100)); err != nil {
			t.Fatal(err)
		}
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestBatch_NaturalOrderAndFlat(t *testing.T) {
	ctx := context.Background()
	svc := media.NewService(imagestore.NewMemoryStore("http://cdn.test", []byte("s")), 2)

	raw := testZip(t, []string{"10.png", "2.png", "1.png", "sub/99.png", "note.txt", "__MACOSX/x.png"})
	res, err := svc.UploadBatch(ctx, bytes.NewReader(raw), "ch1.zip", "story-1", "chap-1")
	if err != nil {
		t.Fatalf("UploadBatch: %v", err)
	}
	if len(res) != 3 {
		t.Fatalf("expected 3 pages (subdir + txt + macosx skipped), got %d", len(res))
	}
	if res[0].Name != "1.png" || res[1].Name != "2.png" || res[2].Name != "10.png" {
		t.Fatalf("wrong natural order: %s %s %s", res[0].Name, res[1].Name, res[2].Name)
	}
	for i, r := range res {
		if r.Error != "" || r.Result == nil {
			t.Fatalf("page %d failed: %s", i+1, r.Error)
		}
		if r.Index != i+1 {
			t.Fatalf("wrong index: %+v", r)
		}
	}
}

func TestBatch_RejectsNonArchive(t *testing.T) {
	ctx := context.Background()
	svc := media.NewService(imagestore.NewMemoryStore("http://cdn.test", []byte("s")), 2)
	if _, err := svc.UploadBatch(ctx, bytes.NewReader([]byte("not a zip at all................")), "x.zip", "", ""); err == nil {
		t.Fatal("expected error for fake zip")
	}
	// Zip with no images.
	raw := testZip(t, []string{})
	_ = raw
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	fw, _ := w.Create("readme.txt")
	_, _ = fw.Write([]byte("hi"))
	_ = w.Close()
	if _, err := svc.UploadBatch(ctx, bytes.NewReader(buf.Bytes()), "empty.zip", "", ""); err == nil {
		t.Fatal("expected error for image-less zip")
	}
}

func TestBatch_TraversalEntrySkipped(t *testing.T) {
	ctx := context.Background()
	svc := media.NewService(imagestore.NewMemoryStore("http://cdn.test", []byte("s")), 2)
	raw := testZip(t, []string{"../evil.png", "1.png"})
	res, err := svc.UploadBatch(ctx, bytes.NewReader(raw), "evil.zip", "", "")
	if err != nil {
		t.Fatalf("UploadBatch: %v", err)
	}
	if len(res) != 1 || res[0].Name != "1.png" {
		t.Fatalf("traversal not contained: %+v", res)
	}
}
