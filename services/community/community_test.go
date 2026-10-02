package community_test

import (
	"context"
	"testing"
	"time"

	"manga-platform/services/catalog"
	"manga-platform/services/commerce"
	"manga-platform/services/community"
)

func setupTestCommunity(t *testing.T) (*catalog.Service, *commerce.Service, *community.Service) {
	cat := catalog.NewService()
	com := commerce.NewService()
	comm := community.NewService(cat, com)
	return cat, com, comm
}

func TestFR_CM4_GuestCannotPost(t *testing.T) {
	ctx := context.Background()
	_, _, comm := setupTestCommunity(t)

	// Guest attempts to post
	_, err := comm.PostComment(ctx, community.PostCommentRequest{
		StoryID:    "story-1",
		ChapterID:  "chap-1",
		UserID:     "", // Guest
		AuthorName: "Anonymous",
		Body:       "Great chapter!",
	})

	if err != community.ErrLoginRequired {
		t.Fatalf("expected ErrLoginRequired for guest, got %v", err)
	}
}

func TestFR_CM5_OneLevelReplyConstraint(t *testing.T) {
	ctx := context.Background()
	_, _, comm := setupTestCommunity(t)

	// 1. Post top-level comment
	topLevel, err := comm.PostComment(ctx, community.PostCommentRequest{
		StoryID:    "story-1",
		ChapterID:  "chap-1",
		UserID:     "user-1",
		AuthorName: "Alice",
		Body:       "This is a top level comment",
	})
	if err != nil {
		t.Fatalf("failed to post top level comment: %v", err)
	}

	// 2. Post reply to top-level comment (Level 1 reply -> ALLOWED)
	replyLevel1, err := comm.PostComment(ctx, community.PostCommentRequest{
		StoryID:    "story-1",
		ChapterID:  "chap-1",
		UserID:     "user-2",
		AuthorName: "Bob",
		ParentID:   topLevel.ID,
		Body:       "I agree with Alice!",
	})
	if err != nil {
		t.Fatalf("failed to post level-1 reply: %v", err)
	}

	// 3. Post reply to replyLevel1 (Level 2 reply -> REJECTED per FR-CM5)
	_, err = comm.PostComment(ctx, community.PostCommentRequest{
		StoryID:    "story-1",
		ChapterID:  "chap-1",
		UserID:     "user-3",
		AuthorName: "Charlie",
		ParentID:   replyLevel1.ID, // replying to a reply!
		Body:       "Replying to Bob",
	})
	if err != community.ErrMaxReplyDepth {
		t.Fatalf("expected ErrMaxReplyDepth, got %v", err)
	}
}

func TestFR_CM7_BlockedWordFilter(t *testing.T) {
	ctx := context.Background()
	_, _, comm := setupTestCommunity(t)

	// Post comment containing blocked word "scam"
	_, err := comm.PostComment(ctx, community.PostCommentRequest{
		StoryID:    "story-1",
		ChapterID:  "chap-1",
		UserID:     "user-1",
		AuthorName: "BadActor",
		Body:       "Check out this crypto SCAM link",
	})

	if err != community.ErrBlockedWordFound {
		t.Fatalf("expected ErrBlockedWordFound, got %v", err)
	}
}

func TestFR_CM12_LockedChapterCommentGating(t *testing.T) {
	ctx := context.Background()
	cat, com, comm := setupTestCommunity(t)

	story, _ := cat.CreateStory(ctx, "creator-1", catalog.StoryTypeManga, "VIP Story", "test", nil, nil)
	// Paid chapter (50 coins)
	chap, _ := cat.CreateChapter(ctx, story.ID, 5, "Chapter 5 (Paid)", 50, []string{"page.webp"}, "", nil)

	buyerID := "reader-alice"

	// 1. User has NOT unlocked chapter -> posting rejected (FR-CM12)
	_, err := comm.PostComment(ctx, community.PostCommentRequest{
		StoryID:    story.ID,
		ChapterID:  chap.ID,
		UserID:     buyerID,
		AuthorName: "Alice",
		Body:       "Spoiler alert comment!",
	})
	if err != community.ErrUnlockRequired {
		t.Fatalf("expected ErrUnlockRequired before buying, got %v", err)
	}

	// 2. User buys chapter in commerce
	_, _ = com.TopUp(ctx, buyerID, 100, commerce.CoinPurchased, "pay-test", "idem-topup")
	_, err = com.PurchaseChapter(ctx, commerce.PurchaseRequest{
		UserID:         buyerID,
		StoryID:        story.ID,
		ChapterID:      chap.ID,
		Price:          50,
		CreatorSplits:  []commerce.CreatorSplit{{CreatorID: "creator-1", Percentage: 100}},
		IdempotencyKey: "buy-to-comment",
	})
	if err != nil {
		t.Fatalf("PurchaseChapter failed: %v", err)
	}

	// 3. User posts comment after unlocking -> ALLOWED!
	cmt, err := comm.PostComment(ctx, community.PostCommentRequest{
		StoryID:    story.ID,
		ChapterID:  chap.ID,
		UserID:     buyerID,
		AuthorName: "Alice",
		Body:       "Great chapter, now I can comment!",
	})
	if err != nil {
		t.Fatalf("expected post to succeed after unlock, got %v", err)
	}
	if cmt.ID == "" {
		t.Error("expected non-empty comment ID")
	}
}

func TestCursorPagination_NoFlappingOrSkipping(t *testing.T) {
	ctx := context.Background()
	_, _, comm := setupTestCommunity(t)

	// Post 5 comments with unique microsecond offsets
	for i := range 5 {
		_, _ = comm.PostComment(ctx, community.PostCommentRequest{
			StoryID:    "story-page",
			ChapterID:  "chap-page",
			UserID:     "user-1",
			AuthorName: "Alice",
			Body:       "Comment #" + string(rune('A'+i)),
		})
		time.Sleep(1 * time.Millisecond) // Ensure distinct timestamps
	}

	// Page 1: limit 2
	page1, err := comm.ListChapterComments(ctx, "chap-page", "", 2)
	if err != nil {
		t.Fatalf("Page 1 failed: %v", err)
	}
	if len(page1.Comments) != 2 {
		t.Fatalf("expected 2 comments in page 1, got %d", len(page1.Comments))
	}
	if !page1.HasMore {
		t.Error("expected hasMore=true for page 1")
	}

	// Page 2: with next cursor
	page2, err := comm.ListChapterComments(ctx, "chap-page", page1.NextCursor, 2)
	if err != nil {
		t.Fatalf("Page 2 failed: %v", err)
	}
	if len(page2.Comments) != 2 {
		t.Fatalf("expected 2 comments in page 2, got %d", len(page2.Comments))
	}

	// Verify no items duplicate between page 1 and page 2
	for _, c1 := range page1.Comments {
		for _, c2 := range page2.Comments {
			if c1.ID == c2.ID {
				t.Errorf("duplicate comment ID %s between page 1 and page 2", c1.ID)
			}
		}
	}
}

func TestFR_CM5_EditWindowAndIDOR(t *testing.T) {
	ctx := context.Background()
	_, _, comm := setupTestCommunity(t)

	cmt, _ := comm.PostComment(ctx, community.PostCommentRequest{
		StoryID:    "s1",
		ChapterID:  "c1",
		UserID:     "user-alice",
		AuthorName: "Alice",
		Body:       "Original comment",
	})

	// 1. Another user tries to edit (IDOR attack) -> REJECTED
	_, err := comm.EditComment(ctx, cmt.ID, "user-hacker", "Hacked text")
	if err != community.ErrPermissionDenied {
		t.Fatalf("expected ErrPermissionDenied for IDOR edit, got %v", err)
	}

	// 2. Author edits within window -> ALLOWED
	edited, err := comm.EditComment(ctx, cmt.ID, "user-alice", "Updated text")
	if err != nil {
		t.Fatalf("expected edit to succeed, got %v", err)
	}
	if edited.Body != "Updated text" {
		t.Errorf("expected updated body, got %s", edited.Body)
	}
	if edited.EditedAt == nil {
		t.Error("expected EditedAt timestamp to be set")
	}

	// 3. Soft delete
	err = comm.SoftDeleteComment(ctx, cmt.ID, "user-alice", false)
	if err != nil {
		t.Fatalf("SoftDelete failed: %v", err)
	}
	if cmt.Status != community.StatusDeleted {
		t.Errorf("expected status deleted, got %s", cmt.Status)
	}
}

func TestFR_CM3_StoryAllCommentsAndModerationHide(t *testing.T) {
	ctx := context.Background()
	_, _, comm := setupTestCommunity(t)

	// Post comments on 2 different chapters in the same story
	c1, _ := comm.PostComment(ctx, community.PostCommentRequest{
		StoryID:    "story-collab",
		ChapterID:  "chap-1",
		UserID:     "user-1",
		AuthorName: "Alice",
		Body:       "Comment on chapter 1",
	})
	c2, _ := comm.PostComment(ctx, community.PostCommentRequest{
		StoryID:    "story-collab",
		ChapterID:  "chap-2",
		UserID:     "user-2",
		AuthorName: "Bob",
		Body:       "Comment on chapter 2",
	})

	// List story-wide comments (FR-CM3)
	page, err := comm.ListStoryComments(ctx, "story-collab", "", 10)
	if err != nil {
		t.Fatalf("ListStoryComments failed: %v", err)
	}
	if len(page.Comments) != 2 {
		t.Fatalf("expected 2 story comments, got %d", len(page.Comments))
	}

	// Admin hides comment 1 (FR-CM7)
	err = comm.SetCommentStatus(ctx, c1.ID, community.StatusHidden)
	if err != nil {
		t.Fatalf("SetCommentStatus failed: %v", err)
	}

	// Now story-wide comments only list visible comment 2
	pageAfter, _ := comm.ListStoryComments(ctx, "story-collab", "", 10)
	if len(pageAfter.Comments) != 1 || pageAfter.Comments[0].ID != c2.ID {
		t.Errorf("expected only visible comment c2, got %+v", pageAfter.Comments)
	}
}
