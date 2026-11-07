import { index, integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

/** Shared "Living Reading Room" echoes: anonymous reactions pinned to a position inside a chapter. */
export const echoes = pgTable(
  "echoes",
  {
    id: serial("id").primaryKey(),
    storyId: text("story_id").notNull(),
    chapter: integer("chapter").notNull(),
    pct: real("pct").notNull(),
    kind: text("kind").notNull(),
    author: text("author").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("echoes_story_ch").on(t.storyId, t.chapter)],
);
