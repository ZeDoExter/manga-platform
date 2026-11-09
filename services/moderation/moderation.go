package moderation

import (
	"context"
	"errors"
	"time"

	"manga-platform/pkg/ids"
	"manga-platform/pkg/imagestore"
	"manga-platform/services/catalog"
)

var (
	ErrUnauthorizedAdmin = errors.New("admin privileges required for moderation actions")
	ErrReasonRequired    = errors.New("takedown reason is required for audit trail")
)

type AuditLog struct {
	ID        string    `json:"id"`
	AdminID   string    `json:"admin_id"`
	Action    string    `json:"action"`
	TargetID  string    `json:"target_id"`
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"created_at"`
}

type Catalog interface {
	GetChapter(ctx context.Context, chapterID string) (*catalog.Chapter, error)
	SetChapterStatus(ctx context.Context, chapterID string, status catalog.ContentStatus) error
}

type Commerce interface {
	ReversePurchaseOnTakedown(ctx context.Context, purchaseID string, takedownID string) error
}

type Identity interface {
	SetBanStatus(ctx context.Context, targetUserID string, banned bool) error
}

type Service struct {
	catalog  Catalog
	commerce Commerce
	identity Identity
	storage  imagestore.ImageStore
	store    Store
}

func NewService(cat Catalog, com Commerce, id Identity, store imagestore.ImageStore) *Service {
	return NewServiceWithStore(cat, com, id, store, NewMemoryStore())
}

// NewServiceWithStore creates a service over any Store (e.g. PGStore).
func NewServiceWithStore(cat Catalog, com Commerce, id Identity, imgStore imagestore.ImageStore, store Store) *Service {
	return &Service{
		catalog:  cat,
		commerce: com,
		identity: id,
		storage:  imgStore,
		store:    store,
	}
}
// TakedownChapter executes the full takedown workflow (FR-D2, FR-M6, ADR-001):
// 1. Marks chapter as taken_down in catalog (FR-D1)
// 2. Removes or invalidates image objects in ImageStore (ADR-001, B-B2)
// 3. Atomically refunds buyers and claws back creator earnings (FR-M6)
// 4. Writes an immutable audit log entry (FR-D4)
func (s *Service) TakedownChapter(ctx context.Context, adminID string, chapterID string, reason string, purchasesToReverse []string) error {
	if reason == "" {
		return ErrReasonRequired
	}

	takedownID := ids.New("takedown")

	// 1. Fetch and update chapter status in catalog (FR-D1)
	chap, err := s.catalog.GetChapter(ctx, chapterID)
	if err != nil {
		return err
	}
	if err := s.catalog.SetChapterStatus(ctx, chapterID, catalog.StatusTakenDown); err != nil {
		return err
	}

	// 2. Delete/block objects in ImageStore (ADR-001, B-B2)
	for _, pageKey := range chap.PageKeys {
		_ = s.storage.Delete(ctx, pageKey)
	}

	// 3. Reverse purchases: refund buyers and claw back creator earnings (FR-M6)
	for _, purchaseID := range purchasesToReverse {
		if err := s.commerce.ReversePurchaseOnTakedown(ctx, purchaseID, takedownID); err != nil {
			return err
		}
	}

	// 4. Record audit log (FR-D4)
	logEntry := &AuditLog{
		ID:        ids.New("audit"),
		AdminID:   adminID,
		Action:    "chapter_takedown",
		TargetID:  chapterID,
		Reason:    reason,
		CreatedAt: time.Now(),
	}
	if err := s.store.InsertAuditLog(ctx, logEntry); err != nil {
		return err
	}

	return nil
}

// BanUser suspends a malicious or repeat offender (FR-D3, FR-D4).
func (s *Service) BanUser(ctx context.Context, adminID, targetUserID, reason string) error {
	if reason == "" {
		return ErrReasonRequired
	}

	if err := s.identity.SetBanStatus(ctx, targetUserID, true); err != nil {
		return err
	}

	logEntry := &AuditLog{
		ID:        ids.New("audit"),
		AdminID:   adminID,
		Action:    "user_ban",
		TargetID:  targetUserID,
		Reason:    reason,
		CreatedAt: time.Now(),
	}
	if err := s.store.InsertAuditLog(ctx, logEntry); err != nil {
		return err
	}

	return nil
}

// GetAuditLogs returns the immutable audit trail (FR-D4).
func (s *Service) GetAuditLogs(ctx context.Context) ([]*AuditLog, error) {
	return s.store.ListAuditLogs(ctx)
}
