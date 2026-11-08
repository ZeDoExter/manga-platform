package community

import (
	"context"
)

// Store persists comments and blocked words. MemoryStore and PGStore both implement it.
type Store interface {
	InsertComment(ctx context.Context, c *Comment) error
	GetComment(ctx context.Context, commentID string) (*Comment, error)
	// ListComments returns non-hidden comments newest-first, older than cursorNano (0 = from newest).
	// scope is "chapter" or "story", scopeID the chapter/story ID. Returns at most limit+1 rows
	// (the extra row signals HasMore).
	ListComments(ctx context.Context, scope, scopeID string, cursorNano int64, limit int) ([]*Comment, error)
	UpdateCommentBody(ctx context.Context, commentID, body string) error
	SetCommentStatus(ctx context.Context, commentID string, status CommentStatus) error
	IncrementReplyCount(ctx context.Context, commentID string) error
	AddBlockedWord(ctx context.Context, word string) error
	ListBlockedWords(ctx context.Context) ([]string, error)
}
