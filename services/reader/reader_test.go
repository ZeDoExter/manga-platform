package reader_test

import (
	"context"
	"testing"

	"manga-platform/pkg/imagestore"
	"manga-platform/services/catalog"
	"manga-platform/services/commerce"
	"manga-platform/services/identity"
	"manga-platform/services/reader"
)

var testSecret = []byte("reader-test-hmac-secret-32-bytes")

func setupTestServices(t *testing.T) (*catalog.Service, *commerce.Service, *identity.Service, *reader.Service) {
	cat := catalog.NewService()
	com := commerce.NewService()
	id := identity.NewService()
	store := imagestore.NewMemoryStore("https://img.yourmanga.com", testSecret)
	rdr := reader.NewService(cat, com, id, store)
	return cat, com, id, rdr
}

func TestFR_R3_And_FR_R4_ReaderContentFlow(t *testing.T) {
	ctx := context.Background()
	cat, com, id, rdr := setupTestServices(t)

	// Create creator and user accounts
	creator, _ := id.SignUp(ctx, "creator@test.com", "pass123", identity.RoleUploader)
	readerUser, _ := id.SignUp(ctx, "reader@test.com", "pass123", identity.RoleUser)
	admin, _ := id.SignUp(ctx, "admin@test.com", "pass123", identity.RoleAdmin)

	// Create story
	splits := []catalog.CreatorSplit{{CreatorID: creator.ID, Percentage: 100}}
	story, err := cat.CreateStory(ctx, creator.ID, catalog.StoryTypeManga, "One Piece Clone", "Epic story", []string{"Action"}, splits)
	if err != nil {
		t.Fatalf("CreateStory failed: %v", err)
	}

	// Create Free Chapter (Price = 0)
	freeChap, _ := cat.CreateChapter(ctx, story.ID, 1, "Chapter 1: Free", 0, []string{"stories/1/ch1/p1.webp", "stories/1/ch1/p2.webp"}, "", nil)

	// Create Paid Chapter (Price = 50 coins)
	paidChap, _ := cat.CreateChapter(ctx, story.ID, 2, "Chapter 2: Paid", 50, []string{"stories/1/ch2/p1.webp"}, "", nil)

	// 1. Guest reads free chapter -> SUCCESS, AdPolicy = Inline (FR-X1, FR-X3)
	resp, err := rdr.ReadChapter(ctx, reader.ReadChapterRequest{
		UserID:    "",
		Role:      identity.RoleGuest,
		ChapterID: freeChap.ID,
	})
	if err != nil {
		t.Fatalf("Guest reading free chapter failed: %v", err)
	}
	if resp.AdPolicy != reader.AdPolicyInline {
		t.Errorf("expected inline ads for guest, got %s", resp.AdPolicy)
	}
	if len(resp.PageSignedURLs) != 2 {
		t.Fatalf("expected 2 signed page URLs, got %d", len(resp.PageSignedURLs))
	}

	// 2. Guest reads coin-locked chapter -> REJECTED (ErrLoginRequired FR-X1)
	_, err = rdr.ReadChapter(ctx, reader.ReadChapterRequest{
		UserID:    "",
		Role:      identity.RoleGuest,
		ChapterID: paidChap.ID,
	})
	if err != reader.ErrLoginRequired {
		t.Fatalf("expected ErrLoginRequired, got %v", err)
	}

	// 3. Logged-in user without purchasing reads coin-locked chapter -> REJECTED (ErrPaymentRequired FR-R3)
	_, err = rdr.ReadChapter(ctx, reader.ReadChapterRequest{
		UserID:    readerUser.ID,
		Role:      identity.RoleUser,
		ChapterID: paidChap.ID,
	})
	if err != reader.ErrPaymentRequired {
		t.Fatalf("expected ErrPaymentRequired, got %v", err)
	}

	// 4. Creator reads own paid chapter -> SUCCESS without buying (FR-X2)!
	creatorResp, err := rdr.ReadChapter(ctx, reader.ReadChapterRequest{
		UserID:    creator.ID,
		Role:      identity.RoleUploader,
		ChapterID: paidChap.ID,
	})
	if err != nil {
		t.Fatalf("Creator reading own paid chapter failed: %v", err)
	}
	if creatorResp.ChapterID != paidChap.ID {
		t.Errorf("chapter ID mismatch")
	}

	// 5. Admin reads paid chapter -> SUCCESS with AdPolicyNone (FR-X3)
	adminResp, err := rdr.ReadChapter(ctx, reader.ReadChapterRequest{
		UserID:    admin.ID,
		Role:      identity.RoleAdmin,
		ChapterID: paidChap.ID,
	})
	if err != nil {
		t.Fatalf("Admin reading paid chapter failed: %v", err)
	}
	if adminResp.AdPolicy != reader.AdPolicyNone {
		t.Errorf("expected zero ads for admin, got %s", adminResp.AdPolicy)
	}

	// 6. User purchases chapter via Commerce, then reads -> SUCCESS!
	// Top up reader with 100 coins
	_, _ = com.TopUp(ctx, readerUser.ID, 100, commerce.CoinPurchased, "pay-reader", "idem-topup-read")

	// Purchase chapter
	comSplits := []commerce.CreatorSplit{{CreatorID: creator.ID, Percentage: 100}}
	_, err = com.PurchaseChapter(ctx, commerce.PurchaseRequest{
		UserID:         readerUser.ID,
		StoryID:        story.ID,
		ChapterID:      paidChap.ID,
		Price:          50,
		CreatorSplits:  comSplits,
		IdempotencyKey: "buy-paid-chap",
	})
	if err != nil {
		t.Fatalf("PurchaseChapter failed: %v", err)
	}

	// Read chapter now that entitlement exists
	userResp, err := rdr.ReadChapter(ctx, reader.ReadChapterRequest{
		UserID:    readerUser.ID,
		Role:      identity.RoleUser,
		ChapterID: paidChap.ID,
	})
	if err != nil {
		t.Fatalf("User reading purchased chapter failed: %v", err)
	}
	if userResp.AdPolicy != reader.AdPolicyBanner {
		t.Errorf("expected banner ad policy for user, got %s", userResp.AdPolicy)
	}
	if len(userResp.PageSignedURLs) != 1 {
		t.Fatalf("expected 1 signed URL, got %d", len(userResp.PageSignedURLs))
	}

	// 7. Chapter taken down by moderation -> REJECTED (ErrContentUnavailable FR-D2)
	_ = cat.SetChapterStatus(ctx, paidChap.ID, catalog.StatusTakenDown)
	_, err = rdr.ReadChapter(ctx, reader.ReadChapterRequest{
		UserID:    readerUser.ID,
		Role:      identity.RoleUser,
		ChapterID: paidChap.ID,
	})
	if err != reader.ErrContentUnavailable {
		t.Fatalf("expected ErrContentUnavailable after takedown, got %v", err)
	}
}
