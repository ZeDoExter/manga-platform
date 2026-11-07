package commerce

import (
	"errors"
	"time"
)

var (
	ErrInsufficientBalance = errors.New("insufficient coin balance")
	ErrDuplicateRequest    = errors.New("duplicate request / idempotency violation")
	ErrPurchaseNotFound    = errors.New("purchase record not found")
	ErrAlreadyReversed     = errors.New("purchase already reversed")
	ErrInvalidSplit        = errors.New("creator split must sum to 100%")
	ErrInvalidAmount       = errors.New("amount must be greater than zero")
)

// CoinType distinguishes real-money purchased coins from promotional bonus coins (FR-M2).
type CoinType string

const (
	CoinPurchased CoinType = "purchased" // Real money, counts toward creator revenue
	CoinBonus     CoinType = "bonus"     // Promo/daily check-in, never counts as creator revenue (FR-E5)
)

// PlatformFeePct is the platform's cut of every purchased-coin sale (70/30 creator/platform split).
// The creators' CreatorSplit percentages divide the remaining 70%, so they must still sum to 100%.
const PlatformFeePct = 30

// LedgerType defines categories of ledger transactions (FR-M2, FR-M3, FR-M6).
type LedgerType string

const (
	LedgerTopUp            LedgerType = "topup"
	LedgerPurchaseDebit    LedgerType = "purchase_debit"
	LedgerCreatorEarning   LedgerType = "creator_earning"
	LedgerPlatformFee      LedgerType = "platform_fee"
	LedgerRefundCredit     LedgerType = "refund_credit"
	LedgerTakedownClawback LedgerType = "takedown_clawback"
)

// LedgerEntry is an immutable, append-only row backing wallet balances (FR-M2).
type LedgerEntry struct {
	ID             string     `json:"id"`
	UserID         string     `json:"user_id"`
	Type           LedgerType `json:"type"`
	CoinType       CoinType   `json:"coin_type"`
	Amount         int64      `json:"amount"` // Positive for credit, negative for debit
	ReferenceID    string     `json:"reference_id"`
	IdempotencyKey string     `json:"idempotency_key"`
	CreatedAt      time.Time  `json:"created_at"`
}

// Wallet represents the current coin balances for a user.
type Wallet struct {
	UserID         string `json:"user_id"`
	PurchasedCoins int64  `json:"purchased_coins"`
	BonusCoins     int64  `json:"bonus_coins"`
}

// Total returns the combined balance available for purchasing chapters.
func (w Wallet) Total() int64 {
	return w.PurchasedCoins + w.BonusCoins
}

// PurchaseStatus tracks the lifecycle of a chapter purchase.
type PurchaseStatus string

const (
	PurchaseActive   PurchaseStatus = "active"
	PurchaseReversed PurchaseStatus = "reversed"
)

type Purchase struct {
	ID                    string         `json:"id"`
	UserID                string         `json:"user_id"`
	StoryID               string         `json:"story_id"`
	ChapterID             string         `json:"chapter_id"`
	TotalCoins            int64          `json:"total_coins"`
	PurchasedCoinsDebited int64          `json:"purchased_coins_debited"`
	BonusCoinsDebited     int64          `json:"bonus_coins_debited"`
	IdempotencyKey        string         `json:"idempotency_key"`
	Status                PurchaseStatus `json:"status"`
	CreatedAt             time.Time      `json:"created_at"`
	ReversedAt            *time.Time     `json:"reversed_at,omitempty"`
}

// CreatorSplit defines a team member's revenue share on a story (FR-C3, FR-M4).
type CreatorSplit struct {
	CreatorID  string `json:"creator_id"`
	Percentage int    `json:"percentage"` // e.g. 70 = 70%
}

// CreatorEarning records coins credited to a creator from a sale (FR-M4).
type CreatorEarning struct {
	ID          string    `json:"id"`
	PurchaseID  string    `json:"purchase_id"`
	CreatorID   string    `json:"creator_id"`
	StoryID     string    `json:"story_id"`
	ChapterID   string    `json:"chapter_id"`
	CoinsEarned int64     `json:"coins_earned"`
	CreatedAt   time.Time `json:"created_at"`
	ClawedBack  bool      `json:"clawed_back"`
}

// Entitlement grants read access to a chapter (FR-R3).
type Entitlement struct {
	ID        string     `json:"id"`
	UserID    string     `json:"user_id"`
	StoryID   string     `json:"story_id"`
	ChapterID string     `json:"chapter_id"`
	GrantedAt time.Time  `json:"granted_at"`
	RevokedAt *time.Time `json:"revoked_at,omitempty"`
}
