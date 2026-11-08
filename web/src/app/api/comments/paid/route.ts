import { NextRequest, NextResponse } from "next/server";
import { chapterKey } from "@/lib/economy";

const COMMERCE_URL = (process.env.COMMERCE_URL ?? "http://localhost:8083").replace(/\/+$/, "");
const COMMUNITY_URL = (process.env.COMMUNITY_URL ?? "http://localhost:8086").replace(/\/+$/, "");
const CATALOG_URL = (process.env.CATALOG_URL ?? "http://localhost:8082").replace(/\/+$/, "");

export const dynamic = "force-dynamic";

interface PaidRow {
  id: string;
  user: string;
  userId: string;
  text: string;
  coins: number;
  page: number;
  at: number;
}

interface CommunityComment {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

function parsePaid(body: string): { coins: number; page: number; text: string } | null {
  const m = /^\[paid:(\d+):(\d+)\]\s*([\s\S]*)$/.exec(body);
  if (!m) return null;
  return { coins: parseInt(m[1], 10), page: parseInt(m[2], 10), text: m[3].slice(0, 140) };
}

// GET ?storyId=&ch= — recent paid comments (poll every 5s from reader).
export async function GET(req: NextRequest) {
  const storyId = req.nextUrl.searchParams.get("storyId");
  const ch = Number(req.nextUrl.searchParams.get("ch") ?? "1");
  if (!storyId) return NextResponse.json({ comments: [] });

  try {
    const cid = chapterKey(storyId, ch);
    const res = await fetch(`${COMMUNITY_URL}/chapters/${encodeURIComponent(cid)}/comments?limit=40`, {
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ comments: [] });
    const page = (await res.json()) as { comments?: CommunityComment[] };
    const comments: PaidRow[] = [];
    for (const c of page.comments ?? []) {
      const p = parsePaid(c.body);
      if (!p) continue;
      comments.push({
        id: c.id,
        user: c.author_name || c.user_id,
        userId: c.user_id,
        text: p.text,
        coins: p.coins,
        page: p.page,
        at: new Date(c.created_at).getTime() || Date.now(),
      });
    }
    comments.sort((a, b) => b.at - a.at);
    return NextResponse.json({ comments: comments.slice(0, 20) });
  } catch {
    return NextResponse.json({ comments: [] });
  }
}

// POST { storyId, chapter, page, userId, authorName, text, coins, idempotencyKey }
// Charges coins via commerce /tips (min 5, platform keeps 100%), then posts to community.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      storyId?: string;
      chapter?: number;
      page?: number;
      userId?: string;
      authorName?: string;
      text?: string;
      coins?: number;
      idempotencyKey?: string;
    };
    const storyId = typeof body.storyId === "string" ? body.storyId.slice(0, 80) : "";
    const chapter = Number(body.chapter) || 1;
    const page = Math.max(1, Math.floor(Number(body.page) || 1));
    const userId = typeof body.userId === "string" ? body.userId.slice(0, 80) : "";
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 140) : "";
    const coins = Math.floor(Number(body.coins) || 0);
    const idempotencyKey =
      typeof body.idempotencyKey === "string" && body.idempotencyKey
        ? body.idempotencyKey.slice(0, 200)
        : `${userId}:${Date.now()}`;

    if (!storyId || !userId || userId === "guest" || !text) {
      return NextResponse.json({ error: "Login and comment text required" }, { status: 401 });
    }
    if (coins < 5 || coins > 1000) {
      return NextResponse.json({ error: "Minimum 5 coins per comment" }, { status: 400 });
    }

    // 1. Charge the posting fee (platform keeps 100%).
    const tipRes = await fetch(`${COMMERCE_URL}/tips`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        amount: coins,
        reference_id: `${storyId}:${chapter}:${page}`,
        idempotency_key: idempotencyKey,
      }),
      cache: "no-store",
    });
    if (!tipRes.ok) {
      if (tipRes.status === 402) {
        return NextResponse.json({ error: "Insufficient coins — top up first" }, { status: 402 });
      }
      const t = await tipRes.text().catch(() => "payment failed");
      return NextResponse.json({ error: t.slice(0, 200) }, { status: tipRes.status });
    }

    // 2. Post to community (ensure catalog rows exist first).
    const cid = chapterKey(storyId, chapter);
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

    const cRes = await fetch(`${COMMUNITY_URL}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        story_id: storyId,
        chapter_id: cid,
        user_id: userId,
        author_name: body.authorName || userId,
        body: `[paid:${coins}:${page}] ${text}`,
      }),
      cache: "no-store",
    });
    if (!cRes.ok) {
      const t = await cRes.text().catch(() => "comment failed");
      return NextResponse.json({ error: t.slice(0, 200) }, { status: cRes.status });
    }
    const created = (await cRes.json()) as { id?: string };
    return NextResponse.json({ ok: true, id: created.id ?? null, coins });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "paid comment failed" },
      { status: 502 },
    );
  }
}
