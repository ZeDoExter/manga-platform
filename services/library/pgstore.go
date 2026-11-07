package library

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PGStore persists library data in PostgreSQL (schema: library).
type PGStore struct {
	pool *pgxpool.Pool
}

// NewPGStore creates a PG-backed store. Caller owns pool lifecycle.
func NewPGStore(pool *pgxpool.Pool) *PGStore {
	return &PGStore{pool: pool}
}

func (p *PGStore) UpsertProgress(ctx context.Context, pr *Progress) error {
	_, err := p.pool.Exec(ctx, `
		INSERT INTO library.reading_progress (user_id, story_id, chapter_id, content_type, position, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (user_id, story_id) DO UPDATE SET
			chapter_id = EXCLUDED.chapter_id, content_type = EXCLUDED.content_type,
			position = EXCLUDED.position, updated_at = EXCLUDED.updated_at`,
		pr.UserID, pr.StoryID, pr.ChapterID, pr.ContentType, pr.Position, pr.UpdatedAt)
	return err
}

func (p *PGStore) GetProgress(ctx context.Context, userID, storyID string) (*Progress, error) {
	pr := &Progress{}
	err := p.pool.QueryRow(ctx, `
		SELECT user_id, story_id, chapter_id, content_type, position, updated_at
		FROM library.reading_progress WHERE user_id = $1 AND story_id = $2`,
		userID, storyID).Scan(
		&pr.UserID, &pr.StoryID, &pr.ChapterID, &pr.ContentType, &pr.Position, &pr.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return pr, nil
}

func (p *PGStore) ListRecent(ctx context.Context, userID string, limit int) ([]*Progress, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT user_id, story_id, chapter_id, content_type, position, updated_at
		FROM library.reading_progress
		WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Progress{}
	for rows.Next() {
		pr := &Progress{}
		if err := rows.Scan(&pr.UserID, &pr.StoryID, &pr.ChapterID, &pr.ContentType, &pr.Position, &pr.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, pr)
	}
	return out, rows.Err()
}

func (p *PGStore) MergeProgress(ctx context.Context, userID string, items []*Progress) error {
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for _, pr := range items {
		if _, err := tx.Exec(ctx, `
			INSERT INTO library.reading_progress (user_id, story_id, chapter_id, content_type, position, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6)
			ON CONFLICT (user_id, story_id) DO UPDATE SET
				chapter_id = EXCLUDED.chapter_id, content_type = EXCLUDED.content_type,
				position = EXCLUDED.position, updated_at = EXCLUDED.updated_at
			WHERE library.reading_progress.updated_at < EXCLUDED.updated_at`,
			userID, pr.StoryID, pr.ChapterID, pr.ContentType, pr.Position, pr.UpdatedAt); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (p *PGStore) PutFollow(ctx context.Context, userID, storyID string, at time.Time) error {
	_, err := p.pool.Exec(ctx, `
		INSERT INTO library.follows (user_id, story_id, created_at) VALUES ($1,$2,$3)
		ON CONFLICT DO NOTHING`, userID, storyID, at)
	return err
}

func (p *PGStore) DeleteFollow(ctx context.Context, userID, storyID string) error {
	_, err := p.pool.Exec(ctx,
		`DELETE FROM library.follows WHERE user_id = $1 AND story_id = $2`, userID, storyID)
	return err
}

func (p *PGStore) ListFollows(ctx context.Context, userID string) ([]*Follow, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT user_id, story_id, created_at FROM library.follows
		WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Follow{}
	for rows.Next() {
		f := &Follow{}
		if err := rows.Scan(&f.UserID, &f.StoryID, &f.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func (p *PGStore) PutBookmark(ctx context.Context, userID, chapterID, storyID string, at time.Time) error {
	_, err := p.pool.Exec(ctx, `
		INSERT INTO library.bookmarks (user_id, chapter_id, story_id, created_at) VALUES ($1,$2,$3,$4)
		ON CONFLICT (user_id, chapter_id) DO UPDATE SET story_id = EXCLUDED.story_id`,
		userID, chapterID, storyID, at)
	return err
}

func (p *PGStore) DeleteBookmark(ctx context.Context, userID, chapterID string) error {
	_, err := p.pool.Exec(ctx,
		`DELETE FROM library.bookmarks WHERE user_id = $1 AND chapter_id = $2`, userID, chapterID)
	return err
}

func (p *PGStore) ListBookmarks(ctx context.Context, userID string) ([]*Bookmark, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT user_id, chapter_id, story_id, created_at FROM library.bookmarks
		WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Bookmark{}
	for rows.Next() {
		b := &Bookmark{}
		if err := rows.Scan(&b.UserID, &b.ChapterID, &b.StoryID, &b.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}
