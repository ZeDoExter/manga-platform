import { NextResponse } from "next/server";
import { chapterKey } from "@/lib/economy";

export const dynamic = "force-dynamic";

const COMMUNITY_URL = (process.env.COMMUNITY_URL ?? "http://localhost:8086").replace(/\/+$/, "");
const CATALOG_URL = (process.env.CATALOG_URL ?? "http://localhost:8082").replace(/\/+$/, "");

type EchoKind = "fire" | "tears" | "gasp" | "heart" | "mind" | "laugh" | "cry" | "think";

type MockEchoRow = {
  id: string | number;
  storyId: string;
  chapter: number;
  pct: number;
  kind: EchoKind;
  author: string;
  createdAt: string;
};

const SEED_ECHOES: MockEchoRow[] = [];

declare global {
  var __mockEchoesStore: MockEchoRow[] | undefined;
  var __echoBudget: Record<string, { date: string; count: number }> | undefined;
}

function getBudget(): Record<string, { date: string; count: number }> {
  if (!globalThis.__echoBudget) globalThis.__echoBudget = {};
  return globalThis.__echoBudget;
}

function getStore(): MockEchoRow[] {
  if (!globalThis.__mockEchoesStore) {
    globalThis.__mockEchoesStore = [...SEED_ECHOES];
  }
  return globalThis.__mockEchoesStore;
}

interface CommunityComment {
  id: string;
  story_id: string;
  chapter_id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const story = searchParams.get("story");
  const ch = Number(searchParams.get("ch") ?? "1");
  const store = getStore();
  const localRows = story
    ? store.filter((e) => e.storyId === story && e.chapter === ch).slice(-40)
    : store.slice(-40);

  if (story) {
    try {
      const cid = chapterKey(story, ch);
      const res = await fetch(`${COMMUNITY_URL}/chapters/${encodeURIComponent(cid)}/comments?limit=40`, {
        cache: "no-store",
      });
      if (res.ok) {
        const page = (await res.json()) as { comments?: CommunityComment[] };
        const remoteRows: MockEchoRow[] = (page.comments ?? []).map((c) => {
          const m = /^\[echo:([a-z]+):([0-9.]+)\]/.exec(c.body);
          return {
            id: c.id,
            storyId: story,
            chapter: ch,
            pct: m ? Math.max(0, Math.min(1, parseFloat(m[2]))) : 0.5,
            kind: (m ? m[1] : "heart") as EchoKind,
            author: c.author_name || c.user_id,
            createdAt: c.created_at,
          };
        });
        return NextResponse.json({ echoes: [...localRows, ...remoteRows].slice(-50) });
      }
    } catch {
      // Fall back to local store when community service is unreachable
    }
  }

  return NextResponse.json({ echoes: localRows });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const storyId = typeof body?.storyId === "string" ? body.storyId.slice(0, 80) : "hollow-moon-courier";
    const chapter = Number(body?.chapter) || 1;
    const pct = Math.max(0, Math.min(1, Number(body?.pct) || 0));
    const kind = ["fire", "tears", "gasp", "heart", "mind", "laugh", "cry", "think"].includes(body?.kind)
      ? body.kind
      : "heart";
    const author =
      typeof body?.author === "string" && body.author.trim() ? body.author.trim().slice(0, 40) : "reader";

    // Daily budget: 3 free echoes per author per day (paid comments unlimited).
    const today = new Date().toISOString().slice(0, 10);
    const budget = getBudget();
    const entry = budget[author];
    if (entry && entry.date === today && entry.count >= 3) {
      return NextResponse.json({ error: "Daily echo limit reached (3/day)" }, { status: 429 });
    }
    budget[author] = entry && entry.date === today ? { date: today, count: entry.count + 1 } : { date: today, count: 1 };

    const store = getStore();
    const created: MockEchoRow = {
      id: `local-${Date.now()}`,
      storyId,
      chapter,
      pct,
      kind,
      author,
      createdAt: new Date().toISOString(),
    };
    store.push(created);
    if (store.length > 200) {
      store.splice(0, store.length - 200);
    }

    // Forward to Go community service (best-effort)
    try {
      const cid = chapterKey(storyId, chapter);
      // Ensure story & free chapter 1 exist in catalog so community check passes
      await fetch(`${CATALOG_URL}/stories`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: storyId,
          owner_id: "ren-akitsuki",
          type: "manga",
          title: storyId,
          synopsis: "",
          tags: [],
          splits: [{ creator_id: "ren-akitsuki", percentage: 100 }],
        }),
      }).catch(() => {});
      await fetch(`${CATALOG_URL}/stories/${encodeURIComponent(storyId)}/chapters`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: cid, order_index: chapter, title: `Chapter ${chapter}`, price_coins: 0 }),
      }).catch(() => {});

      await fetch(`${COMMUNITY_URL}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          story_id: storyId,
          chapter_id: cid,
          user_id: author,
          author_name: author,
          body: `[echo:${kind}:${pct.toFixed(3)}]`,
        }),
      });
    } catch {
      // Community service offline: local echo already stored
    }

    return NextResponse.json({ ok: true, echo: created });
  } catch (error) {
    console.error("Failed to create echo:", error);
    return NextResponse.json({ error: "Failed to create echo" }, { status: 500 });
  }
}
