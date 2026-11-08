package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"

	dbmigrations "manga-platform/deploy/postgres"
	"manga-platform/pkg/api"
	"manga-platform/pkg/httpapi"
	"manga-platform/pkg/pgmigrate"
	"manga-platform/services/identity"
)

func newService(ctx context.Context) *identity.Service {
	if os.Getenv("DATABASE_URL") == "" {
		log.Print("identity: DATABASE_URL unset, using in-memory store")
		return identity.NewService()
	}
	pool := pgmigrate.MustConnect(ctx)
	if err := pgmigrate.Up(ctx, pool, dbmigrations.Migrations, dbmigrations.Dir); err != nil {
		log.Fatalf("identity: migrate: %v", err)
	}
	return identity.NewServiceWithStore(identity.NewPGStore(pool))
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

	mux.HandleFunc("GET /sessions/{token}", func(w http.ResponseWriter, r *http.Request) {
		session, err := svc.ValidateSession(r.Context(), r.PathValue("token"))
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusOK, session)
		case errors.Is(err, identity.ErrUnauthorized):
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
