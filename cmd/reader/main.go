package main

import (
	"errors"
	"net/http"

	"manga-platform/pkg/api"
	"manga-platform/pkg/clients"
	"manga-platform/pkg/httpapi"
	"manga-platform/pkg/imagestore"
	"manga-platform/services/identity"
	"manga-platform/services/reader"
)

func main() {
	secret := []byte(httpapi.Env("HMAC_SECRET", "default-dev-hmac-secret-32-bytes"))
	store := imagestore.NewMemoryStore(httpapi.Env("CDN_BASE_URL", "https://img.yourmanga.com"), secret)

	svc := reader.NewService(
		clients.NewCatalog(httpapi.Env("CATALOG_URL", "http://localhost:8082")),
		clients.NewCommerce(httpapi.Env("COMMERCE_URL", "http://localhost:8083")),
		clients.NewIdentity(httpapi.Env("IDENTITY_URL", "http://localhost:8081")),
		store,
	)

	mux := http.NewServeMux()
	httpapi.Health(mux)

	mux.HandleFunc("GET /api/chapters/{id}/read", func(w http.ResponseWriter, r *http.Request) {
		role := identity.Role(r.Header.Get("X-User-Role"))
		if role == "" {
			role = identity.RoleGuest
		}
		serveRead(w, r, svc, api.ReadChapterRequest{
			UserID:    r.Header.Get("X-User-ID"),
			Role:      role,
			ChapterID: r.PathValue("id"),
		})
	})

	httpapi.Run("reader", mux)
}

func serveRead(w http.ResponseWriter, r *http.Request, svc *reader.Service, req api.ReadChapterRequest) {
	resp, err := svc.ReadChapter(r.Context(), reader.ReadChapterRequest{
		UserID:    req.UserID,
		Role:      req.Role,
		ChapterID: req.ChapterID,
	})
	if err != nil {
		httpapi.Fail(w, readErrorStatus(err), err.Error())
		return
	}
	httpapi.JSON(w, http.StatusOK, resp)
}

func readErrorStatus(err error) int {
	switch {
	case errors.Is(err, reader.ErrLoginRequired):
		return http.StatusUnauthorized
	case errors.Is(err, reader.ErrPaymentRequired):
		return http.StatusPaymentRequired
	case errors.Is(err, reader.ErrContentUnavailable):
		return http.StatusGone
	default:
		return http.StatusInternalServerError
	}
}
