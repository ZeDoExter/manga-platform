package library_test

import (
	"context"
	"testing"
	"time"

	"manga-platform/services/library"
)

func TestFR_L1_SaveAndResumeProgress(t *testing.T) {
	ctx := context.Background()
	svc := library.NewService()

	saved, err := svc.SaveProgress(ctx, "u1", "story-1", "chap-5", library.ContentManga, 12)
	if err != nil {
		t.Fatalf("SaveProgress: %v", err)
	}
	if saved.Position != 12 {
		t.Fatalf("expected position 12, got %d", saved.Position)
	}

	got, err := svc.GetProgress(ctx, "u1", "story-1")
	if err != nil || got == nil {
		t.Fatalf("GetProgress: %v %+v", err, got)
	}
	if got.ChapterID != "chap-5" || got.Position != 12 {
		t.Fatalf("wrong progress: %+v", got)
	}

	// Overwrite with newer position
	if _, err := svc.SaveProgress(ctx, "u1", "story-1", "chap-6", library.ContentManga, 3); err != nil {
		t.Fatalf("resave: %v", err)
	}
	got2, _ := svc.GetProgress(ctx, "u1", "story-1")
	if got2.ChapterID != "chap-6" || got2.Position != 3 {
		t.Fatalf("overwrite failed: %+v", got2)
	}

	// Unknown story returns nil, not error
	none, err := svc.GetProgress(ctx, "u1", "story-nope")
	if err != nil || none != nil {
		t.Fatalf("expected nil progress, got %+v %v", none, err)
	}
}

func TestFR_L1_InvalidProgressRejected(t *testing.T) {
	ctx := context.Background()
	svc := library.NewService()
	if _, err := svc.SaveProgress(ctx, "", "s", "c", library.ContentManga, 0); err != library.ErrInvalidID {
		t.Fatalf("expected ErrInvalidID, got %v", err)
	}
	if _, err := svc.SaveProgress(ctx, "u", "s", "c", library.ContentManga, -1); err != library.ErrInvalidPosition {
		t.Fatalf("expected ErrInvalidPosition, got %v", err)
	}
	if _, err := svc.SaveProgress(ctx, "u", "s", "c", "comic", 0); err != library.ErrInvalidType {
		t.Fatalf("expected ErrInvalidType, got %v", err)
	}
}

func TestFR_L2_FollowsIdempotent(t *testing.T) {
	ctx := context.Background()
	svc := library.NewService()
	if err := svc.Follow(ctx, "u1", "story-1"); err != nil {
		t.Fatalf("Follow: %v", err)
	}
	if err := svc.Follow(ctx, "u1", "story-1"); err != nil {
		t.Fatalf("second Follow: %v", err)
	}
	list, _ := svc.ListFollows(ctx, "u1")
	if len(list) != 1 {
		t.Fatalf("expected 1 follow, got %d", len(list))
	}
	if err := svc.Unfollow(ctx, "u1", "story-1"); err != nil {
		t.Fatalf("Unfollow: %v", err)
	}
	if err := svc.Unfollow(ctx, "u1", "story-1"); err != nil {
		t.Fatalf("second Unfollow: %v", err)
	}
	if list, _ := svc.ListFollows(ctx, "u1"); len(list) != 0 {
		t.Fatalf("expected 0 follows, got %d", len(list))
	}
}

func TestFR_L2_BookmarksIdempotent(t *testing.T) {
	ctx := context.Background()
	svc := library.NewService()
	if err := svc.AddBookmark(ctx, "u1", "chap-1", "story-1"); err != nil {
		t.Fatalf("AddBookmark: %v", err)
	}
	if err := svc.AddBookmark(ctx, "u1", "chap-1", "story-1"); err != nil {
		t.Fatalf("second AddBookmark: %v", err)
	}
	list, _ := svc.ListBookmarks(ctx, "u1")
	if len(list) != 1 {
		t.Fatalf("expected 1 bookmark, got %d", len(list))
	}
	if err := svc.RemoveBookmark(ctx, "u1", "chap-1"); err != nil {
		t.Fatalf("RemoveBookmark: %v", err)
	}
	if list, _ := svc.ListBookmarks(ctx, "u1"); len(list) != 0 {
		t.Fatalf("expected 0 bookmarks, got %d", len(list))
	}
}

func TestFR_L3_ContinueReadingOrder(t *testing.T) {
	ctx := context.Background()
	svc := library.NewService()
	if _, err := svc.SaveProgress(ctx, "u1", "story-old", "c1", library.ContentManga, 1); err != nil {
		t.Fatal(err)
	}
	time.Sleep(5 * time.Millisecond)
	if _, err := svc.SaveProgress(ctx, "u1", "story-new", "c9", library.ContentNovel, 4500); err != nil {
		t.Fatal(err)
	}
	rows, err := svc.ContinueReading(ctx, "u1", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 2 || rows[0].StoryID != "story-new" {
		t.Fatalf("expected newest first, got %+v", rows)
	}
}

func TestFR_L4_MergeGuestLastWriteWins(t *testing.T) {
	ctx := context.Background()
	svc := library.NewService()

	old := time.Now().Add(-time.Hour)
	recent := time.Now()
	// Account already has a recent row
	if _, err := svc.SaveProgress(ctx, "u1", "story-1", "chap-9", library.ContentManga, 20); err != nil {
		t.Fatal(err)
	}
	items := []*library.Progress{
		{StoryID: "story-1", ChapterID: "chap-2", ContentType: library.ContentManga, Position: 3, UpdatedAt: old},
		{StoryID: "story-2", ChapterID: "chap-1", ContentType: library.ContentNovel, Position: 1200, UpdatedAt: recent},
	}
	if err := svc.MergeGuestProgress(ctx, "u1", items); err != nil {
		t.Fatalf("Merge: %v", err)
	}
	// story-1 keeps the newer account row, story-2 is adopted
	kept, _ := svc.GetProgress(ctx, "u1", "story-1")
	if kept.ChapterID != "chap-9" {
		t.Fatalf("last-write-wins violated: %+v", kept)
	}
	adopted, _ := svc.GetProgress(ctx, "u1", "story-2")
	if adopted == nil || adopted.Position != 1200 {
		t.Fatalf("guest row not adopted: %+v", adopted)
	}

	// Repeat merge is a no-op
	if err := svc.MergeGuestProgress(ctx, "u1", items); err != nil {
		t.Fatalf("repeat merge: %v", err)
	}
	kept2, _ := svc.GetProgress(ctx, "u1", "story-1")
	if kept2.ChapterID != "chap-9" {
		t.Fatalf("repeat merge changed data: %+v", kept2)
	}

	// Oversized payload rejected before any write
	big := make([]*library.Progress, library.MaxMergeItems+1)
	for i := range big {
		big[i] = &library.Progress{StoryID: "s", ChapterID: "c", ContentType: library.ContentManga, UpdatedAt: recent}
	}
	if err := svc.MergeGuestProgress(ctx, "u1", big); err != library.ErrPayloadTooLarge {
		t.Fatalf("expected ErrPayloadTooLarge, got %v", err)
	}
}
