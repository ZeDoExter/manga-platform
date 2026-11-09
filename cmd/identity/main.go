package main

import (
	"context"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	dbmigrations "manga-platform/deploy/postgres"
	"manga-platform/pkg/api"
	"manga-platform/pkg/httpapi"
	"manga-platform/pkg/pgmigrate"
	"manga-platform/services/identity"
)

func newService(ctx context.Context) *identity.Service {
	return pgmigrate.Boot(ctx, "identity", dbmigrations.Migrations, dbmigrations.Dir,
		identity.NewService,
		func(pool *pgxpool.Pool) *identity.Service { return identity.NewServiceWithStore(identity.NewPGStore(pool)) })
}

func main() {
	svc := newService(context.Background())
	mux := http.NewServeMux()
	httpapi.Health(mux)

	mux.HandleFunc("POST /users", func(w http.ResponseWriter, r *http.Request) {
		var req api.CreateUserRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		user, err := svc.SignUp(r.Context(), req.Email, req.Password, req.Role)
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusCreated, user)
		case errors.Is(err, identity.ErrUserExists):
			httpapi.Fail(w, http.StatusConflict, err.Error())
		case errors.Is(err, identity.ErrInvalidEmail), errors.Is(err, identity.ErrWeakPassword):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("POST /sessions", func(w http.ResponseWriter, r *http.Request) {
		var req api.LoginRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		session, err := svc.Login(r.Context(), req.Email, req.Password)
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusOK, session)
		case errors.Is(err, identity.ErrInvalidPassword):
			httpapi.Fail(w, http.StatusUnauthorized, err.Error())
		case errors.Is(err, identity.ErrUserBanned):
			httpapi.Fail(w, http.StatusForbidden, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})
	mux.HandleFunc("POST /users/{id}/ban", func(w http.ResponseWriter, r *http.Request) {
		var req api.SetBanRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		err := svc.SetBanStatus(r.Context(), r.PathValue("id"), req.Banned)
		switch {
		case err == nil:
			w.WriteHeader(http.StatusNoContent)
		case errors.Is(err, identity.ErrUserNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("POST /users/{id}/can-edit-story", func(w http.ResponseWriter, r *http.Request) {
		var req api.CanEditStoryRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		allowed, err := svc.CanEditStory(r.PathValue("id"), req.OwnerID, req.TeamIDs)
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusOK, api.CanEditStoryResponse{Allowed: allowed})
		case errors.Is(err, identity.ErrUserNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		case errors.Is(err, identity.ErrUserBanned):
			httpapi.Fail(w, http.StatusForbidden, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	httpapi.Run("identity", mux)
}
