package moderation

import (
	"context"
)

// Store persists audit logs. MemoryStore and PGStore both implement it.
type Store interface {
	InsertAuditLog(ctx context.Context, l *AuditLog) error
	ListAuditLogs(ctx context.Context) ([]*AuditLog, error)
}
