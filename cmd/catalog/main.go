package main

import (
	"errors"
	"net/http"

	"manga-platform/pkg/api"
	"manga-platform/pkg/httpapi"
	"manga-platform/services/catalog"
)

func main() {
	svc := catalog.NewService()
	mux := http.NewServeMux()
	httpapi.Health(mux)

	mux.HandleFunc("POST /stories", func(w http.ResponseWriter, r *http.Request) {
		var req api.CreateStoryRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		var err error
		var story *catalog.Story
		if req.ID != "" {
			story, err = svc.CreateStoryWithID(r.Context(), req.ID, req.OwnerID, req.Type, req.Title, req.Synopsis, req.Tags, req.Splits)
		} else {
			story, err = svc.CreateStory(r.Context(), req.OwnerID, req.Type, req.Title, req.Synopsis, req.Tags, req.Splits)
		}
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusCreated, story)
		case errors.Is(err, catalog.ErrInvalidTitle), errors.Is(err, catalog.ErrInvalidSplit), errors.Is(err, catalog.ErrInvalidID):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, catalog.ErrStoryExists):
			httpapi.Fail(w, http.StatusConflict, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("GET /stories/{id}", func(w http.ResponseWriter, r *http.Request) {
		story, err := svc.GetStory(r.Context(), r.PathValue("id"))
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusOK, story)
		case errors.Is(err, catalog.ErrStoryNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("POST /stories/{id}/chapters", func(w http.ResponseWriter, r *http.Request) {
		var req api.CreateChapterRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		var chapter *catalog.Chapter
		var err error
		if req.ID != "" {
			chapter, err = svc.CreateChapterWithID(r.Context(), req.ID, r.PathValue("id"), req.OrderIndex, req.Title, req.PriceCoins, req.PageKeys, req.NovelText, req.AutoUnlockAt)
		} else {
			chapter, err = svc.CreateChapter(r.Context(), r.PathValue("id"), req.OrderIndex, req.Title, req.PriceCoins, req.PageKeys, req.NovelText, req.AutoUnlockAt)
		}
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusCreated, chapter)
		case errors.Is(err, catalog.ErrStoryNotFound), errors.Is(err, catalog.ErrChapterNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		case errors.Is(err, catalog.ErrInvalidTitle), errors.Is(err, catalog.ErrInvalidPrice), errors.Is(err, catalog.ErrInvalidID):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, catalog.ErrChapterExists):
			httpapi.Fail(w, http.StatusConflict, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("GET /chapters/{id}", func(w http.ResponseWriter, r *http.Request) {
		chapter, err := svc.GetChapter(r.Context(), r.PathValue("id"))
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusOK, chapter)
		case errors.Is(err, catalog.ErrChapterNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("PATCH /chapters/{id}", func(w http.ResponseWriter, r *http.Request) {
		var req api.UpdateChapterRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		chapter, err := svc.UpdateChapter(r.Context(), r.PathValue("id"), req.Title, req.PriceCoins)
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusOK, chapter)
		case errors.Is(err, catalog.ErrChapterNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		case errors.Is(err, catalog.ErrInvalidTitle), errors.Is(err, catalog.ErrInvalidPrice):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("PATCH /chapters/{id}/status", func(w http.ResponseWriter, r *http.Request) {
		var req api.SetChapterStatusRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		err := svc.SetChapterStatus(r.Context(), r.PathValue("id"), req.Status)
		switch {
		case err == nil:
			w.WriteHeader(http.StatusNoContent)
		case errors.Is(err, catalog.ErrChapterNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	httpapi.Run("catalog", mux)
}
