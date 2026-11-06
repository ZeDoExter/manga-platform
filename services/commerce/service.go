package commerce

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sort"
	"sync"
	"time"
)

// PurchaseRequest contains the inputs required to unlock a chapter.
type PurchaseRequest struct {
	UserID         string
	StoryID        string
	ChapterID      string
	Price          int64
	CreatorSplits  []CreatorSplit
	IdempotencyKey string
}

// PurchaseResult contains the outcome of a successful purchase transaction.
type PurchaseResult struct {
	Purchase    *Purchase         `json:"purchase"`
	Entitlement *Entitlement      `json:"entitlement"`
	Earnings    []*CreatorEarning `json:"earnings"`
}

// Service provides ACID, idempotent commerce operations (FR-M1..M4, FR-M6, NFR-Money-1).
type Service struct {
	mu           sync.Mutex
	ledgers      map[string]*LedgerEntry      // key: idempotency_key
	ledgerList   []*LedgerEntry               // append-only log
	wallets      map[string]*Wallet           // key: user_id
	purchases    map[string]*Purchase         // key: purchase_id
	purchasesKey map[string]*Purchase         // key: user_id + ":" + chapter_id
	entitlements map[string]*Entitlement      // key: user_id + ":" + chapter_id
	earnings     map[string][]*CreatorEarning // key: purchase_id
}

// NewService creates a new in-memory transactional commerce service.
func NewService() *Service {
	return &Service{
		ledgers:      make(map[string]*LedgerEntry),
		ledgerList:   make([]*LedgerEntry, 0),
		wallets:      make(map[string]*Wallet),
		purchases:    make(map[string]*Purchase),
		purchasesKey: make(map[string]*Purchase),
		entitlements: make(map[string]*Entitlement),
		earnings:     make(map[string][]*CreatorEarning),
	}
}

func generateID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return prefix + "_" + hex.EncodeToString(b)
}

func (s *Service) getOrCreateWallet(userID string) *Wallet {
	w, exists := s.wallets[userID]
	if !exists {
		w = &Wallet{UserID: userID}
		s.wallets[userID] = w
	}
	return w
}

// TopUp credits coins to a user's wallet with webhook idempotency (FR-M1, B-A1).
// Replaying the same idempotencyKey 10 times will return the existing entry without double-crediting.
func (s *Service) TopUp(ctx context.Context, userID string, amount int64, coinType CoinType, refID, idempotencyKey string) (*LedgerEntry, error) {
	if amount <= 0 {
		return nil, ErrInvalidAmount
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Idempotency check: if key already exists, return existing entry (B-A1 acceptance criteria)
	if existing, found := s.ledgers[idempotencyKey]; found {
		return existing, nil
	}

	entry := &LedgerEntry{
		ID:             generateID("ledge"),
		UserID:         userID,
		Type:           LedgerTopUp,
		CoinType:       coinType,
		Amount:         amount,
		ReferenceID:    refID,
		IdempotencyKey: idempotencyKey,
		CreatedAt:      time.Now(),
	}

	// Append to ledger
	s.ledgers[idempotencyKey] = entry
	s.ledgerList = append(s.ledgerList, entry)

	// Apply to wallet
	w := s.getOrCreateWallet(userID)
	if coinType == CoinBonus {
		w.BonusCoins += amount
	} else {
		w.PurchasedCoins += amount
	}

	return entry, nil
}

// GetWallet returns current coin balances for a user.
func (s *Service) GetWallet(ctx context.Context, userID string) (Wallet, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	w := s.getOrCreateWallet(userID)
	return *w, nil
}

// PurchaseChapter executes an atomic, ACID transaction: debits coins, grants entitlement,
// and records creator earnings split (FR-M3, FR-M4, NFR-Money-1).
func (s *Service) PurchaseChapter(ctx context.Context, req PurchaseRequest) (*PurchaseResult, error) {
	if req.Price < 0 {
		return nil, ErrInvalidAmount
	}

	// Validate creator split percentages
	if len(req.CreatorSplits) > 0 {
		totalPct := 0
		for _, sp := range req.CreatorSplits {
			totalPct += sp.Percentage
		}
		if totalPct != 100 {
			return nil, ErrInvalidSplit
		}
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// 1. Idempotency check by key
	if req.IdempotencyKey != "" {
		if existingEntry, found := s.ledgers[req.IdempotencyKey]; found {
			// Find associated purchase
			purchase := s.purchases[existingEntry.ReferenceID]
			userChapKey := req.UserID + ":" + req.ChapterID
			ent := s.entitlements[userChapKey]
			earnings := s.earnings[purchase.ID]
			return &PurchaseResult{
				Purchase:    purchase,
				Entitlement: ent,
				Earnings:    earnings,
			}, nil
		}
	}

	// 2. Check if already purchased/entitled
	userChapKey := req.UserID + ":" + req.ChapterID
	if ent, found := s.entitlements[userChapKey]; found && ent.RevokedAt == nil {
		purchase := s.purchasesKey[userChapKey]
		return &PurchaseResult{
			Purchase:    purchase,
			Entitlement: ent,
			Earnings:    s.earnings[purchase.ID],
		}, nil
	}

	w := s.getOrCreateWallet(req.UserID)
	if w.Total() < req.Price {
		return nil, ErrInsufficientBalance
	}

	// 3. Compute debit allocation: spend bonus coins first, then purchased coins
	bonusToDebit := int64(0)
	purchasedToDebit := int64(0)

	if w.BonusCoins >= req.Price {
		bonusToDebit = req.Price
	} else {
		bonusToDebit = w.BonusCoins
		purchasedToDebit = req.Price - bonusToDebit
	}

	if w.PurchasedCoins < purchasedToDebit {
		return nil, ErrInsufficientBalance
	}

	// --- BEGIN ATOMIC MUTATIONS (In-memory transaction boundary) ---
	purchaseID := generateID("purch")

	// Debit bonus coins
	if bonusToDebit > 0 {
		w.BonusCoins -= bonusToDebit
		debitEntry := &LedgerEntry{
			ID:             generateID("ledge"),
			UserID:         req.UserID,
			Type:           LedgerPurchaseDebit,
			CoinType:       CoinBonus,
			Amount:         -bonusToDebit,
			ReferenceID:    purchaseID,
			IdempotencyKey: fmt.Sprintf("%s:bonus", req.IdempotencyKey),
			CreatedAt:      time.Now(),
		}
		s.ledgerList = append(s.ledgerList, debitEntry)
	}

	// Debit purchased coins
	if purchasedToDebit > 0 {
		w.PurchasedCoins -= purchasedToDebit
		debitEntry := &LedgerEntry{
			ID:             generateID("ledge"),
			UserID:         req.UserID,
			Type:           LedgerPurchaseDebit,
			CoinType:       CoinPurchased,
			Amount:         -purchasedToDebit,
			ReferenceID:    purchaseID,
			IdempotencyKey: fmt.Sprintf("%s:purchased", req.IdempotencyKey),
			CreatedAt:      time.Now(),
		}
		s.ledgerList = append(s.ledgerList, debitEntry)
	}

	// Record master idempotency entry for this purchase
	if req.IdempotencyKey != "" {
		s.ledgers[req.IdempotencyKey] = &LedgerEntry{
			ID:             generateID("ledge"),
			UserID:         req.UserID,
			Type:           LedgerPurchaseDebit,
			CoinType:       CoinPurchased,
			Amount:         0,
			ReferenceID:    purchaseID,
			IdempotencyKey: req.IdempotencyKey,
			CreatedAt:      time.Now(),
		}
	}

	// Create purchase record
	purchase := &Purchase{
		ID:                    purchaseID,
		UserID:                req.UserID,
		StoryID:               req.StoryID,
		ChapterID:             req.ChapterID,
		TotalCoins:            req.Price,
		PurchasedCoinsDebited: purchasedToDebit,
		BonusCoinsDebited:     bonusToDebit,
		Status:                PurchaseActive,
		CreatedAt:             time.Now(),
	}
	s.purchases[purchaseID] = purchase
	s.purchasesKey[userChapKey] = purchase

	// Grant entitlement (FR-R3)
	entitlement := &Entitlement{
		ID:        generateID("ent"),
		UserID:    req.UserID,
		StoryID:   req.StoryID,
		ChapterID: req.ChapterID,
		GrantedAt: time.Now(),
	}
	s.entitlements[userChapKey] = entitlement

	// Split earnings among creator team (FR-M4): platform takes its fee first,
	// then the creators' split percentages divide the remaining 70%.
	// Note: Per FR-E5, bonus coins never count as creator revenue; only purchased coins generate payout.
	var earningsList []*CreatorEarning
	if purchasedToDebit > 0 && len(req.CreatorSplits) > 0 {
		feeCoins := (purchasedToDebit * PlatformFeePct) / 100
		creatorPool := purchasedToDebit - feeCoins
		if feeCoins > 0 {
			feeEntry := &LedgerEntry{
				ID:             generateID("ledge"),
				UserID:         req.UserID,
				Type:           LedgerPlatformFee,
				CoinType:       CoinPurchased,
				Amount:         feeCoins,
				ReferenceID:    purchaseID,
				IdempotencyKey: fmt.Sprintf("%s:platform", purchaseID),
				CreatedAt:      time.Now(),
			}
			s.ledgerList = append(s.ledgerList, feeEntry)
		}
		for _, split := range req.CreatorSplits {
			creatorCoins := (creatorPool * int64(split.Percentage)) / 100
			if creatorCoins > 0 {
				earning := &CreatorEarning{
					ID:          generateID("earn"),
					PurchaseID:  purchaseID,
					CreatorID:   split.CreatorID,
					StoryID:     req.StoryID,
					ChapterID:   req.ChapterID,
					CoinsEarned: creatorCoins,
					CreatedAt:   time.Now(),
				}
				earningsList = append(earningsList, earning)

				// Credit creator wallet and ledger
				creatorWallet := s.getOrCreateWallet(split.CreatorID)
				creatorWallet.PurchasedCoins += creatorCoins

				creatorEntry := &LedgerEntry{
					ID:             generateID("ledge"),
					UserID:         split.CreatorID,
					Type:           LedgerCreatorEarning,
					CoinType:       CoinPurchased,
					Amount:         creatorCoins,
					ReferenceID:    purchaseID,
					IdempotencyKey: fmt.Sprintf("%s:creator:%s", purchaseID, split.CreatorID),
					CreatedAt:      time.Now(),
				}
				s.ledgerList = append(s.ledgerList, creatorEntry)
			}
		}
	}
	s.earnings[purchaseID] = earningsList
	// --- END ATOMIC MUTATIONS ---

	return &PurchaseResult{
		Purchase:    purchase,
		Entitlement: entitlement,
		Earnings:    earningsList,
	}, nil
}

// ReversePurchaseOnTakedown handles content takedown refunds and clawbacks (FR-M6, FR-D2).
// Atomically revokes entitlement, refunds the buyer, and claws back creator earnings.
func (s *Service) ReversePurchaseOnTakedown(ctx context.Context, purchaseID string, takedownID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	purchase, found := s.purchases[purchaseID]
	if !found {
		return ErrPurchaseNotFound
	}
	if purchase.Status == PurchaseReversed {
		return nil // Idempotent: already reversed
	}

	// 1. Revoke entitlement
	userChapKey := purchase.UserID + ":" + purchase.ChapterID
	if ent, exists := s.entitlements[userChapKey]; exists {
		now := time.Now()
		ent.RevokedAt = &now
	}

	// 2. Refund buyer
	buyerWallet := s.getOrCreateWallet(purchase.UserID)
	if purchase.BonusCoinsDebited > 0 {
		buyerWallet.BonusCoins += purchase.BonusCoinsDebited
		refundEntry := &LedgerEntry{
			ID:             generateID("ledge"),
			UserID:         purchase.UserID,
			Type:           LedgerRefundCredit,
			CoinType:       CoinBonus,
			Amount:         purchase.BonusCoinsDebited,
			ReferenceID:    takedownID,
			IdempotencyKey: fmt.Sprintf("takedown:%s:refund_bonus:%s", takedownID, purchaseID),
			CreatedAt:      time.Now(),
		}
		s.ledgerList = append(s.ledgerList, refundEntry)
	}

	if purchase.PurchasedCoinsDebited > 0 {
		buyerWallet.PurchasedCoins += purchase.PurchasedCoinsDebited
		refundEntry := &LedgerEntry{
			ID:             generateID("ledge"),
			UserID:         purchase.UserID,
			Type:           LedgerRefundCredit,
			CoinType:       CoinPurchased,
			Amount:         purchase.PurchasedCoinsDebited,
			ReferenceID:    takedownID,
			IdempotencyKey: fmt.Sprintf("takedown:%s:refund_purchased:%s", takedownID, purchaseID),
			CreatedAt:      time.Now(),
		}
		s.ledgerList = append(s.ledgerList, refundEntry)
	}

	// 3. Claw back creator earnings
	if earnings, ok := s.earnings[purchaseID]; ok {
		for _, earning := range earnings {
			if !earning.ClawedBack {
				creatorWallet := s.getOrCreateWallet(earning.CreatorID)
				creatorWallet.PurchasedCoins -= earning.CoinsEarned

				clawbackEntry := &LedgerEntry{
					ID:             generateID("ledge"),
					UserID:         earning.CreatorID,
					Type:           LedgerTakedownClawback,
					CoinType:       CoinPurchased,
					Amount:         -earning.CoinsEarned,
					ReferenceID:    takedownID,
					IdempotencyKey: fmt.Sprintf("takedown:%s:clawback:%s", takedownID, earning.ID),
					CreatedAt:      time.Now(),
				}
				s.ledgerList = append(s.ledgerList, clawbackEntry)
				earning.ClawedBack = true
			}
		}
	}

	// 4. Mark purchase as reversed
	now := time.Now()
	purchase.Status = PurchaseReversed
	purchase.ReversedAt = &now

	return nil
}

// CheckEntitlement verifies if a user has unlocked access to a chapter (FR-R3).
func (s *Service) CheckEntitlement(ctx context.Context, userID, chapterID string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	userChapKey := userID + ":" + chapterID
	ent, found := s.entitlements[userChapKey]
	if !found {
		return false, nil
	}
	return ent.RevokedAt == nil, nil
}

// ListLedger returns a user's ledger entries in reverse chronological order.
func (s *Service) ListLedger(ctx context.Context, userID string) []*LedgerEntry {
	s.mu.Lock()
	defer s.mu.Unlock()

	entries := make([]*LedgerEntry, 0)
	for i := len(s.ledgerList) - 1; i >= 0; i-- {
		entry := s.ledgerList[i]
		if entry.UserID != userID {
			continue
		}
		c := *entry
		entries = append(entries, &c)
	}
	return entries
}

// ListEntitlements returns a user's active chapter entitlements.
func (s *Service) ListEntitlements(ctx context.Context, userID string) []*Entitlement {
	s.mu.Lock()
	defer s.mu.Unlock()

	entitlements := make([]*Entitlement, 0)
	for _, ent := range s.entitlements {
		if ent.UserID != userID || ent.RevokedAt != nil {
			continue
		}
		c := *ent
		entitlements = append(entitlements, &c)
	}
	sort.Slice(entitlements, func(i, j int) bool {
		return entitlements[i].GrantedAt.After(entitlements[j].GrantedAt)
	})
	return entitlements
}

// GetCreatorEarnings returns a creator's non-clawed earnings and their total.
func (s *Service) GetCreatorEarnings(ctx context.Context, creatorID string) (int64, []*CreatorEarning) {
	s.mu.Lock()
	defer s.mu.Unlock()

	total := int64(0)
	entries := make([]*CreatorEarning, 0)
	for _, list := range s.earnings {
		for _, earning := range list {
			if earning.CreatorID != creatorID || earning.ClawedBack {
				continue
			}
			c := *earning
			entries = append(entries, &c)
			total += earning.CoinsEarned
		}
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].CreatedAt.After(entries[j].CreatedAt)
	})
	return total, entries
}
