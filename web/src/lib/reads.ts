import { useEffect, useMemo, useState } from "react";

const ANON_KEY = "dootoon-anon-id";

/** Stable per-browser guest id for read counting (uuid, persisted). */
export function getAnonId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      id = (globalThis.crypto?.randomUUID?.() ?? `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "anon-memory";
  }
}

interface TrendingRow {
  story_id: string;
  reads: number;
}

const cache = new Map<string, Record<string, number>>();
const pending = new Map<string, Promise<Record<string, number>>>();

function loadRange(range: string): Promise<Record<string, number>> {
  const hit = cache.get(range);
  if (hit) return Promise.resolve(hit);
  const p = pending.get(range);
  if (p) return p;
  const req = fetch(`/api/library/reads/trending?range=${encodeURIComponent(range)}`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const map: Record<string, number> = {};
      for (const row of ((d ?? []) as TrendingRow[])) {
        if (row?.story_id) map[row.story_id] = row.reads ?? 0;
      }
      return map;
    })
    .catch(() => ({}) as Record<string, number>)
    .then((map) => {
      cache.set(range, map);
      pending.delete(range);
      return map;
    });
  pending.set(range, req);
  return req;
}

/** story_id -> read count for a window. Fetched once per range per session. */
export function useStoryReads(range: "today" | "week" | "all"): Record<string, number> {
  const [map, setMap] = useState<Record<string, number>>(() => cache.get(range) ?? {});
  useEffect(() => {
    let alive = true;
    void loadRange(range).then((m) => {
      if (alive) setMap(m);
    });
    return () => {
      alive = false;
    };
  }, [range]);
  return useMemo(() => map, [map]);
}

/** Fire-and-forget chapter-open event. Exactly-once per call site mount. */
export function recordRead(storyId: string, chapter: number): void {
  void fetch("/api/library/reads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ story_id: storyId, chapter, anon_id: getAnonId() }),
  }).catch(() => {});
}
