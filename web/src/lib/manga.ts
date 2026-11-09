import { rng, pick, hash } from "./util";
import type { Mood, PagePreset } from "./types";

export const PAGE_W = 800;
export const PAGE_H = 1200;

export type Scene = "speed" | "eyes" | "skyline" | "figure" | "burst" | "tone" | "dark";
export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Panel {
  id: number;
  poly: [number, number][];
  bbox: BBox;
  scene: Scene;
  seed: number;
  text?: string[];
  caption?: string;
  sfx?: string;
}
export interface PageSpec {
  key: string;
  n: number;
  kind: "title" | "story" | "splash" | "end";
  seed: number;
  panels: Panel[];
  chapter: number;
  title: string;
}

const DIALOGUE: Record<Mood, string[]> = { dread: ["Did you hear that?", "It's behind us.", "Don't turn around.", "Why is it smiling?", "That wasn't there before.", "Run. Now."],
rain: ["It's still raining.", "You came back.", "I remember you.", "Stay a little longer.", "The letter was never sent.", "Listen..."],
neon: ["Firmware's lying to us.", "Three seconds. Go!", "Who leased you?", "Trace complete.", "No masters. No leash.", "Sync the blade."],
ember: ["Kneel. Or burn.", "I remember every name.", "You swore an oath!", "The crown is hungry.", "Not today.", "Hold the line!"],
petal: ["Taste it. Honestly!", "This is... good?", "Don't look at me!", "I made it just for you.", "You're blushing!", "Again tomorrow?"],
calm: ["Tea first.", "There's no rush.", "Another quiet day.", "Fate can wait.", "Is that... a dragon?", "Open all night."],
stars: ["The line opens at 11:11.", "Who's that for?", "It has your handwriting.", "Look up.", "We were never lost.", "Deliver it anyway."],
tide: ["Depth reading's wrong.", "The sea remembers.", "Draw it anyway.", "Hear that singing?", "Hold the line steady.", "Chart it."],
snow: ["You're late.", "Come inside.", "I waited.", "Which door was it?", "Stay. Please.", "It's snowing again."], }
const SFX = ["DOON", "ZAAAA", "KRAKK", "SHHH", "THUD", "GOGOGO", "SWISH", "BAM", "...!", "DON!"];
const CAPTIONS = ["Three days earlier.", "The city never really sleeps.", "Somewhere, a bell rang.", "He had waited a long time for this.", "And then — nothing.", "No one remembers who spoke first."];

function bboxOf(poly: [number, number][]): BBox {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function layoutRows(r: () => number, rows: number[], margin = 40): [number, number][][] {
  const M = margin;
  const G = 18;
  const hw = rows.map(() => 0.75 + r() * 0.75);
  const hs = hw.reduce((a, b) => a + b, 0);
  let y = M;
  const out: [number, number][][] = [];
  rows.forEach((n, ri) => {
    const rh = ((PAGE_H - 2 * M) * hw[ri]) / hs;
    const y0 = y + (ri > 0 ? G / 2 : 0);
    const y1 = y + rh - (ri < rows.length - 1 ? G / 2 : 0);
    const ws = Array.from({ length: n }, () => 0.8 + r() * 0.7);
    const wsum = ws.reduce((a, b) => a + b, 0);
    const xb = [M];
    let acc = 0;
    for (let i = 0; i < n; i++) {
      acc += (ws[i] / wsum) * (PAGE_W - 2 * M);
      xb.push(M + acc);
    }
    const slant = Array.from({ length: n + 1 }, (_, i) => (i === 0 || i === n ? 0 : r() < 0.7 ? (r() - 0.5) * 90 : 0));
    for (let i = 0; i < n; i++) {
      const gl = i > 0 ? G / 2 : 0;
      const gr = i < n - 1 ? G / 2 : 0;
      const tl = xb[i] + slant[i] / 2 + gl;
      const tr = xb[i + 1] + slant[i + 1] / 2 - gr;
      const bl = xb[i] - slant[i] / 2 + gl;
      const br = xb[i + 1] - slant[i + 1] / 2 - gr;
      out.push([[tl, y0], [tr, y0], [br, y1], [bl, y1]]);
    }
    y += rh;
  });
  return out;
}

function pickScene(r: () => number, b: BBox): Scene {
  const ar = b.w / b.h;
  const area = (b.w * b.h) / (PAGE_W * PAGE_H);
  if (ar > 2.3) return pick(r, ["eyes", "eyes", "tone", "skyline"] as Scene[]);
  if (area > 0.28) return pick(r, ["skyline", "figure", "speed", "figure"] as Scene[]);
  if (ar < 0.7) return pick(r, ["figure", "figure", "dark", "speed"] as Scene[]);
  return pick(r, ["tone", "figure", "burst", "speed", "eyes", "dark", "skyline"] as Scene[]);
}

function assemble(r: () => number, polys: [number, number][][], mood: Mood, scenes?: Scene[], talk = 0.6): Panel[] {
  return polys.map((poly, i) => {
    const bbox = bboxOf(poly);
    const scene = scenes?.[i] ?? pickScene(r, bbox);
    const p: Panel = { id: i, poly, bbox, scene, seed: Math.floor(r() * 1e9) };
    if (scene === "burst" || (scene === "speed" && r() < 0.6)) p.sfx = pick(r, SFX);
    if (scene === "dark" || (scene !== "burst" && r() < 0.18)) p.caption = pick(r, CAPTIONS);
    else if (r() < talk && scene !== "burst") {
      const n = r() < 0.3 ? 2 : 1;
      p.text = Array.from({ length: n }, () => pick(r, DIALOGUE[mood]));
    }
    return p;
  });
}

function pageCount(storyId: string, ch: number): number { return 10 + (hash(`${storyId}#${ch}`) % 7); }

const ROW_SETS = [[1, 2, 1], [2, 1, 2], [1, 2, 2], [2, 2, 1], [1, 3, 1], [2, 1, 1, 2], [1, 2, 1, 1]];

function buildPage(story: { id: string; mood: Mood }, ch: number, n: number, total: number, title: string): PageSpec { const key = `${story.id}:${ch}:${n}`;
const r = rng(key);
const base = { key, n, seed: hash(key), chapter: ch, title };
const full: [number, number][] = [[0, 0], [PAGE_W, 0], [PAGE_W, PAGE_H], [0, PAGE_H]];
if (n === 1) return { ...base, kind: "title", panels: [{ id: 0, poly: full, bbox: bboxOf(full), scene: "skyline", seed: base.seed }] };
if (n === total) return { ...base, kind: "end", panels: [{ id: 0, poly: full, bbox: bboxOf(full), scene: "dark", seed: base.seed }] };
if (r() < 0.12) {
  const panels = assemble(r, layoutRows(r, [1], 50), story.mood, [pick(r, ["figure", "speed", "skyline"] as Scene[])], 0.3);
  return { ...base, kind: "splash", panels };
}
const rows = pick(r, ROW_SETS);
return { ...base, kind: "story", panels: assemble(r, layoutRows(r, rows), story.mood) }; }

export function buildChapterPages(story: { id: string; mood: Mood }, ch: number, title: string): PageSpec[] {
  const total = pageCount(story.id, ch);
  return Array.from({ length: total }, (_, i) => buildPage(story, ch, i + 1, total, title));
}

const PRESETS: Record<PagePreset, { rows: number[]; scenes: Scene[]; talk: number }> = {
  action: { rows: [1, 2, 1], scenes: ["speed", "burst", "figure", "eyes"], talk: 0.3 },
  dialogue: { rows: [2, 2, 1], scenes: ["tone", "figure", "figure", "tone", "tone"], talk: 1 },
  establishing: { rows: [1, 2], scenes: ["skyline", "figure", "tone"], talk: 0.4 },
  closeup: { rows: [1, 1, 2], scenes: ["eyes", "eyes", "dark", "tone"], talk: 0.6 },
  splash: { rows: [1], scenes: ["figure"], talk: 0 },
  blank: { rows: [1, 2, 1], scenes: ["tone", "tone", "tone", "tone"], talk: 0 },
};

export function presetPage(preset: PagePreset, seedKey: string, mood: Mood = "calm"): PageSpec {
  const r = rng(`${seedKey}:${preset}`);
  const cfg = PRESETS[preset];
  const polys = layoutRows(r, cfg.rows, preset === "splash" ? 50 : 40);
  const panels = assemble(r, polys, mood, cfg.scenes, cfg.talk);
  if (preset === "blank") panels.forEach((p) => { p.text = undefined; p.caption = undefined; p.sfx = undefined; });
  return { key: `${seedKey}:${preset}`, n: 0, kind: "story", seed: hash(seedKey), panels, chapter: 0, title: preset };
}
