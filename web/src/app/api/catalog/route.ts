import { NextRequest, NextResponse } from "next/server";
import { chapterKey } from "@/lib/economy";
import { resolveImageUrl } from "@/lib/content";
import type { StudioChapter, StudioStory } from "@/lib/types";

const CATALOG_URL = (process.env.CATALOG_URL ?? "http://localhost:8082").replace(/\/+$/, "");

interface BackendStory {
  id: string;
  owner_id: string;
  type: "manga" | "novel";
  title: string;
  cover_key: string;
  synopsis: string;
  tags: string[];
  status: "draft" | "published" | "hidden" | "taken_down";
  created_at: string;
}

interface BackendChapter {
  id: string;
  story_id: string;
  order_index: number;
  title: string;
  price_coins: number;
  page_keys: string[];
  novel_text: string;
  status: "draft" | "published" | "hidden" | "taken_down";
  created_at: string;
}

export async function GET() {
  try {
    const res = await fetch(`${CATALOG_URL}/stories`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ stories: [] });
    const list = ((await res.json()) as BackendStory[] | null) ?? [];

    const stories: StudioStory[] = await Promise.all(
      list.map(async (s) => {
        const chRes = await fetch(`${CATALOG_URL}/stories/${encodeURIComponent(s.id)}/chapters`, {
          cache: "no-store",
        }).catch(() => null);
        const chList = chRes && chRes.ok ? (((await chRes.json()) as BackendChapter[] | null) ?? []) : [];
        const chapters: StudioChapter[] = chList.map((c) => ({
          id: c.id,
          number: c.order_index,
          title: c.title,
          status: c.status === "published" ? "published" : "draft",
          updatedAt: new Date(c.created_at).getTime() || Date.now(),
          priceCoins: c.price_coins,
          text: c.novel_text || undefined,
          pages:
            c.page_keys && c.page_keys.length > 0
              ? c.page_keys.map((k, idx) => ({ id: `${c.id}-p-${idx}`, kind: "upload" as const, src: k }))
              : undefined,
        }));
        return {
          id: s.id,
          ownerId: s.owner_id,
          title: s.title,
          type: s.type === "novel" ? "light-novel" : "manga",
          synopsis: s.synopsis || "",
          tagline: s.synopsis ? s.synopsis.slice(0, 80) : "Original series on DOOTOON",
          genres: s.tags?.length ? s.tags.slice(0, 2) : ["Original"],
          tags: s.tags ?? [],
          palette: ["#15120f", "#ff4a22", "#f2ede2"],
          motif: "moon",
          mood: "calm",
          status: s.status === "published" ? "published" : "draft",
          coverImage: s.cover_key ? resolveImageUrl(s.cover_key) : undefined,
          chapters,
          createdAt: new Date(s.created_at).getTime() || Date.now(),
        };
      }),
    );

    return NextResponse.json({ stories });
  } catch {
    return NextResponse.json({ stories: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { story: StudioStory; chapter?: StudioChapter };
    const { story, chapter } = body;
    if (!story?.id || !story?.title) {
      return NextResponse.json({ error: "invalid story payload" }, { status: 400 });
    }

    const storyType =
      story.type === "light-novel" || story.type === "web-novel" || story.type === "original" ? "novel" : "manga";

    // 1. Upsert story in catalog service
    const createRes = await fetch(`${CATALOG_URL}/stories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: story.id,
        owner_id: story.ownerId || "ren-akitsuki",
        type: storyType,
        title: story.title,
        synopsis: story.synopsis || story.tagline || "",
        tags: story.tags?.length ? story.tags : story.genres ?? [],
        splits: [{ creator_id: story.ownerId || "ren-akitsuki", percentage: 100 }],
      }),
      cache: "no-store",
    });

    if (!createRes.ok && createRes.status !== 409) {
      const errText = await createRes.text().catch(() => "catalog error");
      return NextResponse.json({ error: errText }, { status: createRes.status });
    }

    // 2. Upsert chapter(s)
    const chaptersToSync = chapter ? [chapter] : story.chapters ?? [];
    for (const ch of chaptersToSync) {
      const cid = chapterKey(story.id, ch.number);
      const pageKeys = (ch.pages ?? [])
        .filter((p) => p.kind === "upload" && p.src)
        .map((p) => p.src as string);
      const price = Math.max(0, Math.round(ch.priceCoins ?? 0));

      const chRes = await fetch(`${CATALOG_URL}/stories/${encodeURIComponent(story.id)}/chapters`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: cid,
          order_index: ch.number,
          title: ch.title || `Chapter ${ch.number}`,
          price_coins: price,
          page_keys: pageKeys,
          novel_text: ch.text ?? "",
        }),
        cache: "no-store",
      });

      if (chRes.status === 409) {
        await fetch(`${CATALOG_URL}/chapters/${encodeURIComponent(cid)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: ch.title || `Chapter ${ch.number}`,
            price_coins: price,
            page_keys: pageKeys,
            novel_text: ch.text ?? "",
          }),
          cache: "no-store",
        });
      }

      const desiredStatus = ch.status === "published" ? "published" : "draft";
      await fetch(`${CATALOG_URL}/chapters/${encodeURIComponent(cid)}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: desiredStatus }),
        cache: "no-store",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "catalog sync failed" },
      { status: 502 },
    );
  }
}
