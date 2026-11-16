//go:build integration

package catalog_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	dbmigrations "manga-platform/deploy/postgres"
	"manga-platform/pkg/pgmigrate"
	"manga-platform/services/catalog"
)

// TestPGStore_Contract runs the core catalog flows against real Postgres.
// Requires TEST_DATABASE_URL (CI provides a postgres service).
func TestPGStore_Contract(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer pool.Close()
	if err := pgmigrate.Up(ctx, pool, dbmigrations.Migrations, dbmigrations.Dir); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	suffix := time.Now().UnixNano()
	_ = suffix

	svc := catalog.NewServiceWithStore(catalog.NewPGStore(pool))

	// Story + splits round-trip
	story, err := svc.CreateStory(ctx, "pg-author", catalog.StoryTypeManga,
		"PG Story", "syn", []string{"Action"},
		[]catalog.CreatorSplit{{CreatorID: "pg-author", Percentage: 70}, {CreatorID: "pg-artist", Percentage: 30}})
	if err != nil {
		t.Fatalf("CreateStory: %v", err)
	}
	got, err := svc.GetStory(ctx, story.ID)
	if err != nil {
		t.Fatalf("GetStory: %v", err)
	}
	if len(got.CreatorSplits) != 2 || len(got.Tags) != 1 {
		t.Fatalf("story round-trip wrong: %+v", got)
	}

	cover := "stories/pg/cover/abc.webp"
	mono := "mono"
	if _, err := svc.UpdateStory(ctx, story.ID, "PG Story v2", "syn2", []string{"Drama"}, &cover, &mono); err != nil {
		t.Fatalf("UpdateStory: %v", err)
	}
	got2, _ := svc.GetStory(ctx, story.ID)
	if got2.Title != "PG Story v2" || got2.CoverKey != cover || len(got2.Tags) != 1 || got2.ColorMode != "mono" {
		t.Fatalf("story update not persisted: %+v", got2)
	}

	// Duplicate story ID rejected
	dupStory := *story
	if err := catalog.NewPGStore(pool).InsertStory(ctx, &dupStory); err != catalog.ErrStoryExists {
		t.Fatalf("expected ErrStoryExists, got %v", err)
	}

	// Chapter round-trip + status
	chap, err := svc.CreateChapter(ctx, story.ID, 1, "Ch1", 30, []string{"p1.webp"}, "", nil)
	if err != nil {
		t.Fatalf("CreateChapter: %v", err)
	}
	if chap.IsFree() {
		t.Fatal("paid chapter must not be free")
	}
	if _, err := svc.UpdateChapter(ctx, chap.ID, "Ch1 revised", 40, nil, ""); err != nil {
		t.Fatalf("UpdateChapter: %v", err)
	}
	updated, _ := svc.GetChapter(ctx, chap.ID)
	if updated.Title != "Ch1 revised" || updated.PriceCoins != 40 {
		t.Fatalf("update not persisted: %+v", updated)
	}
	if err := svc.SetChapterStatus(ctx, chap.ID, catalog.StatusTakenDown); err != nil {
		t.Fatalf("SetChapterStatus: %v", err)
	}
	after, _ := svc.GetChapter(ctx, chap.ID)
	if after.Status != catalog.StatusTakenDown {
		t.Fatalf("status not persisted: %s", after.Status)
	}
	chap2, err := svc.CreateChapter(ctx, story.ID, 2, "Ch2", 0, []string{}, "", nil)
	if err != nil {
		t.Fatalf("CreateChapter ch2: %v", err)
	}
	if err := svc.DeleteChapter(ctx, chap2.ID); err != nil {
		t.Fatalf("DeleteChapter: %v", err)
	}
	if _, err := svc.GetChapter(ctx, chap2.ID); err != catalog.ErrChapterNotFound {
		t.Fatalf("expected ErrChapterNotFound after delete, got %v", err)
	}
	if _, err := svc.CreateChapter(ctx, story.ID, 1, "dup", 0, []string{}, "", nil); err != catalog.ErrChapterExists {
		t.Fatalf("expected ErrChapterExists for duplicate order on PG, got %v", err)
	}
	// Chapter for missing story rejected (empty slice keeps NOT NULL happy).
	if _, err := svc.CreateChapter(ctx, "story_missing", 1, "x", 0, []string{}, "", nil); err != catalog.ErrStoryNotFound {
		t.Fatalf("expected ErrStoryNotFound, got %v", err)
	}
	// List paths round-trip on PG too.
	stories, err := svc.ListStories(ctx)
	if err != nil || len(stories) == 0 {
		t.Fatalf("ListStories: %v (%d rows)", err, len(stories))
	}
	chaps, err := svc.ListChaptersByStory(ctx, story.ID)
	if err != nil || len(chaps) == 0 {
		t.Fatalf("ListChaptersByStory: %v (%d rows)", err, len(chaps))
	}
}
