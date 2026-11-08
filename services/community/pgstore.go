package community

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PGStore persists community data in PostgreSQL (schema: community).
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

func scanComment(row pgx.Row) (*Comment, error) {
	c := &Comment{}
	if err := row.Scan(
		&c.ID, &c.StoryID, &c.ChapterID, &c.UserID, &c.AuthorName, &c.ParentID,
		&c.Body, &c.Status, &c.LikeCount, &c.ReplyCount, &c.CreatedAt, &c.EditedAt,
	); err != nil {
		return nil, err
	}
	return c, nil
}

func (p *PGStore) InsertComment(ctx context.Context, c *Comment) error {
	_, err := p.pool.Exec(ctx, `
		INSERT INTO community.comments (id, story_id, chapter_id, user_id, author_name, parent_id, body, status, like_count, reply_count, created_at, edited_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		c.ID, c.StoryID, c.ChapterID, c.UserID, c.AuthorName, c.ParentID,
		c.Body, c.Status, c.LikeCount, c.ReplyCount, c.CreatedAt, c.EditedAt)
	return err
}

func (p *PGStore) GetComment(ctx context.Context, commentID string) (*Comment, error) {
	c, err := scanComment(p.pool.QueryRow(ctx, `
		SELECT id, story_id, chapter_id, user_id, author_name, parent_id, body, status, like_count, reply_count, created_at, edited_at
		FROM community.comments WHERE id = $1`, commentID))
	if err != nil {
		return nil, pgErr(err, ErrCommentNotFound)
	}
	return c, nil
}

func (p *PGStore) ListComments(ctx context.Context, scope, scopeID string, cursorNano int64, limit int) ([]*Comment, error) {
	col := "chapter_id"
	if scope == "story" {
		col = "story_id"
	}
	cursorTime := time.Unix(0, cursorNano)
	rows, err := p.pool.Query(ctx, `
		SELECT id, story_id, chapter_id, user_id, author_name, parent_id, body, status, like_count, reply_count, created_at, edited_at
		FROM community.comments
		WHERE `+col+` = $1 AND status != 'hidden' AND ($2 OR created_at < $3)
		ORDER BY created_at DESC LIMIT $4`,
		scopeID, cursorNano <= 0, cursorTime, limit+1)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*Comment
	for rows.Next() {
		c, err := scanComment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (p *PGStore) UpdateCommentBody(ctx context.Context, commentID, body string) error {
	now := time.Now()
	tag, err := p.pool.Exec(ctx,
		`UPDATE community.comments SET body = $2, edited_at = $3 WHERE id = $1`,
		commentID, body, now)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrCommentNotFound
	}
	return nil
}

func (p *PGStore) SetCommentStatus(ctx context.Context, commentID string, status CommentStatus) error {
	tag, err := p.pool.Exec(ctx,
		`UPDATE community.comments SET status = $2 WHERE id = $1`, commentID, status)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrCommentNotFound
	}
	return nil
}

func (p *PGStore) IncrementReplyCount(ctx context.Context, commentID string) error {
	_, err := p.pool.Exec(ctx,
		`UPDATE community.comments SET reply_count = reply_count + 1 WHERE id = $1`, commentID)
	return err
}

func (p *PGStore) AddBlockedWord(ctx context.Context, word string) error {
	_, err := p.pool.Exec(ctx,
		`INSERT INTO community.blocked_words (word) VALUES ($1) ON CONFLICT DO NOTHING`, word)
	return err
}

func (p *PGStore) ListBlockedWords(ctx context.Context) ([]string, error) {
	rows, err := p.pool.Query(ctx, `SELECT word FROM community.blocked_words`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var w string
		if err := rows.Scan(&w); err != nil {
			return nil, err
		}
		out = append(out, w)
	}
	return out, rows.Err()
}
