package moderation

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// PGStore persists moderation data in PostgreSQL (schema: moderation).
type PGStore struct {
	pool *pgxpool.Pool
}

// NewPGStore creates a PG-backed store. Caller owns pool lifecycle.
func NewPGStore(pool *pgxpool.Pool) *PGStore {
	return &PGStore{pool: pool}
}

func (p *PGStore) InsertAuditLog(ctx context.Context, l *AuditLog) error {
	_, err := p.pool.Exec(ctx, `
		INSERT INTO moderation.audit_logs (id, admin_id, action, target_id, reason, created_at)
		VALUES ($1,$2,$3,$4,$5,$6)`,
		l.ID, l.AdminID, l.Action, l.TargetID, l.Reason, l.CreatedAt)
	return err
}

func (p *PGStore) ListAuditLogs(ctx context.Context) ([]*AuditLog, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT id, admin_id, action, target_id, reason, created_at
		FROM moderation.audit_logs ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]*AuditLog, 0)
	for rows.Next() {
		l := &AuditLog{}
		if err := rows.Scan(&l.ID, &l.AdminID, &l.Action, &l.TargetID, &l.Reason, &l.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}
