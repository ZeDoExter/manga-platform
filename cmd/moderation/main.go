package main

import (
	"context"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	dbmigrations "manga-platform/deploy/postgres"
	"manga-platform/pkg/clients"
	"manga-platform/pkg/httpapi"
	"manga-platform/pkg/imagestore"
	"manga-platform/pkg/pgmigrate"
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

func newService(ctx context.Context) *moderation.Service {
	secret := []byte(httpapi.Env("HMAC_SECRET", "default-dev-hmac-secret-32-bytes"))
	store := imagestore.NewMemoryStore(httpapi.Env("CDN_BASE_URL", "https://img.dootoon.store"), secret)
	cat := clients.NewCatalog(httpapi.Env("CATALOG_URL", "http://localhost:8082"))
	com := clients.NewCommerce(httpapi.Env("COMMERCE_URL", "http://localhost:8083"))
	id := clients.NewIdentity(httpapi.Env("IDENTITY_URL", "http://localhost:8081"))
	return pgmigrate.Boot(ctx, "moderation", dbmigrations.Migrations, dbmigrations.Dir,
		func() *moderation.Service { return moderation.NewService(cat, com, id, store) },
		func(pool *pgxpool.Pool) *moderation.Service { return moderation.NewServiceWithStore(cat, com, id, store, moderation.NewPGStore(pool)) })
}

func main() {
	svc := newService(context.Background())

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
		logs, err := svc.GetAuditLogs(r.Context())
		if err != nil {
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
			return
		}
		httpapi.JSON(w, http.StatusOK, logs)
	})

	httpapi.Run("moderation", mux)
}
