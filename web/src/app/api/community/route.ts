import { NextRequest, NextResponse } from "next/server";
import { chapterKey } from "@/lib/economy";

const COMMUNITY_URL = (process.env.COMMUNITY_URL ?? "http://localhost:8086").replace(/\/+$/, "");
const CATALOG_URL = (process.env.CATALOG_URL ?? "http://localhost:8082").replace(/\/+$/, "");

interface BackendComment {
  id: string;
  story_id: string;
  chapter_id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export async function GET(req: NextRequest) {
  const storyId = req.nextUrl.searchParams.get("storyId");
  if (!storyId) return NextResponse.json({ comments: [] });

  try {
    const res = await fetch(`${COMMUNITY_URL}/stories/${encodeURIComponent(storyId)}/comments?limit=50`, {
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ comments: [] });
    const page = (await res.json()) as { comments?: BackendComment[] };
    const comments = (page.comments ?? [])
      .filter((c) => !c.body.startsWith("[echo:"))
      .map((c) => {
        const m = /^\[rating:(\d)\]\s*([\s\S]*)$/.exec(c.body);
        return {
          id: c.id,
          storyId: c.story_id,
          user: c.author_name || c.user_id,
          userId: c.user_id,
          rating: m ? parseInt(m[1], 10) : 5,
          text: m ? m[2] : c.body,
          at: new Date(c.created_at).getTime() || Date.now(),
        };
      });
    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ comments: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { storyId, userId, authorName, rating, text } = (await req.json()) as {
      storyId: string;
      userId: string;
      authorName: string;
      rating?: number;
      text: string;
    };
    if (!storyId || !text?.trim()) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const cid = chapterKey(storyId, 1);
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
      body: JSON.stringify({ id: cid, order_index: 1, title: "Chapter 1", price_coins: 0 }),
    }).catch(() => {});

    const bodyText = rating ? `[rating:${rating}] ${text.trim()}` : text.trim();
    const res = await fetch(`${COMMUNITY_URL}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        story_id: storyId,
        chapter_id: cid,
        user_id: userId || "reader",
        author_name: authorName || userId || "Reader",
        body: bodyText,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "community error");
      return NextResponse.json({ error: errText }, { status: res.status });
    }
    const created = await res.json();
    return NextResponse.json({ ok: true, comment: created });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "community service unavailable" },
      { status: 502 },
    );
  }
}
