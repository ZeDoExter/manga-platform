package commerce_test

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"

	"manga-platform/services/commerce"
)

// TestB_A1_TopUpIdempotency_10xReplay verifies B-A1 acceptance:
// "replaying the same webhook 10 times credits coins once".
func TestB_A1_TopUpIdempotency_10xReplay(t *testing.T) {
	ctx := context.Background()
	svc := commerce.NewService()

	userID := "user-topup-1"
	idempotencyKey := "webhook-evt-unique-12345"
	topupAmount := int64(500)
	// Replay 10 times
	for i := range 10 {
		entry, err := svc.TopUp(ctx, userID, topupAmount, commerce.CoinPurchased, "pay-ref-001", idempotencyKey)
		if err != nil {
			t.Fatalf("iteration %d failed: %v", i, err)
		}
		if entry == nil {
			t.Fatalf("iteration %d returned nil entry", i)
		}
	}

	// Verify balance is credited exactly once (500, not 5000)
	w, err := svc.GetWallet(ctx, userID)
	if err != nil {
		t.Fatalf("GetWallet failed: %v", err)
	}

	if w.PurchasedCoins != 500 {
		t.Errorf("expected 500 purchased coins, got %d", w.PurchasedCoins)
	}
	if w.BonusCoins != 0 {
		t.Errorf("expected 0 bonus coins, got %d", w.BonusCoins)
	}
}

// TestFR_M3_PurchaseChapter_AtomicDebitAndEntitlement tests requirement FR-M3:
// "Buying a chapter = debit coins + grant entitlement + record creator earnings, atomically".
func TestFR_M3_PurchaseChapter_AtomicDebitAndEntitlement(t *testing.T) {
	ctx := context.Background()
	svc := commerce.NewService()

	buyerID := "buyer-1"
	creatorID := "creator-1"

	// Top up buyer with 100 purchased coins
	_, err := svc.TopUp(ctx, buyerID, 100, commerce.CoinPurchased, "pay-1", "idem-topup-buyer-1")
	if err != nil {
		t.Fatalf("TopUp failed: %v", err)
	}

	// Purchase chapter costing 30 coins with 100% split to creator-1
	req := commerce.PurchaseRequest{
		UserID:    buyerID,
		StoryID:   "story-10",
		ChapterID: "chap-1",
		Price:     30,
		CreatorSplits: []commerce.CreatorSplit{
			{CreatorID: creatorID, Percentage: 100},
		},
		IdempotencyKey: "idem-purchase-1",
	}

	res, err := svc.PurchaseChapter(ctx, req)
	if err != nil {
		t.Fatalf("PurchaseChapter failed: %v", err)
	}

	if res.Purchase.ID == "" {
		t.Error("expected non-empty purchase ID")
	}

	// Check buyer wallet (100 - 30 = 70)
	buyerWallet, _ := svc.GetWallet(ctx, buyerID)
	if buyerWallet.PurchasedCoins != 70 {
		t.Errorf("expected 70 coins remaining for buyer, got %d", buyerWallet.PurchasedCoins)
	}

	// Check creator wallet (0 + 30 = 30)
	creatorWallet, _ := svc.GetWallet(ctx, creatorID)
	if creatorWallet.PurchasedCoins != 30 {
		t.Errorf("expected 30 coins for creator, got %d", creatorWallet.PurchasedCoins)
	}

	// Check entitlement (FR-R3)
	entitled, err := svc.CheckEntitlement(ctx, buyerID, "chap-1")
	if err != nil {
		t.Fatalf("CheckEntitlement failed: %v", err)
	}
	if !entitled {
		t.Error("expected buyer to be entitled to chapter")
	}
}

// TestFR_M4_CreatorEarningsSplit tests requirement FR-M4:
// "Split earnings among a story's creator team per their percentages".
func TestFR_M4_CreatorEarningsSplit(t *testing.T) {
	ctx := context.Background()
	svc := commerce.NewService()

	buyerID := "buyer-split"
	authorID := "author-1"
	artistID := "artist-1"

	// Buyer has 100 coins
	_, _ = svc.TopUp(ctx, buyerID, 100, commerce.CoinPurchased, "pay-split", "idem-buyer-split")

	// Story team has 70% author, 30% artist
	req := commerce.PurchaseRequest{
		UserID:    buyerID,
		StoryID:   "collab-story",
		ChapterID: "chap-split-1",
		Price:     50,
		CreatorSplits: []commerce.CreatorSplit{
			{CreatorID: authorID, Percentage: 70},
			{CreatorID: artistID, Percentage: 30},
		},
		IdempotencyKey: "idem-split-purch",
	}

	res, err := svc.PurchaseChapter(ctx, req)
	if err != nil {
		t.Fatalf("Purchase failed: %v", err)
	}

	if len(res.Earnings) != 2 {
		t.Fatalf("expected 2 earnings records, got %d", len(res.Earnings))
	}

	// Author gets 70% of 50 = 35 coins
	authorWallet, _ := svc.GetWallet(ctx, authorID)
	if authorWallet.PurchasedCoins != 35 {
		t.Errorf("expected author to get 35 coins, got %d", authorWallet.PurchasedCoins)
	}

	// Artist gets 30% of 50 = 15 coins
	artistWallet, _ := svc.GetWallet(ctx, artistID)
	if artistWallet.PurchasedCoins != 15 {
		t.Errorf("expected artist to get 15 coins, got %d", artistWallet.PurchasedCoins)
	}
}

// TestFR_E5_BonusCoinsNeverCountAsCreatorRevenue tests requirement FR-E5:
// "Bonus coins never count as creator revenue".
func TestFR_E5_BonusCoinsNeverCountAsCreatorRevenue(t *testing.T) {
	ctx := context.Background()
	svc := commerce.NewService()

	buyerID := "buyer-promo"
	creatorID := "creator-promo"

	// Buyer gets 50 bonus coins from daily check-in (FR-E5)
	_, _ = svc.TopUp(ctx, buyerID, 50, commerce.CoinBonus, "daily-checkin", "checkin-day-1")

	// Purchase a 30-coin chapter with 100% bonus coins
	req := commerce.PurchaseRequest{
		UserID:    buyerID,
		StoryID:   "story-bonus",
		ChapterID: "chap-bonus-1",
		Price:     30,
		CreatorSplits: []commerce.CreatorSplit{
			{CreatorID: creatorID, Percentage: 100},
		},
		IdempotencyKey: "idem-bonus-purch",
	}

	res, err := svc.PurchaseChapter(ctx, req)
	if err != nil {
		t.Fatalf("Purchase failed: %v", err)
	}

	// Buyer should have 20 bonus coins left
	buyerWallet, _ := svc.GetWallet(ctx, buyerID)
	if buyerWallet.BonusCoins != 20 {
		t.Errorf("expected 20 bonus coins, got %d", buyerWallet.BonusCoins)
	}

	// Creator must receive 0 earnings because purchase was funded by bonus coins!
	if len(res.Earnings) != 0 {
		t.Errorf("expected 0 earnings generated from bonus coins, got %d", len(res.Earnings))
	}

	creatorWallet, _ := svc.GetWallet(ctx, creatorID)
	if creatorWallet.PurchasedCoins != 0 {
		t.Errorf("expected creator to receive 0 coins, got %d", creatorWallet.PurchasedCoins)
	}

	// But buyer IS entitled to read
	entitled, _ := svc.CheckEntitlement(ctx, buyerID, "chap-bonus-1")
	if !entitled {
		t.Error("buyer should be entitled to read after purchasing with bonus coins")
	}
}

// TestNFR_Money1_InsufficientBalanceRejected tests NFR-Money-1:
// "wallet balance never goes negative".
func TestNFR_Money1_InsufficientBalanceRejected(t *testing.T) {
	ctx := context.Background()
	svc := commerce.NewService()

	buyerID := "poor-buyer"
	_, _ = svc.TopUp(ctx, buyerID, 10, commerce.CoinPurchased, "pay-poor", "topup-poor")

	// Try to buy chapter costing 50 coins
	req := commerce.PurchaseRequest{
		UserID:    buyerID,
		StoryID:   "story-expensive",
		ChapterID: "chap-exp-1",
		Price:     50,
		CreatorSplits: []commerce.CreatorSplit{
			{CreatorID: "creator-x", Percentage: 100},
		},
		IdempotencyKey: "idem-exp-purch",
	}

	_, err := svc.PurchaseChapter(ctx, req)
	if err != commerce.ErrInsufficientBalance {
		t.Fatalf("expected ErrInsufficientBalance, got %v", err)
	}

	// Balance must still be 10, not -40
	w, _ := svc.GetWallet(ctx, buyerID)
	if w.PurchasedCoins != 10 {
		t.Errorf("expected 10 coins, got %d", w.PurchasedCoins)
	}

	// Entitlement must not be granted
	entitled, _ := svc.CheckEntitlement(ctx, buyerID, "chap-exp-1")
	if entitled {
		t.Error("entitlement must not be granted when balance is insufficient")
	}
}

// TestFR_M6_TakedownReversalWorkflow tests requirement FR-M6 & FR-D2:
// "Takedown triggers reversal: refund buyer coins, claw back creator earnings".
func TestFR_M6_TakedownReversalWorkflow(t *testing.T) {
	ctx := context.Background()
	svc := commerce.NewService()

	buyerID := "buyer-takedown"
	creatorID := "creator-takedown"

	// Buyer has 50 purchased coins
	_, _ = svc.TopUp(ctx, buyerID, 50, commerce.CoinPurchased, "pay-td", "topup-td")

	// Purchase chapter for 30 coins
	req := commerce.PurchaseRequest{
		UserID:    buyerID,
		StoryID:   "infringing-story",
		ChapterID: "infringing-chap-1",
		Price:     30,
		CreatorSplits: []commerce.CreatorSplit{
			{CreatorID: creatorID, Percentage: 100},
		},
		IdempotencyKey: "purchase-td-1",
	}

	res, err := svc.PurchaseChapter(ctx, req)
	if err != nil {
		t.Fatalf("Purchase failed: %v", err)
	}

	// Buyer has 20, creator has 30, buyer is entitled
	wBuyer, _ := svc.GetWallet(ctx, buyerID)
	wCreator, _ := svc.GetWallet(ctx, creatorID)
	if wBuyer.PurchasedCoins != 20 || wCreator.PurchasedCoins != 30 {
		t.Fatalf("pre-takedown balance wrong: buyer=%d, creator=%d", wBuyer.PurchasedCoins, wCreator.PurchasedCoins)
	}

	// Admin executes takedown (FR-D2 + FR-M6)
	err = svc.ReversePurchaseOnTakedown(ctx, res.Purchase.ID, "takedown-case-999")
	if err != nil {
		t.Fatalf("ReversePurchaseOnTakedown failed: %v", err)
	}

	// Verify buyer refunded back to 50 coins
	wBuyerAfter, _ := svc.GetWallet(ctx, buyerID)
	if wBuyerAfter.PurchasedCoins != 50 {
		t.Errorf("expected buyer refunded to 50 coins, got %d", wBuyerAfter.PurchasedCoins)
	}

	// Verify creator earnings clawed back to 0 coins
	wCreatorAfter, _ := svc.GetWallet(ctx, creatorID)
	if wCreatorAfter.PurchasedCoins != 0 {
		t.Errorf("expected creator clawed back to 0 coins, got %d", wCreatorAfter.PurchasedCoins)
	}

	// Verify entitlement revoked
	entitled, _ := svc.CheckEntitlement(ctx, buyerID, "infringing-chap-1")
	if entitled {
		t.Error("expected entitlement to be revoked after takedown reversal")
	}

	// Idempotency: calling reversal again does not double-refund or double-clawback
	err = svc.ReversePurchaseOnTakedown(ctx, res.Purchase.ID, "takedown-case-999")
	if err != nil {
		t.Fatalf("second reversal call failed: %v", err)
	}

	wBuyerSecond, _ := svc.GetWallet(ctx, buyerID)
	if wBuyerSecond.PurchasedCoins != 50 {
		t.Errorf("expected buyer coins to remain 50 after second reversal call, got %d", wBuyerSecond.PurchasedCoins)
	}
}

// TestNFR_Money1_ConcurrentPurchases_NoDoubleSpend tests NFR-Money-1 under concurrent load.
func TestNFR_Money1_ConcurrentPurchases_NoDoubleSpend(t *testing.T) {
	ctx := context.Background()
	svc := commerce.NewService()

	buyerID := "concurrent-buyer"
	// User only has 50 coins
	_, _ = svc.TopUp(ctx, buyerID, 50, commerce.CoinPurchased, "pay-conc", "topup-conc")

	var successCount int64
	var failCount int64
	var wg sync.WaitGroup

	// 50 goroutines try to buy chapters costing 50 coins each simultaneously
	for i := range 50 {
		wg.Add(1)
		go func(chapIdx int) {
			defer wg.Done()
			req := commerce.PurchaseRequest{
				UserID:    buyerID,
				StoryID:   "story-race",
				ChapterID: "chap-race-" + string(rune('A'+chapIdx)),
				Price:     50,
				CreatorSplits: []commerce.CreatorSplit{
					{CreatorID: "creator-race", Percentage: 100},
				},
				IdempotencyKey: "",
			}
			_, err := svc.PurchaseChapter(ctx, req)
			if err == nil {
				atomic.AddInt64(&successCount, 1)
			} else {
				atomic.AddInt64(&failCount, 1)
			}
		}(i)
	}

	wg.Wait()

	if successCount != 1 {
		t.Fatalf("expected exactly 1 purchase to succeed, got %d", successCount)
	}
	if failCount != 49 {
		t.Fatalf("expected 49 purchases to fail due to insufficient balance, got %d", failCount)
	}

	// Balance must be 0, never negative
	w, _ := svc.GetWallet(ctx, buyerID)
	if w.PurchasedCoins != 0 {
		t.Errorf("expected 0 coins left, got %d", w.PurchasedCoins)
	}
}

// TestFR_X2_PurchasedChaptersStayUnlocked_NoDoubleCharge tests FR-X2:
// "Purchased chapters stay unlocked forever; re-purchasing does not double charge".
func TestFR_X2_PurchasedChaptersStayUnlocked_NoDoubleCharge(t *testing.T) {
	ctx := context.Background()
	svc := commerce.NewService()

	buyerID := "repeat-buyer"
	_, _ = svc.TopUp(ctx, buyerID, 100, commerce.CoinPurchased, "pay-repeat", "topup-repeat")

	req := commerce.PurchaseRequest{
		UserID:    buyerID,
		StoryID:   "story-repeat",
		ChapterID: "chap-repeat-1",
		Price:     40,
		CreatorSplits: []commerce.CreatorSplit{
			{CreatorID: "creator-rep", Percentage: 100},
		},
		IdempotencyKey: "first-buy",
	}

	// First purchase
	res1, err := svc.PurchaseChapter(ctx, req)
	if err != nil {
		t.Fatalf("first purchase failed: %v", err)
	}

	w1, _ := svc.GetWallet(ctx, buyerID)
	if w1.PurchasedCoins != 60 {
		t.Fatalf("expected 60 coins after first purchase, got %d", w1.PurchasedCoins)
	}

	// Second purchase of the SAME chapter
	req2 := req
	req2.IdempotencyKey = "second-buy-attempt"
	res2, err := svc.PurchaseChapter(ctx, req2)
	if err != nil {
		t.Fatalf("second purchase failed: %v", err)
	}

	if res2.Purchase.ID != res1.Purchase.ID {
		t.Errorf("expected same purchase ID returned, got %s vs %s", res2.Purchase.ID, res1.Purchase.ID)
	}

	w2, _ := svc.GetWallet(ctx, buyerID)
	if w2.PurchasedCoins != 60 {
		t.Errorf("expected balance to stay 60 (no double charge), got %d", w2.PurchasedCoins)
	}
}
