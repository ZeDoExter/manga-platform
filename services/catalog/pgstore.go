package catalog

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PGStore persists catalog data in PostgreSQL (schema: catalog).
type PGStore struct {
	pool *pgxpool.Pool
}

// NewPGStore creates a PG-backed store. Caller owns pool lifecycle.
func NewPGStore(pool *pgxpool.Pool) *PGStore {
	return &PGStore{pool: pool}
}

func pgErr(err error, notFound error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return notFound
	}
	return err
}

func isUniqueViolation(err error, constraint string) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return constraint == "" || pgErr.ConstraintName == constraint
	}
	return false
}

func isFKViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23503"
}

func (p *PGStore) InsertStory(ctx context.Context, s *Story) error {
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		INSERT INTO catalog.stories (id, owner_id, type, title, cover_key, synopsis, status, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		s.ID, s.OwnerID, s.Type, s.Title, s.CoverKey, s.Synopsis, s.Status, s.CreatedAt); err != nil {
		if isUniqueViolation(err, "stories_pkey") {
			return ErrStoryExists
		}
		return err
	}
	for _, tag := range s.Tags {
		if _, err := tx.Exec(ctx,
			`INSERT INTO catalog.story_tags (story_id, tag) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
			s.ID, tag); err != nil {
			return err
		}
	}
	for _, sp := range s.CreatorSplits {
		if _, err := tx.Exec(ctx,
			`INSERT INTO catalog.creator_splits (story_id, creator_id, percentage) VALUES ($1,$2,$3)`,
			s.ID, sp.CreatorID, sp.Percentage); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (p *PGStore) GetStory(ctx context.Context, storyID string) (*Story, error) {
	s := &Story{}
	if err := p.pool.QueryRow(ctx, `
		SELECT id, owner_id, type, title, cover_key, synopsis, status, created_at
		FROM catalog.stories WHERE id = $1`, storyID).Scan(
		&s.ID, &s.OwnerID, &s.Type, &s.Title, &s.CoverKey, &s.Synopsis, &s.Status, &s.CreatedAt,
	); err != nil {
		return nil, pgErr(err, ErrStoryNotFound)
	}
	rows, err := p.pool.Query(ctx, `SELECT tag FROM catalog.story_tags WHERE story_id = $1`, storyID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			rows.Close()
			return nil, err
		}
		s.Tags = append(s.Tags, tag)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows, err = p.pool.Query(ctx,
		`SELECT creator_id, percentage FROM catalog.creator_splits WHERE story_id = $1`, storyID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var sp CreatorSplit
		if err := rows.Scan(&sp.CreatorID, &sp.Percentage); err != nil {
			rows.Close()
			return nil, err
		}
		s.CreatorSplits = append(s.CreatorSplits, sp)
	}
	rows.Close()
	return s, rows.Err()
}

func (p *PGStore) InsertChapter(ctx context.Context, c *Chapter) error {
	_, err := p.pool.Exec(ctx, `
		INSERT INTO catalog.chapters (id, story_id, order_index, title, price_coins, page_keys, novel_text, status, auto_unlock_at, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		c.ID, c.StoryID, c.OrderIndex, c.Title, c.PriceCoins, c.PageKeys, c.NovelText, c.Status, c.AutoUnlockAt, c.CreatedAt)
	if err != nil {
		if isUniqueViolation(err, "chapters_pkey") {
			return ErrChapterExists
		}
		if isFKViolation(err) {
			return ErrStoryNotFound
		}
		return err
	}
	return nil
}

func (p *PGStore) GetChapter(ctx context.Context, chapterID string) (*Chapter, error) {
	c := &Chapter{}
	if err := p.pool.QueryRow(ctx, `
		SELECT id, story_id, order_index, title, price_coins, page_keys, novel_text, status, auto_unlock_at, created_at
		FROM catalog.chapters WHERE id = $1`, chapterID).Scan(
		&c.ID, &c.StoryID, &c.OrderIndex, &c.Title, &c.PriceCoins, &c.PageKeys,
		&c.NovelText, &c.Status, &c.AutoUnlockAt, &c.CreatedAt,
	); err != nil {
		return nil, pgErr(err, ErrChapterNotFound)
	}
	return c, nil
}

func (p *PGStore) UpdateChapter(ctx context.Context, chapterID, title string, priceCoins int64) (*Chapter, error) {
	c := &Chapter{}
	if err := p.pool.QueryRow(ctx, `
		UPDATE catalog.chapters SET title = $2, price_coins = $3 WHERE id = $1
		RETURNING id, story_id, order_index, title, price_coins, page_keys, novel_text, status, auto_unlock_at, created_at`,
		chapterID, title, priceCoins).Scan(
		&c.ID, &c.StoryID, &c.OrderIndex, &c.Title, &c.PriceCoins, &c.PageKeys,
		&c.NovelText, &c.Status, &c.AutoUnlockAt, &c.CreatedAt,
	); err != nil {
		return nil, pgErr(err, ErrChapterNotFound)
	}
	return c, nil
}

func (p *PGStore) SetChapterStatus(ctx context.Context, chapterID string, status ContentStatus) error {
	tag, err := p.pool.Exec(ctx,
		`UPDATE catalog.chapters SET status = $2 WHERE id = $1`, chapterID, status)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrChapterNotFound
	}
	return nil
}
