package catalog

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"manga-platform/pkg/pgmigrate"
)

// PGStore persists catalog data in PostgreSQL (schema: catalog).
type PGStore struct {
	pool *pgxpool.Pool
}

// NewPGStore creates a PG-backed store. Caller owns pool lifecycle.
func NewPGStore(pool *pgxpool.Pool) *PGStore {
	return &PGStore{pool: pool}
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
		if pgmigrate.IsUniqueViolationOn(err, "stories_pkey") {
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
		return nil, pgmigrate.NotFound(err, ErrStoryNotFound)
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

func (p *PGStore) UpdateStory(ctx context.Context, storyID, title, synopsis string, tags []string, coverKey *string) (*Story, error) {
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var cover any
	if coverKey != nil {
		cover = *coverKey
	}
	tag, err := tx.Exec(ctx, `
		UPDATE catalog.stories
		SET title = $2,
		    synopsis = $3,
		    cover_key = CASE WHEN $4::text IS NULL THEN cover_key ELSE $4 END
		WHERE id = $1`,
		storyID, title, synopsis, cover)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrStoryNotFound
	}
	if _, err := tx.Exec(ctx, `DELETE FROM catalog.story_tags WHERE story_id = $1`, storyID); err != nil {
		return nil, err
	}
	for _, t := range tags {
		if _, err := tx.Exec(ctx,
			`INSERT INTO catalog.story_tags (story_id, tag) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
			storyID, t); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return p.GetStory(ctx, storyID)
}

func (p *PGStore) InsertChapter(ctx context.Context, c *Chapter) error {
	_, err := p.pool.Exec(ctx, `
		INSERT INTO catalog.chapters (id, story_id, order_index, title, price_coins, page_keys, novel_text, status, auto_unlock_at, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		c.ID, c.StoryID, c.OrderIndex, c.Title, c.PriceCoins, c.PageKeys, c.NovelText, c.Status, c.AutoUnlockAt, c.CreatedAt)
	if err != nil {
		if pgmigrate.IsUniqueViolationOn(err, "chapters_pkey") {
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
		return nil, pgmigrate.NotFound(err, ErrChapterNotFound)
	}
	return c, nil
}

func (p *PGStore) UpdateChapter(ctx context.Context, chapterID, title string, priceCoins int64, pageKeys []string, novelText string) (*Chapter, error) {
	c := &Chapter{}
	if err := p.pool.QueryRow(ctx, `
		UPDATE catalog.chapters 
		SET title = $2, 
		    price_coins = $3,
		    page_keys = CASE WHEN $4::text[] IS NOT NULL AND cardinality($4::text[]) > 0 THEN $4 ELSE page_keys END,
		    novel_text = CASE WHEN $5 != '' THEN $5 ELSE novel_text END
		WHERE id = $1
		RETURNING id, story_id, order_index, title, price_coins, page_keys, novel_text, status, auto_unlock_at, created_at`,
		chapterID, title, priceCoins, pageKeys, novelText).Scan(
		&c.ID, &c.StoryID, &c.OrderIndex, &c.Title, &c.PriceCoins, &c.PageKeys,
		&c.NovelText, &c.Status, &c.AutoUnlockAt, &c.CreatedAt,
	); err != nil {
		return nil, pgmigrate.NotFound(err, ErrChapterNotFound)
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

func (p *PGStore) ListStories(ctx context.Context) ([]*Story, error) {
	rows, err := p.pool.Query(ctx, `SELECT id FROM catalog.stories ORDER BY created_at DESC LIMIT 200`)
	if err != nil {
		return nil, err
	}
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return nil, err
		}
		ids = append(ids, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	out := make([]*Story, 0, len(ids))
	for _, id := range ids {
		s, err := p.GetStory(ctx, id)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, nil
}
func (p *PGStore) DeleteStory(ctx context.Context, storyID string) error {
	_, err := p.pool.Exec(ctx, `DELETE FROM catalog.stories WHERE id = $1`, storyID)
	return err
}

func (p *PGStore) ListChaptersByStory(ctx context.Context, storyID string) ([]*Chapter, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT id, story_id, order_index, title, price_coins, page_keys, novel_text, status, auto_unlock_at, created_at
		FROM catalog.chapters WHERE story_id = $1 ORDER BY order_index ASC`, storyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*Chapter
	for rows.Next() {
		c := &Chapter{}
		if err := rows.Scan(&c.ID, &c.StoryID, &c.OrderIndex, &c.Title, &c.PriceCoins, &c.PageKeys,
			&c.NovelText, &c.Status, &c.AutoUnlockAt, &c.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (p *PGStore) DeleteChapter(ctx context.Context, chapterID string) error {
	tag, err := p.pool.Exec(ctx, `DELETE FROM catalog.chapters WHERE id = $1`, chapterID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrChapterNotFound
	}
	return nil
}
