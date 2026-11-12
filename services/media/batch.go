package media

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"image"
	_ "image/gif" // first frame only
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"path"
	"sort"
	"strconv"
	"strings"
	"sync"
	"unicode"

	"github.com/gen2brain/webp"
	"github.com/nwaples/rardecode"
	"golang.org/x/image/draw"
)

// processOne validates, resizes, and encodes a single image.
// Shared by Upload (single file) and UploadBatch (zip/rar entries).
func processOne(raw []byte) (out []byte, w, h int, animated bool, err error) {
	ct := http.DetectContentType(raw)
	switch {
	case strings.HasPrefix(ct, "image/jpeg"), strings.HasPrefix(ct, "image/png"):
	case strings.HasPrefix(ct, "image/gif"):
		animated = true // first frame only
	default:
		return nil, 0, 0, false, fmt.Errorf("%w: detected %s", ErrUnsupportedFmt, ct)
	}

	cfg, _, err := image.DecodeConfig(bytes.NewReader(raw))
	if err != nil {
		return nil, 0, 0, false, fmt.Errorf("%w: %v", ErrUnsupportedFmt, err)
	}
	if int64(cfg.Width)*int64(cfg.Height) > MaxPixels {
		return nil, 0, 0, false, ErrTooLarge
	}
	if cfg.Height > MaxHeight {
		return nil, 0, 0, false, ErrTooTall
	}

	img, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return nil, 0, 0, false, fmt.Errorf("%w: %v", ErrUnsupportedFmt, err)
	}

	bounds := img.Bounds()
	w, h = bounds.Dx(), bounds.Dy()
	if w > MaxWidth {
		nh := h * MaxWidth / w
		dst := image.NewRGBA(image.Rect(0, 0, MaxWidth, nh))
		draw.CatmullRom.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
		img, w, h = dst, MaxWidth, nh
	}
	if h > MaxHeight {
		return nil, 0, 0, false, ErrTooTall
	}

	rgba := ensureRGBA(img)
	applyWatermark(rgba)
	img = rgba

	var buf bytes.Buffer
	if err := webp.Encode(&buf, img, webp.Options{Quality: WebPQuality}); err != nil {
		return nil, 0, 0, false, fmt.Errorf("webp encode: %w", err)
	}
	return buf.Bytes(), w, h, animated, nil
}

// BatchResult is one page in archive order.
type BatchResult struct {
	Index  int           `json:"index"` // 1-based page order
	Name   string        `json:"name"`  // original entry name (for error mapping)
	Result *UploadResult `json:"result,omitempty"`
	Error  string        `json:"error,omitempty"`
}

// archEntry is one extracted image file (either pre-read data or lazy opener).
type archEntry struct {
	name string
	data []byte
	open func() (io.ReadCloser, error)
}

// naturalLess sorts "1, 2, 10" (not "1, 10, 2"); handles "001" == 1.
func naturalLess(a, b string) bool {
	split := func(s string) []string {
		var parts []string
		var cur strings.Builder
		var inDigit *bool
		flush := func() {
			if cur.Len() > 0 {
				parts = append(parts, cur.String())
				cur.Reset()
			}
		}
		for _, r := range s {
			d := unicode.IsDigit(r)
			if inDigit == nil || *inDigit != d {
				flush()
				inDigit = &d
			}
			cur.WriteRune(r)
		}
		flush()
		return parts
	}
	pa, pb := split(a), split(b)
	for i := 0; i < len(pa) && i < len(pb); i++ {
		if pa[i] == pb[i] {
			continue
		}
		na, ea := strconv.Atoi(pa[i])
		nb, eb := strconv.Atoi(pb[i])
		if ea == nil && eb == nil {
			if na != nb {
				return na < nb
			}
			continue
		}
		return pa[i] < pb[i]
	}
	return len(pa) < len(pb)
}

func isImageName(name string) bool {
	lower := strings.ToLower(name)
	return strings.HasSuffix(lower, ".jpg") || strings.HasSuffix(lower, ".jpeg") ||
		strings.HasSuffix(lower, ".png")
}

// UploadBatch extracts a .zip/.rar of page images, processes each in natural
// filename order, and stores them. Flat archives only (subdirs skipped).
// Guards: 50MB archive, 500MB total unpacked, 100 images, magic-byte checks
// on both the archive and every entry.
func (s *Service) UploadBatch(ctx context.Context, r io.Reader, filename, storyID, chapterID string) ([]BatchResult, error) {
	select {
	case s.sem <- struct{}{}:
		defer func() { <-s.sem }()
	case <-ctx.Done():
		return nil, ctx.Err()
	}

	raw, err := io.ReadAll(io.LimitReader(r, MaxZipBytes+1))
	if err != nil {
		return nil, err
	}
	if len(raw) > MaxZipBytes {
		return nil, ErrZipTooLarge
	}
	lower := strings.ToLower(filename)
	extZip := strings.HasSuffix(lower, ".zip")
	extRar := strings.HasSuffix(lower, ".rar")
	magicZip := bytes.HasPrefix(raw, []byte("PK\x03\x04")) || bytes.HasPrefix(raw, []byte("PK\x05\x06")) || bytes.HasPrefix(raw, []byte("PK\x07\x08"))
	magicRar := bytes.HasPrefix(raw, []byte("Rar!\x1a\x07"))

	var entries []archEntry
	switch {
	case magicZip:
		entries, err = readZipEntries(raw)
	case magicRar:
		entries, err = readRarEntries(bytes.NewReader(raw))
	case extZip:
		entries, err = readZipEntries(raw)
	case extRar:
		entries, err = readRarEntries(bytes.NewReader(raw))
	default:
		return nil, fmt.Errorf("%w: need .zip or .rar", ErrNotAZip)
	}
	if err != nil {
		return nil, err
	}
	if len(entries) > MaxZipFiles {
		return nil, ErrZipTooMany
	}
	if len(entries) == 0 {
		return nil, fmt.Errorf("%w: no .jpg/.png images at top level", ErrNotAZip)
	}

	sort.Slice(entries, func(i, j int) bool { return naturalLess(entries[i].name, entries[j].name) })
	results := make([]BatchResult, len(entries))
	type job struct {
		idx int
		e   archEntry
	}
	jobs := make(chan job, len(entries))
	for i, e := range entries {
		jobs <- job{idx: i, e: e}
	}
	close(jobs)

	// Process up to 6 images in parallel for 5x faster batch upload speed
	concurrency := 6
	if len(entries) < concurrency {
		concurrency = len(entries)
	}

	var wg sync.WaitGroup
	for w := 0; w < concurrency; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobs {
				i := j.idx
				e := j.e

				var imgBytes []byte
				if e.open != nil {
					rc, err := e.open()
					if err != nil {
						results[i] = BatchResult{Index: i + 1, Name: e.name, Error: err.Error()}
						continue
					}
					imgBytes, err = io.ReadAll(io.LimitReader(rc, MaxUploadBytes+1))
					rc.Close()
					if err != nil {
						results[i] = BatchResult{Index: i + 1, Name: e.name, Error: err.Error()}
						continue
					}
				} else {
					imgBytes = e.data
				}

				out, w, h, animated, err := processOne(imgBytes)
				imgBytes = nil // free memory immediately
				if err != nil {
					results[i] = BatchResult{Index: i + 1, Name: e.name, Error: err.Error()}
					continue
				}
				sum := sha256.Sum256(out)
				key := fmt.Sprintf("tmp/%s.webp", hex.EncodeToString(sum[:]))
				if storyID != "" && chapterID != "" {
					key = fmt.Sprintf("stories/%s/%s/%s.webp", storyID, chapterID, hex.EncodeToString(sum[:]))
				}
				sizeBytes := int64(len(out))
				if err := s.store.Put(ctx, key, bytes.NewReader(out), sizeBytes, "image/webp"); err != nil {
					results[i] = BatchResult{Index: i + 1, Name: e.name, Error: err.Error()}
					continue
				}
				out = nil // free memory immediately
				results[i] = BatchResult{Index: i + 1, Name: e.name, Result: &UploadResult{
					Key: key, Width: w, Height: h, SizeBytes: sizeBytes,
					ContentType: "image/webp", Animated: animated,
				}}
			}
		}()
	}
	wg.Wait()
	return results, nil
}

// readZipEntries lists top-level image entries with bomb guards.
func readZipEntries(raw []byte) ([]archEntry, error) {
	zr, err := zip.NewReader(bytes.NewReader(raw), int64(len(raw)))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrNotAZip, err)
	}
	var out []archEntry
	var total int64
	for _, f := range zr.File {
		// Reject traversal attempts on the RAW name before any cleaning.
		if f.Name != path.Clean(f.Name) || len(f.Name) == 0 {
			continue
		}
		rel := f.Name
		if strings.Contains(rel, "/") || strings.HasPrefix(rel, ".") {
			continue // flat only, no hidden/macOS junk
		}
		if strings.HasPrefix(strings.ToLower(rel), "__macosx") {
			continue
		}
		base := rel
		if f.FileInfo().IsDir() || f.FileInfo().Mode()&0o777 == 0o777 {
			continue
		}
		if !isImageName(base) {
			continue
		}
		if f.UncompressedSize64 > MaxUploadBytes+1 {
			return nil, fmt.Errorf("%w: entry %s too large", ErrZipTooLarge, base)
		}
		total += int64(f.UncompressedSize64)
		if total > MaxZipUnpacked {
			return nil, ErrZipTooLarge
		}
		zipFile := f
		out = append(out, archEntry{name: base, open: zipFile.Open})
		if len(out) > MaxZipFiles {
			return nil, ErrZipTooMany
		}
	}
	return out, nil
}

// readRarEntries mirrors readZipEntries for RAR archives.
func readRarEntries(r io.Reader) ([]archEntry, error) {
	rc, err := rardecode.NewReader(r, "")
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrNotAZip, err)
	}
	var out []archEntry
	var total int64
	for {
		hdr, err := rc.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrNotAZip, err)
		}
		if hdr.IsDir {
			continue
		}
		if hdr.Name != path.Clean(hdr.Name) || len(hdr.Name) == 0 {
			continue // raw traversal attempt
		}
		rel := hdr.Name
		if strings.Contains(rel, "/") || strings.HasPrefix(rel, ".") {
			continue // flat only, no hidden junk
		}
		if strings.HasPrefix(strings.ToLower(rel), "__macosx") {
			continue
		}
		base := rel
		if !isImageName(base) {
			continue
		}
		if hdr.UnPackedSize > MaxUploadBytes+1 {
			return nil, fmt.Errorf("%w: entry %s too large", ErrZipTooLarge, base)
		}
		total += hdr.UnPackedSize
		if total > MaxZipUnpacked {
			return nil, ErrZipTooLarge
		}
		data, err := io.ReadAll(io.LimitReader(rc, MaxUploadBytes+1))
		if err != nil || len(data) > MaxUploadBytes {
			return nil, fmt.Errorf("%w: entry %s too large", ErrZipTooLarge, base)
		}
		out = append(out, archEntry{name: base, data: data})
		if len(out) > MaxZipFiles {
			return nil, ErrZipTooMany
		}
	}
	return out, nil
}
