package commerce

import (
	"context"
	"errors"
	"sort"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PGStore persists commerce data in PostgreSQL (schema: commerce).
type PGStore struct {
	pool *pgxpool.Pool
}

// NewPGStore creates a PG-backed store. Caller owns pool lifecycle.
func NewPGStore(pool *pgxpool.Pool) *PGStore {
	return &PGStore{pool: pool}
}

// PGTx implements Tx over a pgx.Tx.
type PGTx struct {
	tx pgx.Tx
}

func (p *PGStore) WithTx(ctx context.Context, fn func(tx Tx) error) error {
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := fn(&PGTx{tx: tx}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (p *PGStore) WithTxUser(ctx context.Context, userIDs []string, fn func(tx Tx) error) error {
	ids := append([]string(nil), userIDs...)
	sort.Strings(ids)
	dedup := ids[:0]
	for i, id := range ids {
		if i == 0 || id != ids[i-1] {
			dedup = append(dedup, id)
		}
	}
	return p.WithTx(ctx, func(tx Tx) error {
		for _, u := range dedup {
			if err := tx.LockUser(ctx, u); err != nil {
				return err
			}
		}
		return fn(tx)
	})
}

// LockUser serializes money mutations per user for the transaction.
func (t *PGTx) LockUser(ctx context.Context, userID string) error {
	_, err := t.tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, userID)
	return err
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func (t *PGTx) FindLedgerByKey(ctx context.Context, userID, idempotencyKey string) (*LedgerEntry, error) {
	e := &LedgerEntry{}
	err := t.tx.QueryRow(ctx, `
		SELECT id, user_id, type, coin_type, amount, reference_id, idempotency_key, created_at
		FROM commerce.ledger_entries WHERE user_id = $1 AND idempotency_key = $2`,
		userID, idempotencyKey).Scan(
		&e.ID, &e.UserID, &e.Type, &e.CoinType, &e.Amount, &e.ReferenceID, &e.IdempotencyKey, &e.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return e, nil
}

func (t *PGTx) AppendLedger(ctx context.Context, e *LedgerEntry) error {
	_, err := t.tx.Exec(ctx, `
		INSERT INTO commerce.ledger_entries (id, user_id, type, coin_type, amount, reference_id, idempotency_key, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		e.ID, e.UserID, e.Type, e.CoinType, e.Amount, e.ReferenceID, e.IdempotencyKey, e.CreatedAt)
	if isUniqueViolation(err) {
		return ErrDuplicateRequest
	}
	return err
}

func (t *PGTx) SumBalances(ctx context.Context, userID string) (int64, int64, error) {
	var purchased, bonus int64
	rows, err := t.tx.Query(ctx, `
		SELECT coin_type, COALESCE(SUM(amount), 0)
		FROM commerce.ledger_entries WHERE user_id = $1 GROUP BY coin_type`, userID)
	if err != nil {
		return 0, 0, err
	}
	defer rows.Close()
	for rows.Next() {
		var coinType CoinType
		var sum int64
		if err := rows.Scan(&coinType, &sum); err != nil {
			return 0, 0, err
		}
		if coinType == CoinBonus {
			bonus = sum
		} else {
			purchased = sum
		}
	}
	return purchased, bonus, rows.Err()
}

func (t *PGTx) ListLedger(ctx context.Context, userID string) ([]*LedgerEntry, error) {
	rows, err := t.tx.Query(ctx, `
		SELECT id, user_id, type, coin_type, amount, reference_id, idempotency_key, created_at
		FROM commerce.ledger_entries WHERE user_id = $1 ORDER BY seq DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*LedgerEntry{}
	for rows.Next() {
		e := &LedgerEntry{}
		if err := rows.Scan(&e.ID, &e.UserID, &e.Type, &e.CoinType, &e.Amount,
			&e.ReferenceID, &e.IdempotencyKey, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (t *PGTx) FindPurchase(ctx context.Context, purchaseID string) (*Purchase, error) {
	p := &Purchase{}
	err := t.tx.QueryRow(ctx, `
		SELECT id, user_id, story_id, chapter_id, total_coins, purchased_coins_debited,
		       bonus_coins_debited, idempotency_key, status, created_at, reversed_at
		FROM commerce.purchases WHERE id = $1`, purchaseID).Scan(
		&p.ID, &p.UserID, &p.StoryID, &p.ChapterID, &p.TotalCoins, &p.PurchasedCoinsDebited,
		&p.BonusCoinsDebited, &p.IdempotencyKey, &p.Status, &p.CreatedAt, &p.ReversedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (t *PGTx) FindPurchaseByUserChapter(ctx context.Context, userID, chapterID string) (*Purchase, error) {
	p := &Purchase{}
	err := t.tx.QueryRow(ctx, `
		SELECT id, user_id, story_id, chapter_id, total_coins, purchased_coins_debited,
		       bonus_coins_debited, idempotency_key, status, created_at, reversed_at
		FROM commerce.purchases
		WHERE user_id = $1 AND chapter_id = $2 AND status = 'active'`, userID, chapterID).Scan(
		&p.ID, &p.UserID, &p.StoryID, &p.ChapterID, &p.TotalCoins, &p.PurchasedCoinsDebited,
		&p.BonusCoinsDebited, &p.IdempotencyKey, &p.Status, &p.CreatedAt, &p.ReversedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (t *PGTx) FindPurchaseByKey(ctx context.Context, userID, idempotencyKey string) (*Purchase, error) {
	if idempotencyKey == "" {
		return nil, nil
	}
	p := &Purchase{}
	err := t.tx.QueryRow(ctx, `
		SELECT id, user_id, story_id, chapter_id, total_coins, purchased_coins_debited,
		       bonus_coins_debited, idempotency_key, status, created_at, reversed_at
		FROM commerce.purchases WHERE user_id = $1 AND idempotency_key = $2`,
		userID, idempotencyKey).Scan(
		&p.ID, &p.UserID, &p.StoryID, &p.ChapterID, &p.TotalCoins, &p.PurchasedCoinsDebited,
		&p.BonusCoinsDebited, &p.IdempotencyKey, &p.Status, &p.CreatedAt, &p.ReversedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (t *PGTx) InsertPurchase(ctx context.Context, p *Purchase) error {
	_, err := t.tx.Exec(ctx, `
		INSERT INTO commerce.purchases (id, user_id, story_id, chapter_id, total_coins,
			purchased_coins_debited, bonus_coins_debited, idempotency_key, status, created_at, reversed_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		p.ID, p.UserID, p.StoryID, p.ChapterID, p.TotalCoins, p.PurchasedCoinsDebited,
		p.BonusCoinsDebited, p.IdempotencyKey, p.Status, p.CreatedAt, p.ReversedAt)
	if isUniqueViolation(err) {
		return ErrDuplicateRequest
	}
	return err
}

func (t *PGTx) MarkReversed(ctx context.Context, purchaseID string, at time.Time) error {
	tag, err := t.tx.Exec(ctx,
		`UPDATE commerce.purchases SET status = 'reversed', reversed_at = $2 WHERE id = $1`,
		purchaseID, at)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrPurchaseNotFound
	}
	return nil
}

func (t *PGTx) FindEntitlement(ctx context.Context, userID, chapterID string) (*Entitlement, error) {
	e := &Entitlement{}
	err := t.tx.QueryRow(ctx, `
		SELECT id, user_id, story_id, chapter_id, granted_at, revoked_at
		FROM commerce.entitlements WHERE user_id = $1 AND chapter_id = $2`,
		userID, chapterID).Scan(
		&e.ID, &e.UserID, &e.StoryID, &e.ChapterID, &e.GrantedAt, &e.RevokedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return e, nil
}

func (t *PGTx) UpsertEntitlement(ctx context.Context, e *Entitlement) error {
	_, err := t.tx.Exec(ctx, `
		INSERT INTO commerce.entitlements (id, user_id, story_id, chapter_id, granted_at, revoked_at)
		VALUES ($1,$2,$3,$4,$5,NULL)
		ON CONFLICT (user_id, chapter_id) DO UPDATE SET
			id = EXCLUDED.id, story_id = EXCLUDED.story_id,
			granted_at = EXCLUDED.granted_at, revoked_at = NULL`,
		e.ID, e.UserID, e.StoryID, e.ChapterID, e.GrantedAt)
	return err
}

func (t *PGTx) RevokeEntitlement(ctx context.Context, userID, chapterID string, at time.Time) error {
	_, err := t.tx.Exec(ctx,
		`UPDATE commerce.entitlements SET revoked_at = $3
		 WHERE user_id = $1 AND chapter_id = $2 AND revoked_at IS NULL`,
		userID, chapterID, at)
	return err
}

func (t *PGTx) ListEntitlements(ctx context.Context, userID string) ([]*Entitlement, error) {
	rows, err := t.tx.Query(ctx, `
		SELECT id, user_id, story_id, chapter_id, granted_at, revoked_at
		FROM commerce.entitlements
		WHERE user_id = $1 AND revoked_at IS NULL ORDER BY granted_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Entitlement{}
	for rows.Next() {
		e := &Entitlement{}
		if err := rows.Scan(&e.ID, &e.UserID, &e.StoryID, &e.ChapterID, &e.GrantedAt, &e.RevokedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (t *PGTx) InsertEarning(ctx context.Context, e *CreatorEarning) error {
	_, err := t.tx.Exec(ctx, `
		INSERT INTO commerce.creator_earnings (id, purchase_id, creator_id, story_id, chapter_id, coins_earned, clawed_back, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		e.ID, e.PurchaseID, e.CreatorID, e.StoryID, e.ChapterID, e.CoinsEarned, e.ClawedBack, e.CreatedAt)
	if isUniqueViolation(err) {
		return ErrDuplicateRequest
	}
	return err
}

func (t *PGTx) ListEarningsByPurchase(ctx context.Context, purchaseID string) ([]*CreatorEarning, error) {
	rows, err := t.tx.Query(ctx, `
		SELECT id, purchase_id, creator_id, story_id, chapter_id, coins_earned, clawed_back, created_at
		FROM commerce.creator_earnings WHERE purchase_id = $1`, purchaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*CreatorEarning{}
	for rows.Next() {
		e := &CreatorEarning{}
		if err := rows.Scan(&e.ID, &e.PurchaseID, &e.CreatorID, &e.StoryID,
			&e.ChapterID, &e.CoinsEarned, &e.ClawedBack, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (t *PGTx) ListEarningsByCreator(ctx context.Context, creatorID string) ([]*CreatorEarning, error) {
	rows, err := t.tx.Query(ctx, `
		SELECT id, purchase_id, creator_id, story_id, chapter_id, coins_earned, clawed_back, created_at
		FROM commerce.creator_earnings
		WHERE creator_id = $1 AND NOT clawed_back ORDER BY created_at DESC`, creatorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*CreatorEarning{}
	for rows.Next() {
		e := &CreatorEarning{}
		if err := rows.Scan(&e.ID, &e.PurchaseID, &e.CreatorID, &e.StoryID,
			&e.ChapterID, &e.CoinsEarned, &e.ClawedBack, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (t *PGTx) MarkClawedBack(ctx context.Context, earningID string) error {
	_, err := t.tx.Exec(ctx,
		`UPDATE commerce.creator_earnings SET clawed_back = TRUE WHERE id = $1`, earningID)
	return err
}
