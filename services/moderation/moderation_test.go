package moderation_test

import (
	"bytes"
	"context"
	"testing"

	"manga-platform/pkg/imagestore"
	"manga-platform/services/catalog"
	"manga-platform/services/commerce"
	"manga-platform/services/identity"
	"manga-platform/services/moderation"
)

var testSecret = []byte("moderation-test-secret-32-bytes")

func TestFR_D2_And_FR_M6_ModerationTakedownWorkflow(t *testing.T) {
	ctx := context.Background()

	cat := catalog.NewService()
	com := commerce.NewService()
	id := identity.NewService()
	store := imagestore.NewMemoryStore("https://img.yourmanga.com", testSecret)
	mod := moderation.NewService(cat, com, id, store)

	admin, _ := id.SignUp(ctx, "admin@test.com", "pass123", identity.RoleAdmin)
	creator, _ := id.SignUp(ctx, "creator@test.com", "pass123", identity.RoleUploader)
	buyer, _ := id.SignUp(ctx, "buyer@test.com", "pass123", identity.RoleUser)

	// Upload page image to store
	pageKey := "stories/infringing/ch1/p1.webp"
	_ = store.Put(ctx, pageKey, bytes.NewReader([]byte("fake-image")), 10, "image/webp")

	// Create story and chapter
	story, _ := cat.CreateStory(ctx, creator.ID, catalog.StoryTypeManga, "Infringing Comic", "test", []string{"Drama"}, []catalog.CreatorSplit{{CreatorID: creator.ID, Percentage: 100}})
	chap, _ := cat.CreateChapter(ctx, story.ID, 1, "Chapter 1", 40, []string{pageKey}, "", nil)

	// Buyer purchases chapter
	_, _ = com.TopUp(ctx, buyer.ID, 100, commerce.CoinPurchased, "pay-1", "idem-b-1")
	purchRes, err := com.PurchaseChapter(ctx, commerce.PurchaseRequest{
		UserID:         buyer.ID,
		StoryID:        story.ID,
		ChapterID:      chap.ID,
		Price:          40,
		CreatorSplits:  []commerce.CreatorSplit{{CreatorID: creator.ID, Percentage: 100}},
		IdempotencyKey: "buy-infringing",
	})
	if err != nil {
		t.Fatalf("purchase failed: %v", err)
	}

	// Verify pre-takedown state (platform takes 30% first: creator gets 70% of 40 = 28)
	buyerWallet, _ := com.GetWallet(ctx, buyer.ID)
	creatorWallet, _ := com.GetWallet(ctx, creator.ID)
	if buyerWallet.PurchasedCoins != 60 || creatorWallet.PurchasedCoins != 28 {
		t.Fatalf("unexpected balance before takedown: buyer=%d, creator=%d", buyerWallet.PurchasedCoins, creatorWallet.PurchasedCoins)
	}

	// Admin executes takedown (FR-D2 + FR-M6)
	err = mod.TakedownChapter(ctx, admin.ID, chap.ID, "DMCA Copyright Infringement Notice #101", []string{purchRes.Purchase.ID})
	if err != nil {
		t.Fatalf("TakedownChapter failed: %v", err)
	}

	// 1. Verify chapter is StatusTakenDown (FR-D1)
	chapAfter, _ := cat.GetChapter(ctx, chap.ID)
	if chapAfter.Status != catalog.StatusTakenDown {
		t.Errorf("expected chapter status taken_down, got %s", chapAfter.Status)
	}

	// 2. Verify image deleted from store (ADR-001)
	_, err = store.Get(ctx, pageKey)
	if err != imagestore.ErrNotFound {
		t.Errorf("expected image to be deleted from store, got %v", err)
	}

	// 3. Verify buyer refunded and creator clawed back (FR-M6)
	buyerWalletAfter, _ := com.GetWallet(ctx, buyer.ID)
	creatorWalletAfter, _ := com.GetWallet(ctx, creator.ID)
	if buyerWalletAfter.PurchasedCoins != 100 {
		t.Errorf("expected buyer refunded back to 100 coins, got %d", buyerWalletAfter.PurchasedCoins)
	}
	if creatorWalletAfter.PurchasedCoins != 0 {
		t.Errorf("expected creator clawed back to 0 coins, got %d", creatorWalletAfter.PurchasedCoins)
	}

	// 4. Verify audit log entry (FR-D4)
	logs := mod.GetAuditLogs(ctx)
	if len(logs) != 1 {
		t.Fatalf("expected 1 audit log entry, got %d", len(logs))
	}
	if logs[0].Action != "chapter_takedown" || logs[0].TargetID != chap.ID {
		t.Errorf("unexpected audit log entry: %+v", logs[0])
	}
}

func TestFR_D3_BanUserWithAudit(t *testing.T) {
	ctx := context.Background()
	cat := catalog.NewService()
	com := commerce.NewService()
	id := identity.NewService()
	store := imagestore.NewMemoryStore("https://img.yourmanga.com", testSecret)
	mod := moderation.NewService(cat, com, id, store)

	admin, _ := id.SignUp(ctx, "admin@test.com", "pass123", identity.RoleAdmin)
	spammer, _ := id.SignUp(ctx, "spammer@test.com", "pass123", identity.RoleUser)

	err := mod.BanUser(ctx, admin.ID, spammer.ID, "Spam bot behavior detected")
	if err != nil {
		t.Fatalf("BanUser failed: %v", err)
	}

	// Verify user cannot login
	_, err = id.Login(ctx, "spammer@test.com", "pass123")
	if err != identity.ErrUserBanned {
		t.Errorf("expected ErrUserBanned, got %v", err)
	}

	// Verify audit log
	logs := mod.GetAuditLogs(ctx)
	if len(logs) != 1 || logs[0].Action != "user_ban" {
		t.Errorf("audit log not properly recorded: %+v", logs)
	}
}
