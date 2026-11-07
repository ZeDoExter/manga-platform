//go:build integration

package library_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	dbmigrations "manga-platform/deploy/postgres"
	"manga-platform/pkg/pgmigrate"
	"manga-platform/services/library"
)

func pgService(t *testing.T) *library.Service {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	if err := pgmigrate.Up(ctx, pool, dbmigrations.Migrations, dbmigrations.Dir); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return library.NewServiceWithStore(library.NewPGStore(pool))
}

// TestPG_Contract_LibraryFlow covers progress/follow/bookmark/merge on PG.
func TestPG_Contract_LibraryFlow(t *testing.T) {
	ctx := context.Background()
	svc := pgService(t)
	user := fmt.Sprintf("pg-lib-%d", time.Now().UnixNano())

	if _, err := svc.SaveProgress(ctx, user, "story-1", "chap-3", library.ContentManga, 7); err != nil {
		t.Fatalf("SaveProgress: %v", err)
	}
	got, err := svc.GetProgress(ctx, user, "story-1")
	if err != nil || got == nil || got.Position != 7 {
		t.Fatalf("GetProgress: %+v %v", got, err)
	}
	if _, err := svc.SaveProgress(ctx, user, "story-1", "chap-4", library.ContentManga, 1); err != nil {
		t.Fatalf("overwrite: %v", err)
	}
	got2, _ := svc.GetProgress(ctx, user, "story-1")
	if got2.ChapterID != "chap-4" {
		t.Fatalf("overwrite failed: %+v", got2)
	}

	if err := svc.Follow(ctx, user, "story-1"); err != nil {
		t.Fatalf("Follow: %v", err)
	}
	if err := svc.Follow(ctx, user, "story-1"); err != nil {
		t.Fatalf("Follow again: %v", err)
	}
	if list, _ := svc.ListFollows(ctx, user); len(list) != 1 {
		t.Fatalf("expected 1 follow, got %d", len(list))
	}
	if err := svc.Unfollow(ctx, user, "story-1"); err != nil {
		t.Fatalf("Unfollow: %v", err)
	}
	if list, _ := svc.ListFollows(ctx, user); len(list) != 0 {
		t.Fatalf("expected 0 follows, got %d", len(list))
	}

	if err := svc.AddBookmark(ctx, user, "chap-9", "story-2"); err != nil {
		t.Fatalf("AddBookmark: %v", err)
	}
	if list, _ := svc.ListBookmarks(ctx, user); len(list) != 1 {
		t.Fatalf("expected 1 bookmark, got %d", len(list))
	}
	if err := svc.RemoveBookmark(ctx, user, "chap-9"); err != nil {
		t.Fatalf("RemoveBookmark: %v", err)
	}

	// Merge: older guest row loses, newer wins, repeat is a no-op.
	old := time.Now().Add(-time.Hour)
	if err := svc.MergeGuestProgress(ctx, user, []*library.Progress{
		{StoryID: "story-1", ChapterID: "chap-1", ContentType: library.ContentManga, Position: 1, UpdatedAt: old},
		{StoryID: "story-9", ChapterID: "chap-1", ContentType: library.ContentNovel, Position: 500, UpdatedAt: time.Now()},
	}); err != nil {
		t.Fatalf("Merge: %v", err)
	}
	kept, _ := svc.GetProgress(ctx, user, "story-1")
	if kept.ChapterID != "chap-4" {
		t.Fatalf("merge overwrote newer row: %+v", kept)
	}
	rows, _ := svc.ContinueReading(ctx, user, 10)
	if len(rows) != 2 {
		t.Fatalf("expected 2 continue rows, got %d", len(rows))
	}
}
