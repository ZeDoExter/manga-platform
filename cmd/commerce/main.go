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
	"manga-platform/services/commerce"
)

func newService(ctx context.Context) *commerce.Service {
	if os.Getenv("DATABASE_URL") == "" {
		log.Print("commerce: DATABASE_URL unset, using in-memory store")
		return commerce.NewService()
	}
	pool := pgmigrate.MustConnect(ctx)
	if err := pgmigrate.Up(ctx, pool, dbmigrations.Migrations, dbmigrations.Dir); err != nil {
		log.Fatalf("commerce: migrate: %v", err)
	}
	return commerce.NewServiceWithStore(commerce.NewPGStore(pool))
}

func main() {
	svc := newService(context.Background())
	mux := http.NewServeMux()
	httpapi.Health(mux)

	mux.HandleFunc("POST /topups", func(w http.ResponseWriter, r *http.Request) {
		var req api.TopUpRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		entry, err := svc.TopUp(r.Context(), req.UserID, req.Amount, req.CoinType, req.RefID, req.IdempotencyKey)
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusOK, entry)
		case errors.Is(err, commerce.ErrInvalidAmount):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("POST /tips", func(w http.ResponseWriter, r *http.Request) {
		var req api.TipRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		entry, err := svc.Tip(r.Context(), req.UserID, req.Amount, req.ReferenceID, req.IdempotencyKey)
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusOK, entry)
		case errors.Is(err, commerce.ErrInvalidAmount):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, commerce.ErrInsufficientBalance):
			httpapi.Fail(w, http.StatusPaymentRequired, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("GET /wallets/{userID}", func(w http.ResponseWriter, r *http.Request) {
		wallet, err := svc.GetWallet(r.Context(), r.PathValue("userID"))
		if err != nil {
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
			return
		}
		httpapi.JSON(w, http.StatusOK, wallet)
	})

	mux.HandleFunc("GET /wallets/{userID}/ledger", func(w http.ResponseWriter, r *http.Request) {
		entries := svc.ListLedger(r.Context(), r.PathValue("userID"))
		httpapi.JSON(w, http.StatusOK, api.LedgerResponse{Entries: entries})
	})

	mux.HandleFunc("GET /users/{userID}/entitlements", func(w http.ResponseWriter, r *http.Request) {
		entitlements := svc.ListEntitlements(r.Context(), r.PathValue("userID"))
		httpapi.JSON(w, http.StatusOK, api.EntitlementsResponse{Entitlements: entitlements})
	})

	mux.HandleFunc("GET /creators/{creatorID}/earnings", func(w http.ResponseWriter, r *http.Request) {
		total, entries := svc.GetCreatorEarnings(r.Context(), r.PathValue("creatorID"))
		httpapi.JSON(w, http.StatusOK, api.CreatorEarningsResponse{TotalCoins: total, Entries: entries})
	})

	mux.HandleFunc("POST /purchases", func(w http.ResponseWriter, r *http.Request) {
		var req api.PurchaseChapterRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		result, err := svc.PurchaseChapter(r.Context(), commerce.PurchaseRequest{
			UserID:         req.UserID,
			StoryID:        req.StoryID,
			ChapterID:      req.ChapterID,
			Price:          req.Price,
			CreatorSplits:  req.CreatorSplits,
			IdempotencyKey: req.IdempotencyKey,
		})
		switch {
		case err == nil:
			httpapi.JSON(w, http.StatusOK, result)
		case errors.Is(err, commerce.ErrInvalidAmount), errors.Is(err, commerce.ErrInvalidSplit):
			httpapi.Fail(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, commerce.ErrInsufficientBalance):
			httpapi.Fail(w, http.StatusPaymentRequired, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("POST /purchases/{id}/reverse", func(w http.ResponseWriter, r *http.Request) {
		var req api.ReversePurchaseRequest
		if err := httpapi.Decode(r, &req); err != nil {
			httpapi.Fail(w, http.StatusBadRequest, "invalid request body")
			return
		}

		err := svc.ReversePurchaseOnTakedown(r.Context(), r.PathValue("id"), req.TakedownID)
		switch {
		case err == nil:
			w.WriteHeader(http.StatusNoContent)
		case errors.Is(err, commerce.ErrPurchaseNotFound):
			httpapi.Fail(w, http.StatusNotFound, err.Error())
		default:
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
		}
	})

	mux.HandleFunc("GET /entitlements/{userID}/{chapterID}", func(w http.ResponseWriter, r *http.Request) {
		entitled, err := svc.CheckEntitlement(r.Context(), r.PathValue("userID"), r.PathValue("chapterID"))
		if err != nil {
			httpapi.Fail(w, http.StatusInternalServerError, err.Error())
			return
		}
		httpapi.JSON(w, http.StatusOK, api.EntitlementResponse{Entitled: entitled})
	})

	httpapi.Run("commerce", mux)
}
