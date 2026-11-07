package commerce

import (
	"context"
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

// Tx is a unit of work: all writes inside one commerce operation share it.
// MemoryTx wraps a mutex; PGTx wraps a pgx.Tx.
type Tx interface {
	// LockUser serializes money mutations per user (anti-double-spend).
	LockUser(ctx context.Context, userID string) error

	// Ledger
	FindLedgerByKey(ctx context.Context, userID, idempotencyKey string) (*LedgerEntry, error)
	AppendLedger(ctx context.Context, e *LedgerEntry) error
	SumBalances(ctx context.Context, userID string) (purchased, bonus int64, err error)
	ListLedger(ctx context.Context, userID string) ([]*LedgerEntry, error)

	// Purchases
	FindPurchase(ctx context.Context, purchaseID string) (*Purchase, error)
	FindPurchaseByUserChapter(ctx context.Context, userID, chapterID string) (*Purchase, error)
	FindPurchaseByKey(ctx context.Context, userID, idempotencyKey string) (*Purchase, error)
	InsertPurchase(ctx context.Context, p *Purchase) error
	MarkReversed(ctx context.Context, purchaseID string, at time.Time) error

	// Entitlements
	FindEntitlement(ctx context.Context, userID, chapterID string) (*Entitlement, error)
	UpsertEntitlement(ctx context.Context, e *Entitlement) error
	RevokeEntitlement(ctx context.Context, userID, chapterID string, at time.Time) error
	ListEntitlements(ctx context.Context, userID string) ([]*Entitlement, error)

	// Earnings
	InsertEarning(ctx context.Context, e *CreatorEarning) error
	ListEarningsByPurchase(ctx context.Context, purchaseID string) ([]*CreatorEarning, error)
	ListEarningsByCreator(ctx context.Context, creatorID string) ([]*CreatorEarning, error)
	MarkClawedBack(ctx context.Context, earningID string) error
}

// Store opens transactions. MemoryStore and PGStore implement it.
type Store interface {
	// WithTx runs fn inside a transaction (or mutex guard), committing on
	// nil error and rolling back otherwise.
	WithTx(ctx context.Context, fn func(tx Tx) error) error
	// WithTxUser is WithTx + LockUser for the given users, in sorted order
	// to avoid deadlocks.
	WithTxUser(ctx context.Context, userIDs []string, fn func(tx Tx) error) error
}
