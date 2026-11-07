import {
  chapterKey,
  type AccessInput,
  type AccessResult,
  type ChapterSync,
  type CoinType,
  type CreatorEarnings,
  type Entitlement,
  type LedgerEntry,
  type PurchaseInput,
  type PurchaseResult,
  type StorySync,
  type Wallet,
  walletTotal,
} from "./economy";

const CATALOG_URL = (process.env.CATALOG_URL ?? "http://localhost:8082").replace(/\/+$/, "");
const COMMERCE_URL = (process.env.COMMERCE_URL ?? "http://localhost:8083").replace(/\/+$/, "");
const GATEWAY_URL = (process.env.GATEWAY_URL ?? "http://localhost:8080").replace(/\/+$/, "");

export class UpstreamError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface CatalogStory {
  id: string;
  owner_id: string;
  status: string;
  creator_splits: { creator_id: string; percentage: number }[];
}

interface CatalogChapter {
  id: string;
  story_id: string;
  status: string;
  title: string;
  price_coins: number;
}

interface EntitlementsResponse {
  entitlements: Entitlement[];
}

interface LedgerResponse {
  entries: LedgerEntry[];
}

function jsonInit(body: unknown, method: "POST" | "PATCH" = "POST"): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  };
}

async function requestJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
    if (body && typeof body.error === "string") message = body.error;
    throw new UpstreamError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function catalogStoryType(type: StorySync["type"]): "manga" | "novel" {
  return type === "light-novel" || type === "web-novel" || type === "original" ? "novel" : "manga";
}

function readerRole(role: AccessInput["role"]): string {
  return role === "creator" ? "uploader" : "reader";
}

function safePrice(price: number): number {
  return Math.max(0, Math.min(1000, Math.round(price)));
}

async function ensureStory(story: StorySync): Promise<CatalogStory> {
  const payload = {
    id: story.id,
    owner_id: story.creator,
    type: catalogStoryType(story.type),
    title: story.title,
    synopsis: story.synopsis,
    tags: story.tags,
    splits: [{ creator_id: story.creator, percentage: 100 }],
  };

  try {
    return await requestJSON<CatalogStory>(`${CATALOG_URL}/stories`, jsonInit(payload));
  } catch (err) {
    if (err instanceof UpstreamError && err.status === 409) {
      return requestJSON<CatalogStory>(`${CATALOG_URL}/stories/${encodeURIComponent(story.id)}`);
    }
    throw err;
  }
}

async function ensureChapter(story: StorySync, chapter: ChapterSync): Promise<CatalogChapter> {
  const id = chapterKey(story.id, chapter.number);
  const title = chapter.title || `Chapter ${chapter.number}`;
  const price = safePrice(chapter.price);

  try {
    return await requestJSON<CatalogChapter>(
      `${CATALOG_URL}/stories/${encodeURIComponent(story.id)}/chapters`,
      jsonInit({ id, order_index: chapter.number, title, price_coins: price }),
    );
  } catch (err) {
    if (err instanceof UpstreamError && err.status === 409) {
      return requestJSON<CatalogChapter>(
        `${CATALOG_URL}/chapters/${encodeURIComponent(id)}`,
        jsonInit({ title, price_coins: price }, "PATCH"),
      );
    }
    throw err;
  }
}

export function getWallet(accountId: string): Promise<Wallet> {
  return requestJSON<Wallet>(`${COMMERCE_URL}/wallets/${encodeURIComponent(accountId)}`);
}

export async function getLedger(accountId: string): Promise<LedgerEntry[]> {
  const data = await requestJSON<LedgerResponse>(`${COMMERCE_URL}/wallets/${encodeURIComponent(accountId)}/ledger`);
  return data.entries ?? [];
}

export async function getEntitlements(accountId: string): Promise<Entitlement[]> {
  const data = await requestJSON<EntitlementsResponse>(`${COMMERCE_URL}/users/${encodeURIComponent(accountId)}/entitlements`);
  return data.entitlements ?? [];
}

export function getCreatorEarnings(creatorId: string): Promise<CreatorEarnings> {
  return requestJSON<CreatorEarnings>(`${COMMERCE_URL}/creators/${encodeURIComponent(creatorId)}/earnings`);
}

export async function topUp(input: { accountId: string; amount: number; coinType: CoinType; idempotencyKey: string }): Promise<{ entry: LedgerEntry; wallet: Wallet }> {
  const amount = Math.max(1, Math.min(10000, Math.round(input.amount)));
  const entry = await requestJSON<LedgerEntry>(
    `${COMMERCE_URL}/topups`,
    jsonInit({
      user_id: input.accountId,
      amount,
      coin_type: input.coinType,
      ref_id: input.coinType === "bonus" ? `bonus_${input.idempotencyKey}` : `stripe_test_${input.idempotencyKey}`,
      idempotency_key: input.idempotencyKey,
    }),
  );
  const wallet = await getWallet(input.accountId);
  return { entry, wallet };
}

export async function checkAccess(input: AccessInput): Promise<AccessResult> {
  const story = await ensureStory(input.story);
  const chapter = await ensureChapter(input.story, input.chapter);
  const wallet = await getWallet(input.accountId).catch(() => null);
  const price = chapter.price_coins;
  const balance = walletTotal(wallet);

  if (story.status !== "published" || chapter.status !== "published") {
    return { allowed: false, reason: "unavailable", price, balance };
  }

  if (story.owner_id === input.accountId) {
    return { allowed: true, price, balance };
  }

  const res = await fetch(`${GATEWAY_URL}/api/chapters/${encodeURIComponent(chapter.id)}/read`, {
    headers: {
      "X-User-ID": input.accountId,
      "X-User-Role": readerRole(input.role),
    },
    cache: "no-store",
  });

  if (res.ok) {
    const data = (await res.json().catch(() => ({}))) as { ad_policy?: AccessResult["adPolicy"] };
    return { allowed: true, price, balance, adPolicy: data.ad_policy };
  }
  if (res.status === 401) return { allowed: false, reason: "login", price, balance };
  if (res.status === 402) return { allowed: false, reason: "payment", price, balance };
  if (res.status === 410) return { allowed: false, reason: "unavailable", price, balance };

  throw new UpstreamError(res.status, `Reader returned ${res.status}`);
}

export async function purchaseChapter(input: PurchaseInput): Promise<PurchaseResult> {
  const story = await ensureStory(input.story);
  const chapter = await ensureChapter(input.story, input.chapter);
  if (story.status !== "published" || chapter.status !== "published") {
    throw new UpstreamError(410, "This chapter is unavailable");
  }
  if (chapter.price_coins <= 0) {
    throw new UpstreamError(400, "This chapter is free");
  }

  const data = await requestJSON<Omit<PurchaseResult, "wallet">>(
    `${COMMERCE_URL}/purchases`,
    jsonInit({
      user_id: input.accountId,
      story_id: story.id,
      chapter_id: chapter.id,
      price: chapter.price_coins,
      creator_splits: story.creator_splits,
      idempotency_key: input.idempotencyKey,
    }),
  );
  const wallet = await getWallet(input.accountId);
  return { ...data, wallet };
}
