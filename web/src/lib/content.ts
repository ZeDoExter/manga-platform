import type { Story, Taste, StudioStory, StudioPage, Mood, PagePreset, Account } from "./types";
import { TASTE_KEYS } from "./types";
import { rng, pick, shuffle, hash, clamp } from "./util";
import { NOVEL_POOLS, MOOD_POOLS } from "@/data/text";
import { LORE } from "@/data/lore";
import { STORY_MAP, STORIES } from "@/data/stories";
import { buildChapterPages, presetPage, type PageSpec } from "./manga";

/* ------------------------------ chapters ------------------------------ */
const ADJ = ["Silent", "Borrowed", "Hollow", "Crimson", "Quiet", "Paper", "Midnight", "Fractured", "Golden", "Last", "Salt", "Distant", "Unsent", "Burning", "Pale", "Sleepless", "Hidden", "Winter", "Rusted", "Whispering", "Third", "Ninth", "Forgotten", "Glass"];
const NOUN = ["Lantern", "Promise", "Harbor", "Echo", "Door", "Ledger", "Thread", "Storm", "Garden", "Signal", "Mask", "Letter", "Tide", "Bridge", "Crown", "Window", "Oath", "Map", "Mirror", "Bell", "Ember", "Station", "Shadow", "Season"];

export function chapterTitle(s: Pick<Story, "id" | "chapters" | "latest" | "first">, n: number): string {
  if (n === 1) return s.first;
  if (n === s.chapters) return s.latest;
  const r = rng(`${s.id}:t:${n}`);
  const f = r();
  if (f < 0.4) return `The ${pick(r, ADJ)} ${pick(r, NOUN)}`;
  if (f < 0.7) return `${pick(r, NOUN)} of ${pick(r, ADJ)} ${pick(r, NOUN)}s`;
  if (f < 0.85) return `A ${pick(r, ADJ)} ${pick(r, NOUN)}`;
  return `Where the ${pick(r, NOUN)} Remembers`;
}

/* ------------------------------ reader content ------------------------------ */
export type ReaderPageItem = { key: string; spec?: PageSpec; src?: string };
export type ReaderContent =
  | { kind: "novel"; paragraphs: string[]; title: string }
  | { kind: "manga"; pages: ReaderPageItem[]; title: string };

export function novelParagraphs(story: Pick<Story, "id" | "mood" | "tagline">, n: number): string[] {
  const pool = NOVEL_POOLS[story.id];
  const r = rng(`${story.id}:novel:${n}`);
  const moodPick = (m: Mood, k: number) => shuffle(r, MOOD_POOLS[m]).slice(0, k);
  const other = pick(r, Object.keys(MOOD_POOLS) as Mood[]);
  if (pool) {
    if (n === 1) return [...pool, ...moodPick(story.mood, 2)];
    const scenes = shuffle(r, pool.filter((p) => p !== "---")).slice(0, 5);
    return [...scenes.slice(0, 3), "---", ...scenes.slice(3), ...moodPick(story.mood, 2), "---", ...moodPick(other, 1)];
  }
  return [`*“${story.tagline}”*`, ...moodPick(story.mood, 3), "---", ...moodPick(other, 2), ...moodPick(story.mood, 1)];
}

export function staticContent(story: Story, n: number): ReaderContent {
  const title = chapterTitle(story, n);
  if (story.type === "manga" || story.type === "manhwa" || story.type === "manhua") {
    const pages = buildChapterPages(story, n, title).map((spec) => ({ key: spec.key, spec }));
    return { kind: "manga", pages, title };
  }
  return { kind: "novel", paragraphs: novelParagraphs(story, n), title };
}

export function defaultPages(count = 6, seed = "p"): StudioPage[] {
  const presets: PagePreset[] = ["splash", "establishing", "dialogue", "action", "closeup", "dialogue", "action", "splash"];
  return Array.from({ length: count }, (_, i) => ({ id: `${seed}-${i}`, kind: "preset" as const, preset: presets[i % presets.length] }));
}

export function studioContent(s: StudioStory, chapterId: string): ReaderContent | null {
  const ch = s.chapters.find((c) => c.id === chapterId);
  if (!ch) return null;
  const isVisual = s.type === "manga" || s.type === "manhwa" || s.type === "manhua";
  if (isVisual) {
    const pages = (ch.pages ?? []).map((p) =>
      p.kind === "upload" && p.src
        ? { key: p.id, src: p.src }
        : { key: p.id, spec: presetPage(p.preset ?? "blank", `${s.id}:${p.id}`, s.mood) },
    );
    return { kind: "manga", pages, title: ch.title };
  }
  const paragraphs = (ch.text ?? "").split(/\n{1,}/).map((t) => t.trim()).filter(Boolean);
  return { kind: "novel", paragraphs, title: ch.title };
}

export function studioToStory(s: StudioStory, owner: Account | undefined): Story {
  const published = s.chapters.filter((c) => c.status === "published").sort((a, b) => a.number - b.number);
  const last = published[published.length - 1];
  return {
    id: s.id,
    title: s.title,
    alt: s.tagline || "Original series",
    type: s.type,
    creator: owner?.id ?? s.ownerId,
    genres: s.genres.length ? s.genres : ["Original"],
    tags: s.tags,
    status: "Ongoing",
    rating: 4.5,
    votes: 12 + published.length * 7,
    followers: 120 + published.length * 40,
    weekly: 2,
    chapters: Math.max(1, published.length),
    latest: last?.title ?? "Coming soon",
    first: published[0]?.title ?? "Chapter One",
    updatedHours: last ? Math.max(0, (Date.now() - last.updatedAt) / 3600000) : 1,
    year: 2026,
    age: "13+",
    tagline: s.tagline || "A new story begins.",
    synopsis: s.synopsis || "No synopsis yet.",
    palette: s.palette,
    motif: s.motif,
    mood: s.mood,
    cover: s.coverImage,
    taste: { darkness: 5, pace: 5, romance: 4, mystery: 5, action: 5, humor: 5, depth: 5 },
    user: true,
  };
}

/* ------------------------------ echoes (living reading room) ------------------------------ */
export type EchoKind = "gasp" | "laugh" | "cry" | "fire" | "heart" | "think" | "paid";
export const ECHO_EMOJI: Record<EchoKind, string> = { gasp: "😱", laugh: "😂", cry: "😭", fire: "🔥", heart: "💗", think: "🤔", paid: "💬" };
export const ECHO_LABEL: Record<EchoKind, string> = { gasp: "gasped", laugh: "laughed", cry: "teared up", fire: "hyped", heart: "swooned", think: "theorized", paid: "commented" };
export interface Echo {
  pct: number;
  kind: EchoKind;
  count: number;
  text: string;
  mine?: boolean;
  live?: boolean;
}

/* ------------------------------ reader levels ------------------------------ */
export const LEVEL_TITLES = ["Page Turner", "Night Owl", "Bookmark Keeper", "Chapter Hunter", "Ink Drinker", "Plot Tracker", "Archivist", "Story Warden", "Lorekeeper", "Mythweaver"] as const;

export interface ReaderLevel {
  level: number;
  title: (typeof LEVEL_TITLES)[number];
  into: number;
  need: number;
  pct: number;
}

/** 1 chapter = 18 XP. Level n costs n*100 XP; titles rotate every 5 levels. */
export function readerLevel(chapters: number): ReaderLevel {
  const xp = chapters * 18;
  let level = 1;
  let floor = 0;
  while (xp >= floor + level * 100) {
    floor += level * 100;
    level += 1;
  }
  const need = level * 100;
  const into = xp - floor;
  return { level, title: LEVEL_TITLES[Math.floor((level - 1) / 5) % LEVEL_TITLES.length], into, need, pct: into / need };
}

/* ------------------------------ taste engine ------------------------------ */
export const TASTE_LABEL: Record<keyof Taste, string> = {
  darkness: "Darkness",
  pace: "Pace",
  romance: "Romance",
  mystery: "Mystery",
  action: "Action",
  humor: "Humor",
  depth: "Depth",
};

export function matchScore(s: Story, t: Taste, favGenres: string[] = []): number {
  let e = 0;
  for (const k of TASTE_KEYS) e += (s.taste[k] - t[k]) ** 2;
  const rms = Math.sqrt(e / TASTE_KEYS.length);
  const bonus = Math.min(9, s.genres.filter((g) => favGenres.includes(g)).length * 3);
  return Math.round(clamp(100 - rms * 10.5 + bonus, 18, 99));
}

export interface Reason {
  icon: string;
  text: string;
}

export function explainMatch(s: Story, t: Taste, favGenres: string[], seenIds: string[]): Reason[] {
  const out: Reason[] = [];
  const aligned = TASTE_KEYS.filter((k) => s.taste[k] >= 7 && Math.abs(s.taste[k] - t[k]) <= 2).sort((a, b) => s.taste[b] - s.taste[a]);
  if (aligned[0]) out.push({ icon: "◎", text: `${TASTE_LABEL[aligned[0]]} ${s.taste[aligned[0]]}/10 — right where you like it (${t[aligned[0]]}).` });
  const sg = s.genres.filter((g) => favGenres.includes(g));
  if (sg.length) out.push({ icon: "♥", text: `Hits your favorites: ${sg.join(" + ")}.` });
  for (const node of LORE) {
    if (!node.stories.includes(s.id)) continue;
    const other = node.stories.find((id) => id !== s.id && seenIds.includes(id));
    if (other && STORY_MAP[other]) {
      out.push({ icon: "✦", text: `Shares “${node.name}” with ${STORY_MAP[other].title}, which you've read.` });
      break;
    }
  }
  const off = TASTE_KEYS.filter((k) => t[k] >= 8 && s.taste[k] <= 3)[0];
  if (off && out.length < 3) out.push({ icon: "△", text: `Heads-up: lighter on ${TASTE_LABEL[off].toLowerCase()} than you usually read.` });
  if (!out.length) out.push({ icon: "◇", text: "A wildcard pick — outside your usual lane, rated highly by readers like you." });
  return out.slice(0, 3);
}

/* ------------------------------ reviews ------------------------------ */
export interface FakeReview {
  id: string;
  user: string;
  rating: number;
  text: string;
  hours: number;
  helpful: number;
}
const REVIEWERS = ["Juno Park", "Sakura V.", "Dmitri K.", "Amara O.", "Leo Fontaine", "Yuki S.", "Bram H.", "Noor A.", "Cleo M.", "Hiro T.", "Priya N.", "Mateo R."];
const REVIEW_T = [
  "{t} turned my commute into an event. The {tag} angle alone is worth the follow.",
  "I started for the {genre} and stayed for the characters. Chapter {n} wrecked me in the best way.",
  "Pacing is immaculate. Every update ends exactly where I'm most desperate for the next one.",
  "The way {t} handles {tag} feels fresh — I've read a lot of {genre} and this stands out.",
  "Not perfect (the middle drags a little), but the payoff is incredible. 4 stars rounded up out of love.",
  "I've recommended {t} to six friends. Three of them have already texted me theories.",
  "Beautiful and bruising. {creator} writes endings that feel like doors quietly closing.",
  "Rereading from the start and spotting foreshadowing everywhere. Masterclass in setup.",
];

export function seedReviews(s: Story, creatorName: string): FakeReview[] {
  const r = rng(`${s.id}:rev`);
  return Array.from({ length: 7 }, (_, i) => {
    const rating = r() < 0.65 ? 5 : r() < 0.7 ? 4 : 3;
    const text = pick(r, REVIEW_T)
      .replace("{t}", s.title)
      .replace("{tag}", pick(r, s.tags.length ? s.tags : ["premise"]).toLowerCase())
      .replace("{genre}", pick(r, s.genres).toLowerCase())
      .replace("{creator}", creatorName)
      .replace("{n}", String(Math.max(2, Math.floor(r() * s.chapters))));
    return { id: `${s.id}-r${i}`, user: REVIEWERS[(hash(s.id) + i * 3) % REVIEWERS.length], rating, text, hours: Math.floor(5 + r() * 24 * 40), helpful: Math.floor(r() * r() * 900) };
  });
}

export function ratingDist(s: Story): number[] {
  const r = rng(`${s.id}:dist`);
  const hi = clamp((s.rating - 3) / 2, 0.1, 1);
  const w = [r() * 0.02, r() * 0.03, 0.04 + r() * 0.05, 0.1 + (1 - hi) * 0.25 + r() * 0.05, 0.1];
  w[4] = 1 - w[0] - w[1] - w[2] - w[3];
  return w.map((x) => Math.max(0.005, x));
}

/* ------------------------------ catalogue helpers ------------------------------ */
export function relatedStories(s: Story, n = 6): Story[] {
  return STORIES.filter((o) => o.id !== s.id)
    .map((o) => ({ o, score: o.genres.filter((g) => s.genres.includes(g)).length * 3 + o.tags.filter((t) => s.tags.includes(t)).length * 2 + (o.type === s.type ? 1 : 0) + o.rating / 10 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.o);
}

export function readMinutes(paragraphs: string[], wpm = 230): number {
  const w = paragraphs.join(" ").split(/\s+/).length;
  return Math.max(1, Math.round(w / wpm));
}
