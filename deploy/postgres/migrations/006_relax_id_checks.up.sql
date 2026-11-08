-- 006_relax_id_checks: allow web-generated IDs alongside prefixed IDs.
-- Web BFF uses "<storyId>-ch-<n>" chapter keys and raw story slugs;
-- strict prefix CHECKs from 001 break ensureStory/ensureChapter sync.

ALTER TABLE catalog.stories DROP CONSTRAINT IF EXISTS stories_id_check;
ALTER TABLE catalog.stories ADD CONSTRAINT stories_id_check CHECK (LENGTH(id) > 0);

ALTER TABLE catalog.chapters DROP CONSTRAINT IF EXISTS chapters_id_check;
ALTER TABLE catalog.chapters ADD CONSTRAINT chapters_id_check CHECK (LENGTH(id) > 0);
