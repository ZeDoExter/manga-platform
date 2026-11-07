//go:build integration

package commerce_test

import (
	"context"
	"fmt"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	dbmigrations "manga-platform/deploy/postgres"
	"manga-platform/pkg/pgmigrate"
	"manga-platform/services/commerce"
)

func pgService(t *testing.T) *commerce.Service {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	if err := pgmigrate.Up(ctx, pool, dbmigrations.Migrations, dbmigrations.Dir); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return commerce.NewServiceWithStore(commerce.NewPGStore(pool))
}

func uniq(prefix string) string {
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}

// TestPG_Contract_MoneyFlow covers topup -> buy -> ledger -> refund -> clawback on PG.
func TestPG_Contract_MoneyFlow(t *testing.T) {
	ctx := context.Background()
	svc := pgService(t)
	buyer, creator := uniq("pg-buyer"), uniq("pg-creator")

	if _, err := svc.TopUp(ctx, buyer, 100, commerce.CoinPurchased, "pay", uniq("topup")); err != nil {
		t.Fatalf("TopUp: %v", err)
	}
	res, err := svc.PurchaseChapter(ctx, commerce.PurchaseRequest{
		UserID: buyer, StoryID: "story-1", ChapterID: uniq("chap"),
		Price:          40,
		CreatorSplits:  []commerce.CreatorSplit{{CreatorID: creator, Percentage: 100}},
		IdempotencyKey: uniq("buy"),
	})
	if err != nil {
		t.Fatalf("Purchase: %v", err)
	}
	w, _ := svc.GetWallet(ctx, buyer)
	if w.PurchasedCoins != 60 {
		t.Fatalf("buyer should have 60, got %d", w.PurchasedCoins)
	}
	wc, _ := svc.GetWallet(ctx, creator)
	if wc.PurchasedCoins != 28 {
		t.Fatalf("creator should have 28, got %d", wc.PurchasedCoins)
	}
	if len(svc.ListLedger(ctx, buyer)) != 2 {
		t.Fatalf("buyer ledger should have 2 rows, got %d", len(svc.ListLedger(ctx, buyer)))
	}
	if len(svc.ListLedger(ctx, commerce.PlatformUserID)) < 1 {
		t.Fatal("platform fee row missing")
	}

	// Idempotent replay returns the same purchase without charging again.
	replay, err := svc.PurchaseChapter(ctx, commerce.PurchaseRequest{
		UserID: buyer, StoryID: "story-1", ChapterID: res.Purchase.ChapterID,
		Price:          40,
		CreatorSplits:  []commerce.CreatorSplit{{CreatorID: creator, Percentage: 100}},
		IdempotencyKey: res.Purchase.IdempotencyKey,
	})
	if err != nil {
		t.Fatalf("replay: %v", err)
	}
	if replay.Purchase.ID != res.Purchase.ID {
		t.Fatalf("replay returned different purchase %s vs %s", replay.Purchase.ID, res.Purchase.ID)
	}
	w2, _ := svc.GetWallet(ctx, buyer)
	if w2.PurchasedCoins != 60 {
		t.Fatalf("replay double-charged: %d", w2.PurchasedCoins)
	}

	// Takedown reversal restores buyer, zeroes creator.
	if err := svc.ReversePurchaseOnTakedown(ctx, res.Purchase.ID, uniq("td")); err != nil {
		t.Fatalf("reverse: %v", err)
	}
	w3, _ := svc.GetWallet(ctx, buyer)
	if w3.PurchasedCoins != 100 {
		t.Fatalf("buyer should be refunded to 100, got %d", w3.PurchasedCoins)
	}
	wc3, _ := svc.GetWallet(ctx, creator)
	if wc3.PurchasedCoins != 0 {
		t.Fatalf("creator should be clawed to 0, got %d", wc3.PurchasedCoins)
	}
	ok, _ := svc.CheckEntitlement(ctx, buyer, res.Purchase.ChapterID)
	if ok {
		t.Fatal("entitlement should be revoked")
	}

	// Re-purchase after reversal exercises the already-entitled + rebuy path.
	if _, err := svc.PurchaseChapter(ctx, commerce.PurchaseRequest{
		UserID: buyer, StoryID: "story-1", ChapterID: res.Purchase.ChapterID,
		Price:          40,
		CreatorSplits:  []commerce.CreatorSplit{{CreatorID: creator, Percentage: 100}},
		IdempotencyKey: uniq("rebuy"),
	}); err != nil {
		t.Fatalf("rebuy after reversal: %v", err)
	}
	if ents := svc.ListEntitlements(ctx, buyer); len(ents) != 1 {
		t.Fatalf("expected 1 entitlement after rebuy, got %d", len(ents))
	}
	if total, list := svc.GetCreatorEarnings(ctx, creator); total <= 0 || len(list) == 0 {
		t.Fatalf("expected creator earnings after rebuy, got %d across %d", total, len(list))
	}
	// Second reversal is a no-op (idempotent).
	if err := svc.ReversePurchaseOnTakedown(ctx, res.Purchase.ID, uniq("td2")); err != nil {
		t.Fatalf("second reversal: %v", err)
	}
}

// TestPG_Contract_NoDoubleSpend hammers one wallet from 50 goroutines.
func TestPG_Contract_NoDoubleSpend(t *testing.T) {
	ctx := context.Background()
	svc := pgService(t)
	buyer := uniq("pg-race")
	if _, err := svc.TopUp(ctx, buyer, 50, commerce.CoinPurchased, "pay", uniq("topup")); err != nil {
		t.Fatalf("TopUp: %v", err)
	}
	var ok, fail atomic.Int64
	var wg sync.WaitGroup
	for i := range 50 {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, err := svc.PurchaseChapter(ctx, commerce.PurchaseRequest{
				UserID: buyer, StoryID: "story-race", ChapterID: fmt.Sprintf("chap-%d-%d", time.Now().UnixNano(), i),
				Price:          50,
				CreatorSplits:  []commerce.CreatorSplit{{CreatorID: "creator-race", Percentage: 100}},
				IdempotencyKey: "",
			})
			if err == nil {
				ok.Add(1)
			} else {
				fail.Add(1)
			}
		}(i)
	}
	wg.Wait()
	if ok.Load() != 1 || fail.Load() != 49 {
		t.Fatalf("expected 1 ok / 49 fail, got %d / %d", ok.Load(), fail.Load())
	}
	w, _ := svc.GetWallet(ctx, buyer)
	if w.PurchasedCoins != 0 {
		t.Fatalf("expected 0 left, got %d", w.PurchasedCoins)
	}
}
