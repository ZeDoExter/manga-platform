import { NextRequest, NextResponse } from "next/server";
import { chapterKey } from "@/lib/economy";
import type { StudioChapter, StudioStory } from "@/lib/types";
import { getServerIdentity } from "@/lib/identity-server";

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


// Extract the raw media key to store as cover_key. data:/blob: URLs are
// local-only previews — return undefined so the PATCH leaves the stored key
// untouched instead of clobbering it.
function toCoverKey(coverImage?: string): string | undefined {
  if (!coverImage) return "";
  if (coverImage.startsWith("data:") || coverImage.startsWith("blob:")) return undefined;
  return coverImage.replace(/^\/api\/media\/image\//, "");
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
          coverImage: s.cover_key || undefined,
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
    const me = await getServerIdentity(req);
    if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
    if (me.role !== "creator" && me.role !== "admin") {
      return NextResponse.json({ error: "Uploader account required" }, { status: 403 });
    }

    const storyType =
      story.type === "light-novel" || story.type === "web-novel" || story.type === "original" ? "novel" : "manga";
    const tags = story.tags?.length ? story.tags : story.genres ?? [];
    const synopsis = story.synopsis || story.tagline || "";

    // 1. Upsert story in catalog service
    const createRes = await fetch(`${CATALOG_URL}/stories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: story.id,
        owner_id: me.accountId,
        type: storyType,
        title: story.title,
        synopsis,
        tags,
        splits: [{ creator_id: me.accountId, percentage: 100 }],
      }),
      cache: "no-store",
    });

    if (!createRes.ok && createRes.status !== 409) {
      const errText = await createRes.text().catch(() => "catalog error");
      return NextResponse.json({ error: errText }, { status: createRes.status });
    }

    // 1b. Push story metadata + cover. POST is insert-only (409 when the story
    // already exists), so every sync also PATCHes the editable fields.
    const coverKey = toCoverKey(story.coverImage);
    await fetch(`${CATALOG_URL}/stories/${encodeURIComponent(story.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: story.title,
        synopsis,
        tags,
        ...(coverKey === undefined ? {} : { cover_key: coverKey }),
      }),
      cache: "no-store",
    }).catch(() => null);

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
export async function DELETE(req: NextRequest) {
  try {
    const me = await getServerIdentity(req);
    if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
    const chapterRaw = searchParams.get("chapter");
    const chapter = chapterRaw === null ? null : Number(chapterRaw);
    if (chapter !== null && (!Number.isInteger(chapter) || chapter <= 0)) {
      return NextResponse.json({ error: "invalid chapter" }, { status: 400 });
    }
    // Only the owner or an admin may delete. Missing story (404) falls
    // through: DELETE is idempotent, so "already gone" still succeeds.
    if (me.role !== "admin") {
      let res: Response | null = null;
      try {
        res = await fetch(`${CATALOG_URL}/stories/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
      } catch {
        return NextResponse.json({ error: "catalog service unavailable" }, { status: 502 });
      }
      if (res.status !== 404) {
        if (!res.ok) {
          return NextResponse.json({ error: "catalog service unavailable" }, { status: 502 });
        }
        const owner = (await res.json().catch(() => null)) as { owner_id?: string } | null;
        if (!owner || owner.owner_id !== me.accountId) {
          return NextResponse.json({ error: "Only the owner can delete this story" }, { status: 403 });
        }
      }
    }
    if (chapter !== null) {
      const res = await fetch(`${CATALOG_URL}/chapters/${encodeURIComponent(chapterKey(id, chapter))}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!res.ok && res.status !== 404) {
        return NextResponse.json({ error: "failed to delete chapter" }, { status: res.status });
      }
      return NextResponse.json({ ok: true });
    }
    const res = await fetch(`${CATALOG_URL}/stories/${encodeURIComponent(id)}`, {
      method: "DELETE",
      cache: "no-store",
    });
    if (!res.ok && res.status !== 404) {
      return NextResponse.json({ error: "failed to delete story" }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "catalog service unavailable" },
      { status: 502 },
    );
  }
}
