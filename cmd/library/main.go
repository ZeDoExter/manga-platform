package main

import (
	"context"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	dbmigrations "manga-platform/deploy/postgres"
	"manga-platform/pkg/httpapi"
	"manga-platform/pkg/pgmigrate"
	"manga-platform/services/library"
)

func newService(ctx context.Context) *library.Service {
	return pgmigrate.Boot(ctx, "library", dbmigrations.Migrations, dbmigrations.Dir,
		library.NewService,
		func(pool *pgxpool.Pool) *library.Service { return library.NewServiceWithStore(library.NewPGStore(pool)) })
}

// userFromHeader reads the gateway-injected identity. Never from URL (IDOR).
func userFromHeader(r *http.Request) (string, bool) {
	u := r.Header.Get("X-User-ID")
	return u, u != ""
}

func main() {
	svc := newService(context.Background())
	mux := http.NewServeMux()
	httpapi.Health(mux)

	withUser := func(next func(w http.ResponseWriter, r *http.Request, userID string)) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			userID, ok := userFromHeader(r)
			if !ok {
				httpapi.Fail(w, http.StatusUnauthorized, "missing X-User-ID")
				return
			}
			next(w, r, userID)
		}
	}

	// PUT /progress — upsert reading position (FR-L1).
	mux.HandleFunc("PUT /progress", withUser(func(w http.ResponseWriter, r *http.Request, userID string) {
		var req struct {
			StoryID     string                `json:"story_id"`
			ChapterID   string                `json:"chapter_id"`
			ContentType library.ContentType   `json:"content_type"`
			Position    int64                 `json:"position"`
		}
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}
		p, err := svc.SaveProgress(r.Context(), userID, req.StoryID, req.ChapterID, req.ContentType, req.Position)
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusOK, p)
		case errors.Is(err, library.ErrInvalidID), errors.Is(err, library.ErrInvalidPosition), errors.Is(err, library.ErrInvalidType):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	}))

	// GET /progress/{storyID} — latest position for this user.
	mux.HandleFunc("GET /progress/{storyID}", withUser(func(w http.ResponseWriter, r *http.Request, userID string) {
		p, err := svc.GetProgress(r.Context(), userID, r.PathValue("storyID"))
		if err != nil {
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
			return
		}
		if p == nil {
			httpapi.Fail(w, http.StatusNotFound, "no progress")
			return
		}
		httpapi.JSON(w, http.StatusOK, p)
	}))

	// GET /me/continue — continue-reading rows (FR-L3).
	mux.HandleFunc("GET /me/continue", withUser(func(w http.ResponseWriter, r *http.Request, userID string) {
		rows, err := svc.ContinueReading(r.Context(), userID, 10)
		if err != nil {
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
			return
		}
		httpapi.JSON(w, http.StatusOK, rows)
	}))

	// PUT/DELETE /follows/{storyID} (FR-L2, idempotent).
	mux.HandleFunc("PUT /follows/{storyID}", withUser(func(w http.ResponseWriter, r *http.Request, userID string) {
		if err := svc.Follow(r.Context(), userID, r.PathValue("storyID")); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	mux.HandleFunc("DELETE /follows/{storyID}", withUser(func(w http.ResponseWriter, r *http.Request, userID string) {
		if err := svc.Unfollow(r.Context(), userID, r.PathValue("storyID")); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	mux.HandleFunc("GET /me/follows", withUser(func(w http.ResponseWriter, r *http.Request, userID string) {
		list, err := svc.ListFollows(r.Context(), userID)
		if err != nil {
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
			return
		}
		httpapi.JSON(w, http.StatusOK, list)
	}))

	// PUT/DELETE /bookmarks/{chapterID} (FR-L2, idempotent).
	mux.HandleFunc("PUT /bookmarks/{chapterID}", withUser(func(w http.ResponseWriter, r *http.Request, userID string) {
		var req struct {
			StoryID string `json:"story_id"`
		}
		_ = httpapi.Decode(r, &req)
		if err := svc.AddBookmark(r.Context(), userID, r.PathValue("chapterID"), req.StoryID); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	mux.HandleFunc("DELETE /bookmarks/{chapterID}", withUser(func(w http.ResponseWriter, r *http.Request, userID string) {
		if err := svc.RemoveBookmark(r.Context(), userID, r.PathValue("chapterID")); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	mux.HandleFunc("GET /me/bookmarks", withUser(func(w http.ResponseWriter, r *http.Request, userID string) {
		list, err := svc.ListBookmarks(r.Context(), userID)
		if err != nil {
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
			return
		}
		httpapi.JSON(w, http.StatusOK, list)
	}))

	// POST /merge — fold guest progress into the account (FR-L4).
	mux.HandleFunc("POST /merge", withUser(func(w http.ResponseWriter, r *http.Request, userID string) {
		var req struct {
			Items []*library.Progress `json:"items"`
		}
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}
		switch err := svc.MergeGuestProgress(r.Context(), userID, req.Items); {
		case err == nil:
			w.WriteHeader(http.StatusNoContent)
		case errors.Is(err, library.ErrPayloadTooLarge):
			httpapi.Fail(w, http.StatusRequestEntityTooLarge, err.Error())
		case errors.Is(err, library.ErrInvalidID), errors.Is(err, library.ErrInvalidPosition), errors.Is(err, library.ErrInvalidType):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	}))

	// POST /reads — record a chapter-open (FR-L5). Logged-in callers key by
	// account; guests by validated anon id from the body.
	mux.HandleFunc("POST /reads", withUser(func(w http.ResponseWriter, r *http.Request, userID string) {
		var req struct {
			StoryID string `json:"story_id"`
			Chapter int    `json:"chapter"`
			AnonID  string `json:"anon_id"`
		}
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}
		switch err := svc.RecordRead(r.Context(), userID, req.AnonID, req.StoryID, req.Chapter); {
		case err == nil:
			w.WriteHeader(http.StatusNoContent)
		case errors.Is(err, library.ErrInvalidID), errors.Is(err, library.ErrInvalidChapter), errors.Is(err, library.ErrInvalidAnonID):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	}))

	// GET /reads/trending?range=today|week|all — per-story read counts.
	mux.HandleFunc("GET /reads/trending", withUser(func(w http.ResponseWriter, r *http.Request, _ string) {
		out, err := svc.TrendingReads(r.Context(), library.Range(r.URL.Query().Get("range")), 50)
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusOK, out)
		case errors.Is(err, library.ErrInvalidRange):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	}))

	httpapi.Run("library", mux)
}
