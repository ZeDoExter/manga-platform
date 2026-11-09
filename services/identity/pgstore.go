package identity

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"manga-platform/pkg/pgmigrate"
)

// PGStore persists identity data in PostgreSQL (schema: identity).
type PGStore struct {
	pool *pgxpool.Pool
}

// NewPGStore creates a PG-backed store. Caller owns pool lifecycle.
func NewPGStore(pool *pgxpool.Pool) *PGStore {
	return &PGStore{pool: pool}
}
func (p *PGStore) InsertUser(ctx context.Context, u *User) error {
	_, err := p.pool.Exec(ctx, `
		INSERT INTO identity.users (id, email, password_hash, salt, role, banned, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		u.ID, u.Email, u.PasswordHash, u.Salt, u.Role, u.Banned, u.CreatedAt)
	if err != nil {
		if pgmigrate.IsUniqueViolation(err) {
			return ErrUserExists
		}
		return err
	}
	return nil
}

func (p *PGStore) GetUser(ctx context.Context, userID string) (*User, error) {
	u := &User{}
	if err := p.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, salt, role, banned, created_at
		FROM identity.users WHERE id = $1`, userID).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Salt, &u.Role, &u.Banned, &u.CreatedAt,
	); err != nil {
		return nil, pgmigrate.NotFound(err, ErrUserNotFound)
	}
	return u, nil
}

func (p *PGStore) GetUserByEmail(ctx context.Context, normEmail string) (*User, error) {
	u := &User{}
	if err := p.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, salt, role, banned, created_at
		FROM identity.users WHERE LOWER(email) = $1`, normEmail).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Salt, &u.Role, &u.Banned, &u.CreatedAt,
	); err != nil {
		return nil, pgmigrate.NotFound(err, ErrUserNotFound)
	}
	return u, nil
}

func (p *PGStore) SetBanStatus(ctx context.Context, userID string, banned bool) error {
	tag, err := p.pool.Exec(ctx,
		`UPDATE identity.users SET banned = $2 WHERE id = $1`, userID, banned)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (p *PGStore) InsertSession(ctx context.Context, s *Session) error {
	_, err := p.pool.Exec(ctx, `
		INSERT INTO identity.sessions (token, user_id, role, expires_at)
		VALUES ($1,$2,$3,$4)`,
		s.Token, s.UserID, s.Role, s.ExpiresAt)
	return err
}

func (p *PGStore) GetSession(ctx context.Context, token string) (*Session, error) {
	s := &Session{}
	if err := p.pool.QueryRow(ctx, `
		SELECT token, user_id, role, expires_at
		FROM identity.sessions WHERE token = $1`, token).Scan(
		&s.Token, &s.UserID, &s.Role, &s.ExpiresAt,
	); err != nil {
		return nil, pgmigrate.NotFound(err, ErrUnauthorized)
	}
	return s, nil
}
