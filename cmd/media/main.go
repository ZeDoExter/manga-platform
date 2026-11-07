package main

import (
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"

	"manga-platform/pkg/httpapi"
	"manga-platform/pkg/imagestore"
	"manga-platform/services/media"
)

// userFromHeader reads the gateway-injected identity + role for upload auth.
func userFromHeader(r *http.Request) (userID, role string) {
	return r.Header.Get("X-User-ID"), r.Header.Get("X-User-Role")
}

func newStore() imagestore.ImageStore {
	secret := []byte(httpapi.Env("HMAC_SECRET", "default-dev-hmac-secret-32-bytes"))
	baseURL := httpapi.Env("CDN_BASE_URL", "https://img.yourmanga.com")
	if dir := os.Getenv("MEDIA_LOCAL_DIR"); dir != "" {
		store, err := imagestore.NewLocalStore(dir, baseURL, secret)
		if err != nil {
			log.Fatalf("media: local store: %v", err)
		}
		return store
	}
	return imagestore.NewMemoryStore(baseURL, secret)
}

func main() {
	maxConc := 4
	if v := os.Getenv("MEDIA_MAX_CONCURRENT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			maxConc = n
		}
	}
	svc := media.NewService(newStore(), maxConc)

	mux := http.NewServeMux()
	httpapi.Health(mux)

	// POST /uploads?story_id=&chapter_id= — multipart "file" (FR-U2).
	// Auth: Uploader/Admin only (gateway injects X-User-Role).
	mux.HandleFunc("POST /uploads", func(w http.ResponseWriter, r *http.Request) {
		_, role := userFromHeader(r)
		if role != "uploader" && role != "admin" {
			httpapi.Fail(w, http.StatusForbidden, "uploader role required")
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, media.MaxUploadBytes+1024)
		if err := r.ParseMultipartForm(media.MaxUploadBytes + 1024); err != nil {
			httpapi.Fail(w, http.StatusRequestEntityTooLarge, "file too large")
			return
		}
		f, _, err := r.FormFile("file")
		if err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "missing file field")
			return
		}
		defer f.Close()

		res, err := svc.Upload(r.Context(), f, r.URL.Query().Get("story_id"), r.URL.Query().Get("chapter_id"))
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusCreated, res)
		case errors.Is(err, media.ErrTooLarge):
			httpapi.Fail(w, http.StatusRequestEntityTooLarge, err.Error())
		case errors.Is(err, media.ErrUnsupportedFmt), errors.Is(err, media.ErrTooTall), errors.Is(err, media.ErrTooManyPixels):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		default:
			if r.Context().Err() != nil {
				httpapi.Fail(w, http.StatusServiceUnavailable, "server busy")
				return
			}
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	// POST /uploads/batch?story_id=&chapter_id= — multipart "file" (.zip/.rar).
	// Same auth. Returns per-page results in natural filename order.
	mux.HandleFunc("POST /uploads/batch", func(w http.ResponseWriter, r *http.Request) {
		_, role := userFromHeader(r)
		if role != "uploader" && role != "admin" {
			httpapi.Fail(w, http.StatusForbidden, "uploader role required")
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, media.MaxZipBytes+1024)
		if err := r.ParseMultipartForm(media.MaxZipBytes + 1024); err != nil {
			httpapi.Fail(w, http.StatusRequestEntityTooLarge, "archive too large")
			return
		}
		f, hdr, err := r.FormFile("file")
		if err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "missing file field")
			return
		}
		defer f.Close()

		res, err := svc.UploadBatch(r.Context(), f, hdr.Filename, r.URL.Query().Get("story_id"), r.URL.Query().Get("chapter_id"))
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusCreated, res)
		case errors.Is(err, media.ErrZipTooLarge):
			httpapi.Fail(w, http.StatusRequestEntityTooLarge, err.Error())
		case errors.Is(err, media.ErrNotAZip), errors.Is(err, media.ErrZipTooMany):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		default:
			if r.Context().Err() != nil {
				httpapi.Fail(w, http.StatusServiceUnavailable, "server busy")
				return
			}
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	// POST /confirm — move tmp/ upload to stories/ path after chapter save.
	mux.HandleFunc("POST /confirm", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			TmpKey    string `json:"tmp_key"`
			StoryID   string `json:"story_id"`
			ChapterID string `json:"chapter_id"`
		}
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}
		final, err := svc.Confirm(r.Context(), req.TmpKey, req.StoryID, req.ChapterID)
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusOK, map[string]string{"key": final})
		case errors.Is(err, media.ErrInvalidKey):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, imagestore.ErrNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	// DELETE /chapters/{storyID}/{chapterID}/images — takedown wipe (FR-M6/FR-D2).
	mux.HandleFunc("DELETE /chapters/{storyID}/{chapterID}/images", func(w http.ResponseWriter, r *http.Request) {
		if err := svc.DeleteChapter(r.Context(), r.PathValue("storyID"), r.PathValue("chapterID")); err != nil {
			if errors.Is(err, media.ErrInvalidKey) {
				httpapi.Fail(w, http.StatusBadRequest, err.Error())
				return
			}
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	// Readers fetch images via imagestore.SignURL (CDN signed URLs, FR-R4);
	// no direct serve endpoint here by design (paywall must not leak).

	httpapi.Run("media", mux)
}
