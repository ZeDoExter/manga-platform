import { NextRequest, NextResponse } from "next/server";
import { chapterKey } from "@/lib/economy";

const COMMUNITY_URL = (process.env.COMMUNITY_URL ?? "http://localhost:8086").replace(/\/+$/, "");

export const dynamic = "force-dynamic";

// GET ?storyId=&ch=&pages= — per-page emoji counters (SoundCloud-style peaks).
// Echoes are stored as [echo:{kind}:{pct}] comments; pct maps to page via pages count.
export async function GET(req: NextRequest) {
  const storyId = req.nextUrl.searchParams.get("storyId");
  const ch = Number(req.nextUrl.searchParams.get("ch") ?? "1");
  const pages = Math.max(1, Math.floor(Number(req.nextUrl.searchParams.get("pages")) || 1));
  if (!storyId) return NextResponse.json({ heat: {} });

  try {
    const cid = chapterKey(storyId, ch);
    const res = await fetch(`${COMMUNITY_URL}/chapters/${encodeURIComponent(cid)}/comments?limit=200`, {
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ heat: {} });
    const data = (await res.json()) as {
      comments?: { body: string }[];
    };
    const heat: Record<string, Record<string, number>> = {};
    for (const c of data.comments ?? []) {
      // Free echoes: [echo:{kind}:{pct}] → map pct to page.
      const m = /^\[echo:([a-z]+):([0-9.]+)\]/.exec(c.body);
      if (m) {
        const pct = Math.max(0, Math.min(1, parseFloat(m[2])));
        const page = Math.max(1, Math.min(pages, Math.floor(pct * pages) + 1));
        const k = String(page);
        heat[k] ??= {};
        heat[k][m[1]] = (heat[k][m[1]] ?? 0) + 1;
        continue;
      }
      // Paid comments: [paid:{coins}:{page}] → 💬 on that exact page.
      const p = /^\[paid:(\d+):(\d+)\]/.exec(c.body);
      if (p) {
        const page = Math.max(1, Math.min(pages, parseInt(p[2], 10)));
        const k = String(page);
        heat[k] ??= {};
        heat[k].paid = (heat[k].paid ?? 0) + 1;
      }
    }
    return NextResponse.json({ heat });
  } catch {
    return NextResponse.json({ heat: {} });
  }
}
