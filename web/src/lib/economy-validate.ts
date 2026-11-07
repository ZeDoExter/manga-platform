import type { AccessInput, ChapterSync, CoinType, PurchaseInput, StorySync } from "./economy";
import type { StoryType } from "./types";

const STORY_TYPES: StoryType[] = ["manga", "manhwa", "manhua", "light-novel", "web-novel", "original"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function integer(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function storyType(value: unknown): StoryType | null {
  return typeof value === "string" && STORY_TYPES.includes(value as StoryType) ? (value as StoryType) : null;
}

function parseStory(value: unknown): StorySync | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, 160);
  const title = text(value.title, 160);
  const type = storyType(value.type);
  const creator = text(value.creator, 160);
  const synopsis = typeof value.synopsis === "string" ? value.synopsis.slice(0, 2000) : "";
  if (!id || !title || !type || !creator) return null;
  const tags = Array.isArray(value.tags)
    ? value.tags.filter((t): t is string => typeof t === "string").map((t) => t.slice(0, 40)).slice(0, 12)
    : [];
  return { id, title, type, creator, synopsis, tags };
}

function parseChapter(value: unknown): ChapterSync | null {
  if (!isRecord(value)) return null;
  const number = integer(value.number, 1, 100000);
  const title = text(value.title, 160);
  const price = integer(value.price, 0, 1000);
  if (number === null || !title || price === null) return null;
  return { number, title, price };
}

export function parseAccessInput(value: unknown): AccessInput | null {
  if (!isRecord(value)) return null;
  const accountId = text(value.accountId, 160);
  const role = value.role === "creator" ? "creator" : value.role === "reader" ? "reader" : null;
  const story = parseStory(value.story);
  const chapter = parseChapter(value.chapter);
  if (!accountId || !role || !story || !chapter) return null;
  return { accountId, role, story, chapter };
}

export function parsePurchaseInput(value: unknown): PurchaseInput | null {
  const base = parseAccessInput(value);
  if (!base || !isRecord(value)) return null;
  const idempotencyKey = text(value.idempotencyKey, 200);
  if (!idempotencyKey) return null;
  return { ...base, idempotencyKey };
}

export function parseTopUpInput(value: unknown): { accountId: string; amount: number; coinType: CoinType; idempotencyKey: string } | null {
  if (!isRecord(value)) return null;
  const accountId = text(value.accountId, 160);
  const amount = integer(value.amount, 1, 10000);
  const coinType = value.coinType === "bonus" ? "bonus" : value.coinType === "purchased" ? "purchased" : null;
  const idempotencyKey = text(value.idempotencyKey, 200);
  if (!accountId || amount === null || !coinType || !idempotencyKey) return null;
  return { accountId, amount, coinType, idempotencyKey };
}
