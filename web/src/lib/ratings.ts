import { useEffect, useMemo, useState } from "react";
import { useApp } from "./store";

export interface RemoteComment {
  id: string;
  user: string;
  userId: string;
  rating: number;
  text: string;
  at: number;
  edited?: boolean;
}

export interface StoryRating {
  avg: number;
  count: number;
}

/** Merge local + server reviews. Your server-side review counts even when this browser never saved it (login switch, another device). Never double-counts. */
export function storyRating(
  remote: RemoteComment[],
  accountId: string,
  mine?: { rating: number; text: string; at: number; editedAt?: number },
) {
  const others = remote.filter((c) => c.userId !== accountId);
  const self = remote.find((c) => c.userId === accountId);
  const effective = mine
    ? { ...mine, edited: mine.editedAt != null }
    : self
      ? { rating: self.rating, text: self.text, at: self.at, edited: !!self.edited }
      : undefined;
  const ratings = [...(effective ? [effective.rating] : []), ...others.map((c) => c.rating)];
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  return { others, effective, avg, count: ratings.length, ratings };
}

const rowsCache = new Map<string, RemoteComment[]>();
const pending = new Map<string, Promise<RemoteComment[]>>();

function loadRows(id: string): Promise<RemoteComment[]> {
  const hit = rowsCache.get(id);
  if (hit) return Promise.resolve(hit);
  const p = pending.get(id);
  if (p) return p;
  const req = fetch(`/api/community?storyId=${encodeURIComponent(id)}`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (d?.comments ?? []) as RemoteComment[])
    .catch(() => [] as RemoteComment[])
    .then((rows) => {
      rowsCache.set(id, rows);
      pending.delete(id);
      return rows;
    });
  pending.set(id, req);
  return req;
}

/** Live {avg, count} per story id, merged with your own local reviews. Missing ids fall back to the story's static values via liveRating. */
export function useStoryRatings(ids: string[]): Record<string, StoryRating> {
  const { me, account } = useApp();
  const key = useMemo(() => [...new Set(ids)].sort().join(","), [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const missing = key.split(",").filter((id) => id && !rowsCache.has(id));
    if (!missing.length) return;
    void Promise.all(missing.map(loadRows)).then(() => {
      if (alive) setTick((t) => t + 1);
    });
    return () => {
      alive = false;
    };
  }, [key]);
  return useMemo(() => {
    const out: Record<string, StoryRating> = {};
    for (const id of key ? key.split(",") : []) {
      const mine = me.reviews.find((r) => r.storyId === id);
      const { avg, count } = storyRating(rowsCache.get(id) ?? [], account.id, mine);
      out[id] = { avg, count };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, me.reviews, account.id, tick]);
}

/** Live rating when loaded, otherwise the story's own static values (instant first paint). */
export function liveRating(
  ratings: Record<string, StoryRating>,
  s: { id: string; rating: number; votes: number },
): StoryRating {
  return ratings[s.id] ?? { avg: s.rating, count: s.votes };
}
