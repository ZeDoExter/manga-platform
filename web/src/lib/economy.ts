import type { Story, StoryType, StudioChapter, StudioStory } from "./types";

export type CoinType = "purchased" | "bonus";

export type LedgerType = "topup" | "purchase_debit" | "creator_earning" | "platform_fee" | "refund_credit" | "takedown_clawback";

export interface Wallet {
  user_id: string;
  purchased_coins: number;
  bonus_coins: number;
}

export interface LedgerEntry {
  id: string;
  user_id: string;
  type: LedgerType;
  coin_type: CoinType;
  amount: number;
  reference_id: string;
  idempotency_key: string;
  created_at: string;
}

export interface Entitlement {
  id: string;
  user_id: string;
  story_id: string;
  chapter_id: string;
  granted_at: string;
  revoked_at?: string;
}

export interface CreatorEarning {
  id: string;
  purchase_id: string;
  creator_id: string;
  story_id: string;
  chapter_id: string;
  coins_earned: number;
  created_at: string;
  clawed_back: boolean;
}

export interface CreatorEarnings {
  total_coins: number;
  entries: CreatorEarning[];
}

export interface Purchase {
  id: string;
  user_id: string;
  story_id: string;
  chapter_id: string;
  total_coins: number;
  purchased_coins_debited: number;
  bonus_coins_debited: number;
  status: "active" | "reversed";
  created_at: string;
  reversed_at?: string;
}

export interface PurchaseResult {
  purchase: Purchase;
  entitlement: Entitlement;
  earnings: CreatorEarning[];
  wallet: Wallet;
}

export type AccessReason = "login" | "payment" | "unavailable" | "error";

export interface AccessResult {
  allowed: boolean;
  reason?: AccessReason;
  price: number;
  balance: number;
  adPolicy?: "inline" | "banner" | "none";
}

export interface StorySync {
  id: string;
  title: string;
  type: StoryType;
  creator: string;
  synopsis: string;
  tags: string[];
}

export interface ChapterSync {
  number: number;
  title: string;
  price: number;
}

export interface AccessInput {
  accountId: string;
  role: "guest" | "reader" | "creator" | "admin";
  story: StorySync;
  chapter: ChapterSync;
}

export interface PurchaseInput extends AccessInput {
  idempotencyKey: string;
}

export interface TopUpInput {
  accountId: string;
  amount: number;
  coinType: CoinType;
  idempotencyKey: string;
}

export const COIN_FREE = 0;
export const COIN_PAID_VISUAL = 30;
export const COIN_PAID_TEXT = 20;

export function chapterKey(storyId: string, chapterNumber: number): string {
  return `${storyId}-ch-${chapterNumber}`;
}

export function chapterNumberFromKey(storyId: string, chapterId: string): number | null {
  const prefix = `${storyId}-ch-`;
  if (!chapterId.startsWith(prefix)) return null;
  const n = Number(chapterId.slice(prefix.length));
  return Number.isFinite(n) ? n : null;
}

export function defaultChapterPrice(type: StoryType, chapterNumber: number, chapterCount: number): number {
  if (chapterNumber <= 3) return COIN_FREE;
  if (chapterNumber >= chapterCount) return COIN_FREE;
  return type === "light-novel" || type === "web-novel" || type === "original" ? COIN_PAID_TEXT : COIN_PAID_VISUAL;
}

export function chapterPrice(type: StoryType, chapterNumber: number, chapterCount: number, override?: number): number {
  if (typeof override === "number" && Number.isFinite(override)) {
    return Math.max(0, Math.min(1000, Math.round(override)));
  }
  return defaultChapterPrice(type, chapterNumber, chapterCount);
}


export function storySyncFromStory(story: Story): StorySync {
  return {
    id: story.id,
    title: story.title,
    type: story.type,
    creator: story.creator,
    synopsis: story.synopsis,
    tags: story.tags,
  };
}

export function walletTotal(wallet: Pick<Wallet, "purchased_coins" | "bonus_coins"> | null | undefined): number {
  return (wallet?.purchased_coins ?? 0) + (wallet?.bonus_coins ?? 0);
}
