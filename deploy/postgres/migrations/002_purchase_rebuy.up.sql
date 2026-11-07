-- 002: allow re-purchase after a takedown reversal.
-- A (user, chapter) may have many reversed purchases but only one active.
ALTER TABLE commerce.purchases DROP CONSTRAINT purchases_user_id_chapter_id_key;
CREATE UNIQUE INDEX purchases_active_user_chapter
  ON commerce.purchases (user_id, chapter_id) WHERE status = 'active';
