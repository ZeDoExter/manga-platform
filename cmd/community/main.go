package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"

	dbmigrations "manga-platform/deploy/postgres"
	"manga-platform/pkg/clients"
	"manga-platform/pkg/httpapi"
	"manga-platform/pkg/pgmigrate"
	"manga-platform/services/community"
)

type postCommentRequest struct {
	StoryID    string `json:"story_id"`
	ChapterID  string `json:"chapter_id"`
	UserID     string `json:"user_id"`
	AuthorName string `json:"author_name"`
	ParentID   string `json:"parent_id,omitempty"`
	Body       string `json:"body"`
}

type editCommentRequest struct {
	UserID string `json:"user_id"`
	Body   string `json:"body"`
}

type deleteCommentRequest struct {
	UserID  string `json:"user_id"`
	IsAdmin bool   `json:"is_admin"`
}

type setStatusRequest struct {
	Status community.CommentStatus `json:"status"`
}

type blockedWordRequest struct {
	Word string `json:"word"`
}

func newService(ctx context.Context) *community.Service {
	cat := clients.NewCatalog(httpapi.Env("CATALOG_URL", "http://localhost:8082"))
	com := clients.NewCommerce(httpapi.Env("COMMERCE_URL", "http://localhost:8083"))
	if os.Getenv("DATABASE_URL") == "" {
		log.Print("community: DATABASE_URL unset, using in-memory store")
		return community.NewService(cat, com)
	}
	pool := pgmigrate.MustConnect(ctx)
	if err := pgmigrate.Up(ctx, pool, dbmigrations.Migrations, dbmigrations.Dir); err != nil {
		log.Fatalf("community: migrate: %v", err)
	}
	return community.NewServiceWithStore(cat, com, community.NewPGStore(pool))
}

func main() {
	svc := newService(context.Background())

	mux := http.NewServeMux()
	httpapi.Health(mux)

	mux.HandleFunc("POST /comments", func(w http.ResponseWriter, r *http.Request) {
		var req postCommentRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		comment, err := svc.PostComment(r.Context(), community.PostCommentRequest{
			StoryID:    req.StoryID,
			ChapterID:  req.ChapterID,
			UserID:     req.UserID,
			AuthorName: req.AuthorName,
			ParentID:   req.ParentID,
			Body:       req.Body,
		})
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusCreated, comment)
		case errors.Is(err, community.ErrLoginRequired):
			httpapi.Fail(w, http.StatusUnauthorized, err.Error())
		case errors.Is(err, community.ErrInvalidCommentBody), errors.Is(err, community.ErrMaxReplyDepth):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, community.ErrUnlockRequired), errors.Is(err, community.ErrPermissionDenied):
			httpapi.Fail(w, http.StatusForbidden, err.Error())
		case errors.Is(err, community.ErrBlockedWordFound):
			httpapi.Fail(w, http.StatusUnprocessableEntity, err.Error())
		case errors.Is(err, community.ErrCommentNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("GET /chapters/{id}/comments", func(w http.ResponseWriter, r *http.Request) {
		page, err := svc.ListChapterComments(r.Context(), r.PathValue("id"), r.URL.Query().Get("cursor"), limitParam(r))
		if err != nil {
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
			return
		}
		httpapi.JSON(w, http.StatusOK, page)
	})

	mux.HandleFunc("GET /stories/{id}/comments", func(w http.ResponseWriter, r *http.Request) {
		page, err := svc.ListStoryComments(r.Context(), r.PathValue("id"), r.URL.Query().Get("cursor"), limitParam(r))
		if err != nil {
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
			return
		}
		httpapi.JSON(w, http.StatusOK, page)
	})

	mux.HandleFunc("PATCH /comments/{id}", func(w http.ResponseWriter, r *http.Request) {
		var req editCommentRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		comment, err := svc.EditComment(r.Context(), r.PathValue("id"), req.UserID, req.Body)
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusOK, comment)
		case errors.Is(err, community.ErrInvalidCommentBody):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, community.ErrCommentNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		case errors.Is(err, community.ErrPermissionDenied), errors.Is(err, community.ErrEditWindowExpired):
			httpapi.Fail(w, http.StatusForbidden, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("DELETE /comments/{id}", func(w http.ResponseWriter, r *http.Request) {
		var req deleteCommentRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		err := svc.SoftDeleteComment(r.Context(), r.PathValue("id"), req.UserID, req.IsAdmin)
		switch {
		case err == nil:
			w.WriteHeader(http.StatusNoContent)
		case errors.Is(err, community.ErrCommentNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		case errors.Is(err, community.ErrPermissionDenied):
			httpapi.Fail(w, http.StatusForbidden, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("PATCH /comments/{id}/status", func(w http.ResponseWriter, r *http.Request) {
		var req setStatusRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		err := svc.SetCommentStatus(r.Context(), r.PathValue("id"), req.Status)
		switch {
		case err == nil:
			w.WriteHeader(http.StatusNoContent)
		case errors.Is(err, community.ErrCommentNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("POST /blocked-words", func(w http.ResponseWriter, r *http.Request) {
		var req blockedWordRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if err := svc.AddBlockedWord(r.Context(), req.Word); err != nil {
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	httpapi.Run("community", mux)
}

func limitParam(r *http.Request) int {
	raw := r.URL.Query().Get("limit")
	if raw == "" {
		return 20
	}
	limit, err := strconv.Atoi(raw)
	if err != nil {
		return 20
	}
	return limit
}
