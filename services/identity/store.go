package identity

import (
	"context"
)

// Store persists users and sessions. MemoryStore (in identity.go) and
// PGStore (in pgstore.go) both implement it.
type Store interface {
	InsertUser(ctx context.Context, u *User) error
	GetUser(ctx context.Context, userID string) (*User, error)
	GetUserByEmail(ctx context.Context, normEmail string) (*User, error)
	SetBanStatus(ctx context.Context, userID string, banned bool) error

	InsertSession(ctx context.Context, s *Session) error
	GetSession(ctx context.Context, token string) (*Session, error)
	DeleteSession(ctx context.Context, token string) error
}
