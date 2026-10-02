package community

import (
	"errors"
	"time"
)

var (
	ErrLoginRequired      = errors.New("login required to post comments")
	ErrCommentNotFound    = errors.New("comment not found")
	ErrMaxReplyDepth      = errors.New("replies are limited to one level deep")
	ErrBlockedWordFound   = errors.New("comment contains prohibited content or blocked words")
	ErrUnlockRequired     = errors.New("must unlock coin-locked chapter before posting comments")
	ErrEditWindowExpired  = errors.New("edit window of 15 minutes has expired")
	ErrPermissionDenied   = errors.New("not authorized to modify this comment")
	ErrInvalidCommentBody = errors.New("comment body cannot be empty or exceed 2000 characters")
)

type CommentStatus string

const (
	StatusVisible CommentStatus = "visible"
	StatusHidden  CommentStatus = "hidden"
	StatusDeleted CommentStatus = "deleted"
)

type Comment struct {
	ID         string        `json:"id"`
	StoryID    string        `json:"story_id"`
	ChapterID  string        `json:"chapter_id"`
	UserID     string        `json:"user_id"`
	AuthorName string        `json:"author_name"`
	ParentID   string        `json:"parent_id,omitempty"` // Empty if top-level, set if 1-level reply
	Body       string        `json:"body"`
	Status     CommentStatus `json:"status"`
	LikeCount  int           `json:"like_count"`
	ReplyCount int           `json:"reply_count"`
	CreatedAt  time.Time     `json:"created_at"`
	EditedAt   *time.Time    `json:"edited_at,omitempty"`
}

// CommentPage contains a slice of comments and the cursor for the next page.
type CommentPage struct {
	Comments   []*Comment `json:"comments"`
	NextCursor string     `json:"next_cursor,omitempty"`
	HasMore    bool       `json:"has_more"`
}
