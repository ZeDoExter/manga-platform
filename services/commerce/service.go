package commerce

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sort"
	"time"
)

// Service provides ACID, idempotent commerce operations (FR-M1..M4, FR-M6, NFR-Money-1).
type Service struct {
	store Store
}

// NewService creates an in-memory service (default for tests and local dev
// without DATABASE_URL).
func NewService() *Service {
	return &Service{store: NewMemoryStore()}
}

// NewServiceWithStore creates a service over any Store (e.g. PGStore).
func NewServiceWithStore(store Store) *Service {
	return &Service{store: store}
}

func generateID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return prefix + "_" + hex.EncodeToString(b)
}

// PlatformUserID owns platform-fee ledger entries so they never inflate
// any real user's balance (FR-M4).
const PlatformUserID = "platform"

// TopUp credits coins to a user's wallet with webhook idempotency (FR-M1, B-A1).
func (s *Service) TopUp(ctx context.Context, userID string, amount int64, coinType CoinType, refID, idempotencyKey string) (*LedgerEntry, error) {
	if userID == "" || userID == "guest" {
		return nil, ErrGuestNotAllowed
	}
	if amount <= 0 {
		return nil, ErrInvalidAmount
	}
	var out *LedgerEntry
	err := s.store.WithTxUser(ctx, []string{userID}, func(tx Tx) error {
		if existing, err := tx.FindLedgerByKey(ctx, userID, idempotencyKey); err != nil {
			return err
		} else if existing != nil {
			out = existing
			return nil
		}
		entry := &LedgerEntry{
			ID: generateID("ledge"), UserID: userID, Type: LedgerTopUp,
			CoinType: coinType, Amount: amount, ReferenceID: refID,
			IdempotencyKey: idempotencyKey, CreatedAt: time.Now(),
		}
		if err := tx.AppendLedger(ctx, entry); err != nil {
			return err
		}
		out = entry
		return nil
	})
	return out, err
}

// MinTipCoins is the minimum donate-to-comment amount (paid comments).
const MinTipCoins = 5

// Tip debits coins as a platform-kept posting fee (paid comments).
// Unlike purchases, 100% goes to the platform (no creator split).
func (s *Service) Tip(ctx context.Context, userID string, amount int64, refID, idempotencyKey string) (*LedgerEntry, error) {
	if amount < MinTipCoins {
		return nil, ErrInvalidAmount
	}
	var out *LedgerEntry
	err := s.store.WithTxUser(ctx, []string{userID, PlatformUserID}, func(tx Tx) error {
		if existing, err := tx.FindLedgerByKey(ctx, PlatformUserID, idempotencyKey+":platform"); err != nil {
			return err
		} else if existing != nil {
			out = existing
			return nil
		}
		purchased, bonus, err := tx.SumBalances(ctx, userID)
		if err != nil {
			return err
		}
		if purchased+bonus < amount {
			return ErrInsufficientBalance
		}
		// Debit bonus first, then purchased.
		remaining := amount
		now := time.Now()
		tipID := generateID("tip")
		if bonus > 0 {
			take := min64(bonus, remaining)
			if err := tx.AppendLedger(ctx, &LedgerEntry{
				ID: generateID("ledge"), UserID: userID, Type: LedgerTipFee,
				CoinType: CoinBonus, Amount: -take, ReferenceID: tipID,
				IdempotencyKey: idempotencyKey + ":bonus", CreatedAt: now,
			}); err != nil {
				return err
			}
			remaining -= take
		}
		if remaining > 0 {
			if err := tx.AppendLedger(ctx, &LedgerEntry{
				ID: generateID("ledge"), UserID: userID, Type: LedgerTipFee,
				CoinType: CoinPurchased, Amount: -remaining, ReferenceID: tipID,
				IdempotencyKey: idempotencyKey + ":purchased", CreatedAt: now,
			}); err != nil {
				return err
			}
		}
		out = &LedgerEntry{
			ID: generateID("ledge"), UserID: PlatformUserID, Type: LedgerTipFee,
			CoinType: CoinPurchased, Amount: amount, ReferenceID: tipID,
			IdempotencyKey: idempotencyKey + ":platform", CreatedAt: now,
		}
		if refID != "" {
			out.ReferenceID = refID
		}
		return tx.AppendLedger(ctx, out)
	})
	return out, err
}

func min64(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}
// GetWallet returns current coin balances for a user (derived from ledger).
func (s *Service) GetWallet(ctx context.Context, userID string) (Wallet, error) {
	var w Wallet
	err := s.store.WithTx(ctx, func(tx Tx) error {
		purchased, bonus, err := tx.SumBalances(ctx, userID)
		if err != nil {
			return err
		}
		w = Wallet{UserID: userID, PurchasedCoins: purchased, BonusCoins: bonus}
		return nil
	})
	return w, err
}

// PurchaseChapter executes an atomic transaction: debits coins, grants
// entitlement, and records creator earnings split (FR-M3, FR-M4, NFR-Money-1).
func (s *Service) PurchaseChapter(ctx context.Context, req PurchaseRequest) (*PurchaseResult, error) {
	if req.Price < 0 {
		return nil, ErrInvalidAmount
	}
	if len(req.CreatorSplits) > 0 {
		totalPct := 0
		for _, sp := range req.CreatorSplits {
			totalPct += sp.Percentage
		}
		if totalPct != 100 {
			return nil, ErrInvalidSplit
		}
	}

	users := []string{req.UserID}
	for _, sp := range req.CreatorSplits {
		users = append(users, sp.CreatorID)
	}
	users = append(users, PlatformUserID) // fee row owner; keeps advisory locks ordered

	var result *PurchaseResult
	err := s.store.WithTxUser(ctx, users, func(tx Tx) error {
		// 1. Idempotency replay via the purchase's own key (no ledger marker row).
		if req.IdempotencyKey != "" {
			if purchase, err := tx.FindPurchaseByKey(ctx, req.UserID, req.IdempotencyKey); err != nil {
				return err
			} else if purchase != nil {
				ent, err := tx.FindEntitlement(ctx, req.UserID, req.ChapterID)
				if err != nil {
					return err
				}
				earnings, err := tx.ListEarningsByPurchase(ctx, purchase.ID)
				if err != nil {
					return err
				}
				result = &PurchaseResult{Purchase: purchase, Entitlement: ent, Earnings: earnings}
				return nil
			}
		}

		// 2. Already entitled
		if ent, err := tx.FindEntitlement(ctx, req.UserID, req.ChapterID); err != nil {
			return err
		} else if ent != nil && ent.RevokedAt == nil {
			purchase, err := tx.FindPurchaseByUserChapter(ctx, req.UserID, req.ChapterID)
			if err != nil {
				return err
			}
			earnings, err := tx.ListEarningsByPurchase(ctx, purchase.ID)
			if err != nil {
				return err
			}
			result = &PurchaseResult{Purchase: purchase, Entitlement: ent, Earnings: earnings}
			return nil
		}

		// 3. Balance check + debit allocation (bonus first)
		purchased, bonus, err := tx.SumBalances(ctx, req.UserID)
		if err != nil {
			return err
		}
		if purchased+bonus < req.Price {
			return ErrInsufficientBalance
		}
		var bonusToDebit, purchasedToDebit int64
		if bonus >= req.Price {
			bonusToDebit = req.Price
		} else {
			bonusToDebit = bonus
			purchasedToDebit = req.Price - bonus
		}
		if purchased < purchasedToDebit {
			return ErrInsufficientBalance
		}

		now := time.Now()
		purchaseID := generateID("purch")

		appendDebit := func(coinType CoinType, amount int64, suffix string) error {
			return tx.AppendLedger(ctx, &LedgerEntry{
				ID: generateID("ledge"), UserID: req.UserID, Type: LedgerPurchaseDebit,
				CoinType: coinType, Amount: -amount, ReferenceID: purchaseID,
				IdempotencyKey: fmt.Sprintf("%s:%s", req.IdempotencyKey, suffix), CreatedAt: now,
			})
		}
		if bonusToDebit > 0 {
			if err := appendDebit(CoinBonus, bonusToDebit, "bonus"); err != nil {
				return err
			}
		}
		if purchasedToDebit > 0 {
			if err := appendDebit(CoinPurchased, purchasedToDebit, "purchased"); err != nil {
				return err
			}
		}
		purchase := &Purchase{
			ID: purchaseID, UserID: req.UserID, StoryID: req.StoryID, ChapterID: req.ChapterID,
			TotalCoins: req.Price, PurchasedCoinsDebited: purchasedToDebit,
			BonusCoinsDebited: bonusToDebit, IdempotencyKey: req.IdempotencyKey,
			Status: PurchaseActive, CreatedAt: now,
		}
		if err := tx.InsertPurchase(ctx, purchase); err != nil {
			return err
		}

		ent := &Entitlement{
			ID: generateID("ent"), UserID: req.UserID,
			StoryID: req.StoryID, ChapterID: req.ChapterID, GrantedAt: now,
		}
		if err := tx.UpsertEntitlement(ctx, ent); err != nil {
			return err
		}

		// 4. Creator earnings: platform fee first, then split remainder (FR-M4, FR-E5).
		var earningsList []*CreatorEarning
		if purchasedToDebit > 0 && len(req.CreatorSplits) > 0 {
			feeCoins := (purchasedToDebit * PlatformFeePct) / 100
			creatorPool := purchasedToDebit - feeCoins
			if feeCoins > 0 {
				if err := tx.AppendLedger(ctx, &LedgerEntry{
					ID: generateID("ledge"), UserID: PlatformUserID, Type: LedgerPlatformFee,
					CoinType: CoinPurchased, Amount: feeCoins, ReferenceID: purchaseID,
					IdempotencyKey: fmt.Sprintf("%s:platform", purchaseID), CreatedAt: now,
				}); err != nil {
					return err
				}
			}
			for _, split := range req.CreatorSplits {
				creatorCoins := (creatorPool * int64(split.Percentage)) / 100
				if creatorCoins <= 0 {
					continue
				}
				earning := &CreatorEarning{
					ID: generateID("earn"), PurchaseID: purchaseID, CreatorID: split.CreatorID,
					StoryID: req.StoryID, ChapterID: req.ChapterID,
					CoinsEarned: creatorCoins, CreatedAt: now,
				}
				if err := tx.InsertEarning(ctx, earning); err != nil {
					return err
				}
				if err := tx.AppendLedger(ctx, &LedgerEntry{
					ID: generateID("ledge"), UserID: split.CreatorID, Type: LedgerCreatorEarning,
					CoinType: CoinPurchased, Amount: creatorCoins, ReferenceID: purchaseID,
					IdempotencyKey: fmt.Sprintf("%s:creator:%s", purchaseID, split.CreatorID), CreatedAt: now,
				}); err != nil {
					return err
				}
				earningsList = append(earningsList, earning)
			}
		}

		result = &PurchaseResult{Purchase: purchase, Entitlement: ent, Earnings: earningsList}
		return nil
	})
	return result, err
}

// ReversePurchaseOnTakedown revokes entitlement, refunds buyer, claws back
// creator earnings (FR-M6, FR-D2). Idempotent.
func (s *Service) ReversePurchaseOnTakedown(ctx context.Context, purchaseID string, takedownID string) error {
	return s.store.WithTx(ctx, func(tx Tx) error {
		purchase, err := tx.FindPurchase(ctx, purchaseID)
		if err != nil {
			return err
		}
		if purchase == nil {
			return ErrPurchaseNotFound
		}
		if purchase.Status == PurchaseReversed {
			return nil
		}
		now := time.Now()

		if err := tx.RevokeEntitlement(ctx, purchase.UserID, purchase.ChapterID, now); err != nil {
			return err
		}

		refund := func(coinType CoinType, amount int64, suffix string) error {
			if amount <= 0 {
				return nil
			}
			return tx.AppendLedger(ctx, &LedgerEntry{
				ID: generateID("ledge"), UserID: purchase.UserID, Type: LedgerRefundCredit,
				CoinType: coinType, Amount: amount, ReferenceID: takedownID,
				IdempotencyKey: fmt.Sprintf("takedown:%s:%s:%s", takedownID, suffix, purchaseID), CreatedAt: now,
			})
		}
		if err := refund(CoinBonus, purchase.BonusCoinsDebited, "refund_bonus"); err != nil {
			return err
		}
		if err := refund(CoinPurchased, purchase.PurchasedCoinsDebited, "refund_purchased"); err != nil {
			return err
		}

		earnings, err := tx.ListEarningsByPurchase(ctx, purchaseID)
		if err != nil {
			return err
		}
		for _, earning := range earnings {
			if earning.ClawedBack {
				continue
			}
			if err := tx.AppendLedger(ctx, &LedgerEntry{
				ID: generateID("ledge"), UserID: earning.CreatorID, Type: LedgerTakedownClawback,
				CoinType: CoinPurchased, Amount: -earning.CoinsEarned, ReferenceID: takedownID,
				IdempotencyKey: fmt.Sprintf("takedown:%s:clawback:%s", takedownID, earning.ID), CreatedAt: now,
			}); err != nil {
				return err
			}
			if err := tx.MarkClawedBack(ctx, earning.ID); err != nil {
				return err
			}
		}

		return tx.MarkReversed(ctx, purchaseID, now)
	})
}

// CheckEntitlement verifies if a user has unlocked access to a chapter (FR-R3).
func (s *Service) CheckEntitlement(ctx context.Context, userID, chapterID string) (bool, error) {
	var ok bool
	err := s.store.WithTx(ctx, func(tx Tx) error {
		ent, err := tx.FindEntitlement(ctx, userID, chapterID)
		if err != nil {
			return err
		}
		ok = ent != nil && ent.RevokedAt == nil
		return nil
	})
	return ok, err
}

// ListLedger returns a user's ledger entries in reverse chronological order.
func (s *Service) ListLedger(ctx context.Context, userID string) []*LedgerEntry {
	var out []*LedgerEntry
	_ = s.store.WithTx(ctx, func(tx Tx) error {
		var err error
		out, err = tx.ListLedger(ctx, userID)
		return err
	})
	return out
}

// ListEntitlements returns a user's active chapter entitlements.
func (s *Service) ListEntitlements(ctx context.Context, userID string) []*Entitlement {
	var out []*Entitlement
	_ = s.store.WithTx(ctx, func(tx Tx) error {
		var err error
		out, err = tx.ListEntitlements(ctx, userID)
		return err
	})
	return out
}

// GetCreatorEarnings returns a creator's non-clawed earnings and their total.
func (s *Service) GetCreatorEarnings(ctx context.Context, creatorID string) (int64, []*CreatorEarning) {
	var total int64
	var out []*CreatorEarning
	_ = s.store.WithTx(ctx, func(tx Tx) error {
		var err error
		out, err = tx.ListEarningsByCreator(ctx, creatorID)
		if err != nil {
			return err
		}
		for _, e := range out {
			total += e.CoinsEarned
		}
		return nil
	})
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return total, out
}
