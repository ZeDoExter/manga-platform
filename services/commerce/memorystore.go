package commerce

import (
	"context"
	"sort"
	"sync"
	"time"
)

// MemoryStore is the in-memory Store: fast, hermetic, used by unit tests
// and local dev without DATABASE_URL.
type MemoryStore struct {
	mu           sync.Mutex
	ledgers      map[string]*LedgerEntry
	ledgerList   []*LedgerEntry
	purchases    map[string]*Purchase
	purchasesKey map[string]*Purchase
	entitlements map[string]*Entitlement
	earnings     map[string][]*CreatorEarning
}

// NewMemoryStore creates an empty in-memory store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		ledgers:      make(map[string]*LedgerEntry),
		purchases:    make(map[string]*Purchase),
		purchasesKey: make(map[string]*Purchase),
		entitlements: make(map[string]*Entitlement),
		earnings:     make(map[string][]*CreatorEarning),
	}
}

// MemoryTx implements Tx over a locked MemoryStore.
type MemoryTx struct {
	s *MemoryStore
}

func (m *MemoryStore) WithTx(_ context.Context, fn func(tx Tx) error) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	return fn(&MemoryTx{s: m})
}

func (m *MemoryStore) WithTxUser(_ context.Context, _ []string, fn func(tx Tx) error) error {
	// Single global mutex already serializes everything; user list ignored.
	m.mu.Lock()
	defer m.mu.Unlock()
	return fn(&MemoryTx{s: m})
}

func (t *MemoryTx) LockUser(_ context.Context, _ string) error { return nil }

func ledgerKey(userID, key string) string { return userID + "\x00" + key }
func userChapKey(userID, chapterID string) string { return userID + ":" + chapterID }

func (t *MemoryTx) FindLedgerByKey(_ context.Context, userID, idempotencyKey string) (*LedgerEntry, error) {
	e, ok := t.s.ledgers[ledgerKey(userID, idempotencyKey)]
	if !ok {
		return nil, nil
	}
	c := *e
	return &c, nil
}

func (t *MemoryTx) AppendLedger(_ context.Context, e *LedgerEntry) error {
	if _, exists := t.s.ledgers[ledgerKey(e.UserID, e.IdempotencyKey)]; exists {
		return ErrDuplicateRequest
	}
	t.s.ledgers[ledgerKey(e.UserID, e.IdempotencyKey)] = e
	t.s.ledgerList = append(t.s.ledgerList, e)
	return nil
}

func (t *MemoryTx) SumBalances(_ context.Context, userID string) (int64, int64, error) {
	var purchased, bonus int64
	for _, e := range t.s.ledgerList {
		if e.UserID != userID {
			continue
		}
		if e.CoinType == CoinBonus {
			bonus += e.Amount
		} else {
			purchased += e.Amount
		}
	}
	return purchased, bonus, nil
}

func (t *MemoryTx) ListLedger(_ context.Context, userID string) ([]*LedgerEntry, error) {
	out := []*LedgerEntry{}
	for i := len(t.s.ledgerList) - 1; i >= 0; i-- {
		if e := t.s.ledgerList[i]; e.UserID == userID {
			c := *e
			out = append(out, &c)
		}
	}
	return out, nil
}

func (t *MemoryTx) FindPurchase(_ context.Context, purchaseID string) (*Purchase, error) {
	p, ok := t.s.purchases[purchaseID]
	if !ok {
		return nil, nil
	}
	c := *p
	return &c, nil
}

func (t *MemoryTx) FindPurchaseByUserChapter(_ context.Context, userID, chapterID string) (*Purchase, error) {
	p, ok := t.s.purchasesKey[userChapKey(userID, chapterID)]
	if !ok {
		return nil, nil
	}
	c := *p
	return &c, nil
}

func (t *MemoryTx) FindPurchaseByKey(_ context.Context, userID, idempotencyKey string) (*Purchase, error) {
	if idempotencyKey == "" {
		return nil, nil
	}
	for _, p := range t.s.purchases {
		if p.UserID == userID && p.IdempotencyKey == idempotencyKey {
			c := *p
			return &c, nil
		}
	}
	return nil, nil
}

func (t *MemoryTx) InsertPurchase(_ context.Context, p *Purchase) error {
	if _, exists := t.s.purchases[p.ID]; exists {
		return ErrDuplicateRequest
	}
	if p.IdempotencyKey != "" {
		for _, q := range t.s.purchases {
			if q.UserID == p.UserID && q.IdempotencyKey == p.IdempotencyKey {
				return ErrDuplicateRequest
			}
		}
	}
	t.s.purchases[p.ID] = p
	t.s.purchasesKey[userChapKey(p.UserID, p.ChapterID)] = p
	return nil
}

func (t *MemoryTx) MarkReversed(_ context.Context, purchaseID string, at time.Time) error {
	p, ok := t.s.purchases[purchaseID]
	if !ok {
		return ErrPurchaseNotFound
	}
	p.Status = PurchaseReversed
	p.ReversedAt = &at
	return nil
}

func (t *MemoryTx) FindEntitlement(_ context.Context, userID, chapterID string) (*Entitlement, error) {
	e, ok := t.s.entitlements[userChapKey(userID, chapterID)]
	if !ok {
		return nil, nil
	}
	c := *e
	return &c, nil
}

func (t *MemoryTx) UpsertEntitlement(_ context.Context, e *Entitlement) error {
	t.s.entitlements[userChapKey(e.UserID, e.ChapterID)] = e
	return nil
}

func (t *MemoryTx) RevokeEntitlement(_ context.Context, userID, chapterID string, at time.Time) error {
	if e, ok := t.s.entitlements[userChapKey(userID, chapterID)]; ok {
		e.RevokedAt = &at
	}
	return nil
}

func (t *MemoryTx) ListEntitlements(_ context.Context, userID string) ([]*Entitlement, error) {
	out := []*Entitlement{}
	for _, e := range t.s.entitlements {
		if e.UserID == userID && e.RevokedAt == nil {
			c := *e
			out = append(out, &c)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].GrantedAt.After(out[j].GrantedAt) })
	return out, nil
}

func (t *MemoryTx) InsertEarning(_ context.Context, e *CreatorEarning) error {
	t.s.earnings[e.PurchaseID] = append(t.s.earnings[e.PurchaseID], e)
	return nil
}

func (t *MemoryTx) ListEarningsByPurchase(_ context.Context, purchaseID string) ([]*CreatorEarning, error) {
	out := []*CreatorEarning{}
	for _, e := range t.s.earnings[purchaseID] {
		c := *e
		out = append(out, &c)
	}
	return out, nil
}

func (t *MemoryTx) ListEarningsByCreator(_ context.Context, creatorID string) ([]*CreatorEarning, error) {
	out := []*CreatorEarning{}
	for _, list := range t.s.earnings {
		for _, e := range list {
			if e.CreatorID == creatorID && !e.ClawedBack {
				c := *e
				out = append(out, &c)
			}
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

func (t *MemoryTx) MarkClawedBack(_ context.Context, earningID string) error {
	for _, list := range t.s.earnings {
		for _, e := range list {
			if e.ID == earningID {
				e.ClawedBack = true
				return nil
			}
		}
	}
	return nil
}
