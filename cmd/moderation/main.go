package main

import (
	"errors"
	"net/http"

	"manga-platform/pkg/clients"
	"manga-platform/pkg/httpapi"
	"manga-platform/pkg/imagestore"
	"manga-platform/services/catalog"
	"manga-platform/services/commerce"
	"manga-platform/services/identity"
	"manga-platform/services/moderation"
)

type takedownRequest struct {
	AdminID     string   `json:"admin_id"`
	ChapterID   string   `json:"chapter_id"`
	Reason      string   `json:"reason"`
	PurchaseIDs []string `json:"purchase_ids"`
}

type banUserRequest struct {
	AdminID string `json:"admin_id"`
	Reason  string `json:"reason"`
}

func main() {
	secret := []byte(httpapi.Env("HMAC_SECRET", "default-dev-hmac-secret-32-bytes"))
	store := imagestore.NewMemoryStore(httpapi.Env("CDN_BASE_URL", "https://img.yourmanga.com"), secret)

	svc := moderation.NewService(
		clients.NewCatalog(httpapi.Env("CATALOG_URL", "http://localhost:8082")),
		clients.NewCommerce(httpapi.Env("COMMERCE_URL", "http://localhost:8083")),
		clients.NewIdentity(httpapi.Env("IDENTITY_URL", "http://localhost:8081")),
		store,
	)

	mux := http.NewServeMux()
	httpapi.Health(mux)

	mux.HandleFunc("POST /takedowns", func(w http.ResponseWriter, r *http.Request) {
		var req takedownRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		err := svc.TakedownChapter(r.Context(), req.AdminID, req.ChapterID, req.Reason, req.PurchaseIDs)
		switch {
		case err == nil:
			w.WriteHeader(http.StatusNoContent)
		case errors.Is(err, moderation.ErrReasonRequired):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, moderation.ErrUnauthorizedAdmin):
			httpapi.Fail(w, http.StatusForbidden, err.Error())
		case errors.Is(err, catalog.ErrChapterNotFound),
			errors.Is(err, commerce.ErrPurchaseNotFound),
			errors.Is(err, identity.ErrUserNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("POST /users/{id}/ban", func(w http.ResponseWriter, r *http.Request) {
		var req banUserRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		err := svc.BanUser(r.Context(), req.AdminID, r.PathValue("id"), req.Reason)
		switch {
		case err == nil:
			w.WriteHeader(http.StatusNoContent)
		case errors.Is(err, moderation.ErrReasonRequired):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, identity.ErrUserNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("GET /audit-logs", func(w http.ResponseWriter, r *http.Request) {
		httpapi.JSON(w, http.StatusOK, svc.GetAuditLogs(r.Context()))
	})

	httpapi.Run("moderation", mux)
}
