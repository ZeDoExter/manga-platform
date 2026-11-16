package catalog_test

import (
	"context"
	"testing"
	"time"

	"manga-platform/services/catalog"
)

func TestFR_C1_CreateStoryWithSplits(t *testing.T) {
	ctx := context.Background()
	svc := catalog.NewService()

	// 1. Invalid split (total 90% != 100%)
	badSplits := []catalog.CreatorSplit{
		{CreatorID: "creator-1", Percentage: 50},
		{CreatorID: "creator-2", Percentage: 40},
	}
	_, err := svc.CreateStory(ctx, "creator-1", catalog.StoryTypeManga, "My Manga", "Synopsis", []string{"Action"}, badSplits)
	if err != catalog.ErrInvalidSplit {
		t.Fatalf("expected ErrInvalidSplit, got %v", err)
	}

	// 2. Valid split (70% / 30% = 100%)
	goodSplits := []catalog.CreatorSplit{
		{CreatorID: "author-1", Percentage: 70},
		{CreatorID: "artist-1", Percentage: 30},
	}
	story, err := svc.CreateStory(ctx, "author-1", catalog.StoryTypeManga, "Collab Series", "Awesome story", []string{"Action", "Fantasy"}, goodSplits)
	if err != nil {
		t.Fatalf("CreateStory failed: %v", err)
	}
	if story.ID == "" {
		t.Fatal("expected non-empty story ID")
	}

	// 3. Fetch story
	fetched, err := svc.GetStory(ctx, story.ID)
	if err != nil {
		t.Fatalf("GetStory failed: %v", err)
	}
	if len(fetched.CreatorSplits) != 2 {
		t.Errorf("expected 2 creator splits, got %d", len(fetched.CreatorSplits))
	}
}

func TestFR_C2_CreateChapterAndFreeStatus(t *testing.T) {
	ctx := context.Background()
	svc := catalog.NewService()

	story, _ := svc.CreateStory(ctx, "creator-1", catalog.StoryTypeManga, "Sample Manga", "Synopsis", nil, nil)

	// 1. Free chapter (Price = 0)
	freeChap, err := svc.CreateChapter(ctx, story.ID, 1, "Chapter 1: The Beginning", 0, []string{"page1.webp", "page2.webp"}, "", nil)
	if err != nil {
		t.Fatalf("CreateChapter failed: %v", err)
	}
	if !freeChap.IsFree() {
		t.Error("chapter with price 0 must be free")
	}

	// 2. Paid chapter (Price = 30 coins)
	paidChap, err := svc.CreateChapter(ctx, story.ID, 2, "Chapter 2: The Journey", 30, []string{"page3.webp"}, "", nil)
	if err != nil {
		t.Fatalf("CreateChapter failed: %v", err)
	}
	if paidChap.IsFree() {
		t.Error("chapter with price 30 must not be free")
	}

	// 3. Paid chapter with AutoUnlock in the past (FR-X4)
	past := time.Now().Add(-1 * time.Hour)
	autoUnlockChap, _ := svc.CreateChapter(ctx, story.ID, 3, "Chapter 3: Old Chapter", 30, []string{"page4.webp"}, "", &past)
	if !autoUnlockChap.IsFree() {
		t.Error("chapter whose auto-unlock date has passed must be free")
	}

	// 4. Status update
	err = svc.SetChapterStatus(ctx, paidChap.ID, catalog.StatusTakenDown)
	if err != nil {
		t.Fatalf("SetChapterStatus failed: %v", err)
	}
	updated, _ := svc.GetChapter(ctx, paidChap.ID)
	if updated.Status != catalog.StatusTakenDown {
		t.Errorf("expected status %s, got %s", catalog.StatusTakenDown, updated.Status)
	}
}

func TestWebSync_ExplicitIDsAndChapterUpdate(t *testing.T) {
	ctx := context.Background()
	svc := catalog.NewService()

	story, err := svc.CreateStoryWithID(ctx, "story-web-1", "creator-1", catalog.StoryTypeManga, "Web Sync Story", "Synced from web", []string{"Action"}, nil)
	if err != nil {
		t.Fatalf("CreateStoryWithID failed: %v", err)
	}
	if story.ID != "story-web-1" {
		t.Fatalf("expected caller-assigned story ID, got %q", story.ID)
	}
	if _, err := svc.CreateStoryWithID(ctx, "story-web-1", "creator-1", catalog.StoryTypeManga, "Duplicate", "", nil, nil); err != catalog.ErrStoryExists {
		t.Fatalf("expected ErrStoryExists, got %v", err)
	}

	chapter, err := svc.CreateChapterWithID(ctx, "story-web-1-ch-4", story.ID, 4, "Chapter 4", 30, nil, "", nil)
	if err != nil {
		t.Fatalf("CreateChapterWithID failed: %v", err)
	}
	if chapter.ID != "story-web-1-ch-4" {
		t.Fatalf("expected caller-assigned chapter ID, got %q", chapter.ID)
	}
	if _, err := svc.CreateChapterWithID(ctx, "story-web-1-ch-4", story.ID, 4, "Duplicate", 30, nil, "", nil); err != catalog.ErrChapterExists {
		t.Fatalf("expected ErrChapterExists, got %v", err)
	}

	updated, err := svc.UpdateChapter(ctx, chapter.ID, "Chapter 4 - Revised", 35, nil, "")
	if err != nil {
		t.Fatalf("UpdateChapter failed: %v", err)
	}
	if updated.Title != "Chapter 4 - Revised" || updated.PriceCoins != 35 {
		t.Fatalf("unexpected updated chapter: %+v", updated)
	}
}

func TestListStoriesAndChaptersByStory(t *testing.T) {
	ctx := context.Background()
	svc := catalog.NewService()
	s1, err := svc.CreateStory(ctx, "creator-1", catalog.StoryTypeManga, "Story One", "", nil, nil)
	if err != nil {
		t.Fatalf("CreateStory: %v", err)
	}
	if _, err := svc.CreateStory(ctx, "creator-1", catalog.StoryTypeNovel, "Story Two", "", nil, nil); err != nil {
		t.Fatalf("CreateStory: %v", err)
	}
	stories, err := svc.ListStories(ctx)
	if err != nil {
		t.Fatalf("ListStories: %v", err)
	}
	if len(stories) != 2 {
		t.Fatalf("expected 2 stories, got %d", len(stories))
	}
	if _, err := svc.CreateChapter(ctx, s1.ID, 1, "Ch 1", 0, nil, "", nil); err != nil {
		t.Fatalf("CreateChapter: %v", err)
	}
	if _, err := svc.CreateChapter(ctx, s1.ID, 2, "Ch 2", 0, nil, "", nil); err != nil {
		t.Fatalf("CreateChapter: %v", err)
	}
	chaps, err := svc.ListChaptersByStory(ctx, s1.ID)
	if err != nil {
		t.Fatalf("ListChaptersByStory: %v", err)
	}
	if len(chaps) != 2 || chaps[0].OrderIndex != 1 || chaps[1].OrderIndex != 2 {
		t.Fatalf("chapters not ordered by order_index: %+v", chaps)
	}
}

func TestUpdateChapter_RejectsBadInput(t *testing.T) {
	ctx := context.Background()
	svc := catalog.NewService()
	if _, err := svc.UpdateChapter(ctx, "chap-x", "", 10, nil, ""); err == nil {
		t.Error("expected empty title to fail")
	}
	if _, err := svc.UpdateChapter(ctx, "chap-x", "T", -1, nil, ""); err == nil {
		t.Error("expected negative price to fail")
	}
}

func TestUpdateStory_PersistsMetadataAndCover(t *testing.T) {
	ctx := context.Background()
	svc := catalog.NewService()
	story, err := svc.CreateStoryWithID(ctx, "story_cov", "author-1", catalog.StoryTypeManga,
		"Old title", "old syn", []string{"Action"}, nil)
	if err != nil {
		t.Fatalf("CreateStoryWithID: %v", err)
	}

	cover := "stories/story_cov/cover/abc.webp"
	updated, err := svc.UpdateStory(ctx, story.ID, "New title", "new syn", []string{"Drama"}, &cover)
	if err != nil {
		t.Fatalf("UpdateStory: %v", err)
	}
	if updated.Title != "New title" || updated.Synopsis != "new syn" || updated.CoverKey != cover {
		t.Fatalf("metadata not updated: %+v", updated)
	}
	if len(updated.Tags) != 1 || updated.Tags[0] != "Drama" {
		t.Fatalf("tags not rewritten: %+v", updated.Tags)
	}

	// nil cover leaves the stored key untouched (local-only data-URL cover).
	kept, err := svc.UpdateStory(ctx, story.ID, "New title", "new syn", []string{"Drama"}, nil)
	if err != nil {
		t.Fatalf("UpdateStory nil cover: %v", err)
	}
	if kept.CoverKey != cover {
		t.Fatalf("nil cover must keep %q, got %q", cover, kept.CoverKey)
	}

	// Empty cover clears it ("use generated cover").
	empty := ""
	cleared, err := svc.UpdateStory(ctx, story.ID, "New title", "new syn", nil, &empty)
	if err != nil {
		t.Fatalf("UpdateStory clear cover: %v", err)
	}
	if cleared.CoverKey != "" {
		t.Fatalf("expected cleared cover, got %q", cleared.CoverKey)
	}

	if _, err := svc.UpdateStory(ctx, story.ID, "", "s", nil, nil); err != catalog.ErrInvalidTitle {
		t.Fatalf("expected ErrInvalidTitle, got %v", err)
	}
	if _, err := svc.UpdateStory(ctx, "story_missing", "T", "s", nil, nil); err != catalog.ErrStoryNotFound {
		t.Fatalf("expected ErrStoryNotFound, got %v", err)
	}
}

func TestDeleteChapter_RemovesAndIdempotent(t *testing.T) {
	ctx := context.Background()
	svc := catalog.NewService()
	story, err := svc.CreateStory(ctx, "author", catalog.StoryTypeManga,
		"T", "s", nil, []catalog.CreatorSplit{{CreatorID: "author", Percentage: 100}})
	if err != nil {
		t.Fatalf("CreateStory: %v", err)
	}
	chap, err := svc.CreateChapter(ctx, story.ID, 1, "Ch1", 0, nil, "", nil)
	if err != nil {
		t.Fatalf("CreateChapter: %v", err)
	}
	if err := svc.DeleteChapter(ctx, chap.ID); err != nil {
		t.Fatalf("DeleteChapter: %v", err)
	}
	if _, err := svc.GetChapter(ctx, chap.ID); err != catalog.ErrChapterNotFound {
		t.Fatalf("expected ErrChapterNotFound, got %v", err)
	}
	list, err := svc.ListChaptersByStory(ctx, story.ID)
	if err != nil || len(list) != 0 {
		t.Fatalf("expected empty chapter list, got %+v (%v)", list, err)
	}
	if err := svc.DeleteChapter(ctx, chap.ID); err != catalog.ErrChapterNotFound {
		t.Fatalf("expected ErrChapterNotFound on repeat, got %v", err)
	}
	if err := svc.DeleteChapter(ctx, ""); err != catalog.ErrInvalidID {
		t.Fatalf("expected ErrInvalidID, got %v", err)
	}
}

func TestInsertChapter_DuplicateOrderRejected(t *testing.T) {
	ctx := context.Background()
	svc := catalog.NewService()
	story, err := svc.CreateStory(ctx, "author", catalog.StoryTypeManga,
		"T", "s", nil, []catalog.CreatorSplit{{CreatorID: "author", Percentage: 100}})
	if err != nil {
		t.Fatalf("CreateStory: %v", err)
	}
	if _, err := svc.CreateChapter(ctx, story.ID, 1, "Ch1", 0, nil, "", nil); err != nil {
		t.Fatalf("CreateChapter: %v", err)
	}
	if _, err := svc.CreateChapter(ctx, story.ID, 1, "Ch1 dup", 0, nil, "", nil); err != catalog.ErrChapterExists {
		t.Fatalf("expected ErrChapterExists for duplicate order, got %v", err)
	}
}
