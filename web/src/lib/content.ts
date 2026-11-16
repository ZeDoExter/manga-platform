import type { Story, Taste, StudioStory, StudioPage, PagePreset, Account } from "./types";
import { TASTE_KEYS } from "./types";
import { clamp } from "./util";
import { presetPage, type PageSpec } from "./manga";

/* ------------------------------ reader content ------------------------------ */
export type ReaderPageItem = { key: string; spec?: PageSpec; src?: string };
export type ReaderContent =
  | { kind: "novel"; paragraphs: string[]; title: string }
  | { kind: "manga"; pages: ReaderPageItem[]; title: string };

export function defaultPages(count = 6, seed = "p"): StudioPage[] {
  const presets: PagePreset[] = ["splash", "establishing", "dialogue", "action", "closeup", "dialogue", "action", "splash"];
  return Array.from({ length: count }, (_, i) => ({ id: `${seed}-${i}`, kind: "preset" as const, preset: presets[i % presets.length] }));
}

export function resolveImageUrl(src?: string): string {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/") || src.startsWith("data:")) {
    return src;
  }
  return `/api/media/image/${src}`;
}

export function studioContent(s: StudioStory, chapterId: string): ReaderContent | null {
  const ch = s.chapters.find((c) => c.id === chapterId);
  if (!ch) return null;
  const isVisual = s.type === "manga" || s.type === "manhwa" || s.type === "manhua";
  if (isVisual) {
    const pages = (ch.pages ?? []).map((p) =>
      p.kind === "upload" && p.src
        ? { key: p.id, src: resolveImageUrl(p.src) }
        : { key: p.id, spec: presetPage(p.preset ?? "blank", `${s.id}:${p.id}`, s.mood) },
    );
    return { kind: "manga", pages, title: ch.title || `Chapter ${ch.number}` };
  }
  const paragraphs = (ch.text ?? "").split(/\n{1,}/).map((t) => t.trim()).filter(Boolean);
  return { kind: "novel", paragraphs, title: ch.title || `Chapter ${ch.number}` };
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
    rating: 0,
    votes: 0,
    followers: 0,
    weekly: 0,
    chapters: published.length,
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
const LEVEL_TITLES = ["Page Turner", "Night Owl", "Bookmark Keeper", "Chapter Hunter", "Ink Drinker", "Plot Tracker", "Archivist", "Story Warden", "Lorekeeper", "Mythweaver"] as const;

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

export function explainMatch(s: Story, t: Taste, favGenres: string[]): Reason[] {
  const out: Reason[] = [];
  const aligned = TASTE_KEYS.filter((k) => s.taste[k] >= 7 && Math.abs(s.taste[k] - t[k]) <= 2).sort((a, b) => s.taste[b] - s.taste[a]);
  if (aligned[0]) out.push({ icon: "◎", text: `${TASTE_LABEL[aligned[0]]} ${s.taste[aligned[0]]}/10 — right where you like it (${t[aligned[0]]}).` });
  const sg = s.genres.filter((g) => favGenres.includes(g));
  if (sg.length) out.push({ icon: "♥", text: `Hits your favorites: ${sg.join(" + ")}.` });
  const off = TASTE_KEYS.filter((k) => t[k] >= 8 && s.taste[k] <= 3)[0];
  if (off && out.length < 3) out.push({ icon: "△", text: `Heads-up: lighter on ${TASTE_LABEL[off].toLowerCase()} than you usually read.` });
  if (!out.length) out.push({ icon: "◇", text: "A wildcard pick — outside your usual lane." });
  return out.slice(0, 3);
}

/* ------------------------------ catalogue helpers ------------------------------ */
export function relatedStories(s: Story, list: Story[], n = 6): Story[] {
  return list.filter((o) => o.id !== s.id)
    .map((o) => ({ o, score: o.genres.filter((g) => s.genres.includes(g)).length * 3 + o.tags.filter((t) => s.tags.includes(t)).length * 2 + (o.type === s.type ? 1 : 0) + o.rating / 10 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.o);
}
