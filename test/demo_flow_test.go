package test

import (
	"bytes"
	"context"
	"testing"

	"manga-platform/pkg/imagestore"
	"manga-platform/services/catalog"
	"manga-platform/services/commerce"
	"manga-platform/services/identity"
	"manga-platform/services/moderation"
	"manga-platform/services/reader"
)

var demoSecret = []byte("demo-full-e2e-hmac-secret-32-byte")

// TestDemoDefinitionOfDone_CompleteFlow validates item 1 in docs/00-goals-as-is-to-be.md:
// "Guest reads a free chapter -> signs up -> tops up coins (test-mode payment)
// -> buys a coin-locked chapter -> creator's earned-revenue ledger reflects the sale
// -> Admin takes the chapter down -> revenue for that sale is reversed and the buyer's coins are refunded."
func TestDemoDefinitionOfDone_CompleteFlow(t *testing.T) {
	ctx := context.Background()

	// Initialize all decoupled platform components
	store := imagestore.NewMemoryStore("https://img.yourmanga.com", demoSecret)
	cat := catalog.NewService()
	com := commerce.NewService()
	id := identity.NewService()
	rdr := reader.NewService(cat, com, id, store)
	mod := moderation.NewService(cat, com, id, store)

	// Step 0: Seed Creators (Author & Artist) and Admin
	author, err := id.SignUp(ctx, "author@manga.com", "pass123", identity.RoleUploader)
	if err != nil {
		t.Fatalf("author signup failed: %v", err)
	}
	artist, _ := id.SignUp(ctx, "artist@manga.com", "pass123", identity.RoleUploader)
	admin, _ := id.SignUp(ctx, "admin@platform.com", "pass123", identity.RoleAdmin)

	// Seed Story & Pages in Object Storage (R2/ImageStore)
	page1Key := "stories/demo/ch1/p1.webp"
	page2Key := "stories/demo/ch2/p1.webp"
	_ = store.Put(ctx, page1Key, bytes.NewReader([]byte("image-data-1")), 12, "image/webp")
	_ = store.Put(ctx, page2Key, bytes.NewReader([]byte("image-data-2")), 12, "image/webp")

	splits := []catalog.CreatorSplit{
		{CreatorID: author.ID, Percentage: 70},
		{CreatorID: artist.ID, Percentage: 30},
	}
	story, err := cat.CreateStory(ctx, author.ID, catalog.StoryTypeManga, "Demon Slayer Gaiden", "Epic series", []string{"Action"}, splits)
	if err != nil {
		t.Fatalf("CreateStory failed: %v", err)
	}

	freeChap, _ := cat.CreateChapter(ctx, story.ID, 1, "Chapter 1: The Beginning", 0, []string{page1Key}, "", nil)
	lockedChap, _ := cat.CreateChapter(ctx, story.ID, 2, "Chapter 2: The Battle", 40, []string{page2Key}, "", nil)

	// ==========================================
	// 1. Guest reads a free chapter
	// ==========================================
	guestResp, err := rdr.ReadChapter(ctx, reader.ReadChapterRequest{
		UserID:    "",
		Role:      identity.RoleGuest,
		ChapterID: freeChap.ID,
	})
	if err != nil {
		t.Fatalf("Step 1 Failed: guest cannot read free chapter: %v", err)
	}
	if guestResp.AdPolicy != reader.AdPolicyInline {
		t.Errorf("Step 1 Failed: expected inline ads for guest, got %s", guestResp.AdPolicy)
	}
	if len(guestResp.PageSignedURLs) != 1 {
		t.Errorf("Step 1 Failed: expected 1 signed page URL, got %d", len(guestResp.PageSignedURLs))
	}

	// ==========================================
	// 2. Guest signs up -> becomes User (Alice)
	// ==========================================
	alice, err := id.SignUp(ctx, "alice@reader.com", "securePassword123", identity.RoleUser)
	if err != nil {
		t.Fatalf("Step 2 Failed: signup failed: %v", err)
	}

	aliceSession, err := id.Login(ctx, "alice@reader.com", "securePassword123")
	if err != nil {
		t.Fatalf("Step 2 Failed: login failed: %v", err)
	}

	// ==========================================
	// 3. Tops up coins (test-mode payment)
	// ==========================================
	// Webhook replay test: sent twice, credited once
	for range 2 {
		_, err = com.TopUp(ctx, alice.ID, 100, commerce.CoinPurchased, "gw-txn-98765", "idem-webhook-alice-100")
		if err != nil {
			t.Fatalf("Step 3 Failed: TopUp error: %v", err)
		}
	}

	aliceWallet, _ := com.GetWallet(ctx, alice.ID)
	if aliceWallet.PurchasedCoins != 100 {
		t.Fatalf("Step 3 Failed: expected 100 coins in Alice wallet, got %d", aliceWallet.PurchasedCoins)
	}

	// ==========================================
	// 4. Buys a coin-locked chapter
	// ==========================================
	comSplits := []commerce.CreatorSplit{
		{CreatorID: author.ID, Percentage: 70},
		{CreatorID: artist.ID, Percentage: 30},
	}
	purchRes, err := com.PurchaseChapter(ctx, commerce.PurchaseRequest{
		UserID:         alice.ID,
		StoryID:        story.ID,
		ChapterID:      lockedChap.ID,
		Price:          lockedChap.PriceCoins,
		CreatorSplits:  comSplits,
		IdempotencyKey: "alice-buy-ch2",
	})
	if err != nil {
		t.Fatalf("Step 4 Failed: PurchaseChapter failed: %v", err)
	}

	// ==========================================
	// 5. Creator's earned-revenue ledger reflects the sale
	// ==========================================
	// Alice debited 40 -> 60 remaining
	aliceWalletAfter, _ := com.GetWallet(ctx, alice.ID)
	if aliceWalletAfter.PurchasedCoins != 60 {
		t.Errorf("Step 5 Failed: expected Alice to have 60 coins, got %d", aliceWalletAfter.PurchasedCoins)
	}

	// Platform takes 30% first (12 coins), creators split the remaining 28:
	// Author (70% of 28 = 19 coins after integer division)
	authorWallet, _ := com.GetWallet(ctx, author.ID)
	if authorWallet.PurchasedCoins != 19 {
		t.Errorf("Step 5 Failed: expected Author to receive 19 coins, got %d", authorWallet.PurchasedCoins)
	}

	// Artist (30% of 28 = 8 coins after integer division)
	artistWallet, _ := com.GetWallet(ctx, artist.ID)
	if artistWallet.PurchasedCoins != 8 {
		t.Errorf("Step 5 Failed: expected Artist to receive 8 coins, got %d", artistWallet.PurchasedCoins)
	}

	// Alice reads Chapter 2 -> SUCCESS with banner ad policy
	readResp, err := rdr.ReadChapter(ctx, reader.ReadChapterRequest{
		UserID:    alice.ID,
		Role:      aliceSession.Role,
		ChapterID: lockedChap.ID,
	})
	if err != nil {
		t.Fatalf("Step 5 Failed: Alice reading purchased chapter failed: %v", err)
	}
	if readResp.AdPolicy != reader.AdPolicyBanner {
		t.Errorf("Step 5 Failed: expected banner ad policy for logged-in user, got %s", readResp.AdPolicy)
	}

	// ==========================================
	// 6. Admin takes the chapter down
	// ==========================================
	err = mod.TakedownChapter(ctx, admin.ID, lockedChap.ID, "Copyright Takedown Notice #9981", []string{purchRes.Purchase.ID})
	if err != nil {
		t.Fatalf("Step 6 Failed: TakedownChapter failed: %v", err)
	}

	// ==========================================
	// 7. Revenue for sale is reversed and buyer's coins are refunded
	// ==========================================
	// Alice refunded back to 100 coins
	aliceWalletRefunded, _ := com.GetWallet(ctx, alice.ID)
	if aliceWalletRefunded.PurchasedCoins != 100 {
		t.Errorf("Step 7 Failed: expected Alice refunded back to 100 coins, got %d", aliceWalletRefunded.PurchasedCoins)
	}

	// Author clawed back to 0
	authorWalletClawed, _ := com.GetWallet(ctx, author.ID)
	if authorWalletClawed.PurchasedCoins != 0 {
		t.Errorf("Step 7 Failed: expected Author clawed back to 0, got %d", authorWalletClawed.PurchasedCoins)
	}

	// Artist clawed back to 0
	artistWalletClawed, _ := com.GetWallet(ctx, artist.ID)
	if artistWalletClawed.PurchasedCoins != 0 {
		t.Errorf("Step 7 Failed: expected Artist clawed back to 0, got %d", artistWalletClawed.PurchasedCoins)
	}

	// Entitlement revoked and content blocked
	_, err = rdr.ReadChapter(ctx, reader.ReadChapterRequest{
		UserID:    alice.ID,
		Role:      aliceSession.Role,
		ChapterID: lockedChap.ID,
	})
	if err != reader.ErrContentUnavailable {
		t.Errorf("Step 7 Failed: expected ErrContentUnavailable after takedown, got %v", err)
	}

	// Image is purged from storage
	_, err = store.Get(ctx, page2Key)
	if err != imagestore.ErrNotFound {
		t.Errorf("Step 7 Failed: expected image to be deleted from ImageStore, got %v", err)
	}

	t.Log("SUCCESS: Full Demo Definition of Done verified end-to-end!")
}
