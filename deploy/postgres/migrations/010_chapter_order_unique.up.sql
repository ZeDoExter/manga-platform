-- 010_chapter_order_unique: one row per (story, chapter number).
-- Different writers used different id schemes (seed chap_* vs synced
-- <story>-ch-N), so the same chapter number could exist twice. Keep the row
-- with the most content (page count + text length), lowest id breaks ties.
-- InsertChapter maps the conflict to ErrChapterExists (HTTP 409), which the
-- web sync already handles as upsert.

DELETE FROM catalog.chapters a USING catalog.chapters b
WHERE a.story_id = b.story_id
  AND a.order_index = b.order_index
  AND a.id <> b.id
  AND (
    COALESCE(array_length(a.page_keys, 1), 0) + COALESCE(length(a.novel_text), 0)
    < COALESCE(array_length(b.page_keys, 1), 0) + COALESCE(length(b.novel_text), 0)
    OR (
      COALESCE(array_length(a.page_keys, 1), 0) + COALESCE(length(a.novel_text), 0)
      = COALESCE(array_length(b.page_keys, 1), 0) + COALESCE(length(b.novel_text), 0)
      AND a.id > b.id
    )
  );

ALTER TABLE catalog.chapters
  ADD CONSTRAINT chapters_story_order_uniq UNIQUE (story_id, order_index);
