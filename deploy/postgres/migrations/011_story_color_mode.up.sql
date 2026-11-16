-- 011_story_color_mode: color vs black-and-white artwork per story.
-- Used for badges and the Discover filter. Novels ignore it client-side.
-- Existing rows default to color; the web sync PATCHes the real value.

ALTER TABLE catalog.stories
  ADD COLUMN color_mode TEXT NOT NULL DEFAULT 'color'
  CHECK (color_mode IN ('color', 'mono'));
