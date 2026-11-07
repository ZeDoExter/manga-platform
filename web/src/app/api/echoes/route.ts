import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type MockEchoRow = {
  id: number;
  storyId: string;
  chapter: number;
  pct: number;
  kind: "fire" | "tears" | "gasp" | "heart" | "mind";
  author: string;
  createdAt: string;
};

const SEED_ECHOES: MockEchoRow[] = [
  { id: 1, storyId: "hollow-moon-courier", chapter: 1, pct: 0.24, kind: "gasp", author: "suzu_reads", createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
  { id: 2, storyId: "hollow-moon-courier", chapter: 1, pct: 0.62, kind: "tears", author: "inkwanderer", createdAt: new Date(Date.now() - 1000 * 60 * 11).toISOString() },
  { id: 3, storyId: "the-ninth-bell", chapter: 1, pct: 0.45, kind: "mind", author: "teacup_oni", createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString() },
];

declare global {
  var __mockEchoesStore: MockEchoRow[] | undefined;
}

function getStore(): MockEchoRow[] {
  if (!globalThis.__mockEchoesStore) {
    globalThis.__mockEchoesStore = [...SEED_ECHOES];
  }
  return globalThis.__mockEchoesStore;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const story = searchParams.get("story");
  const ch = Number(searchParams.get("ch") ?? "1");
  const store = getStore();
  const rows = story
    ? store.filter((e) => e.storyId === story && e.chapter === ch).slice(-40)
    : store.slice(-40);
  return NextResponse.json({ echoes: rows });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const storyId = typeof body?.storyId === "string" ? body.storyId.slice(0, 80) : "hollow-moon-courier";
    const chapter = Number(body?.chapter) || 1;
    const pct = Math.max(0, Math.min(1, Number(body?.pct) || 0));
    const kind = ["fire", "tears", "gasp", "heart", "mind"].includes(body?.kind) ? body.kind : "heart";
    const author = typeof body?.author === "string" && body.author.trim() ? body.author.trim().slice(0, 40) : "reader";

    const store = getStore();
    const created: MockEchoRow = {
      id: (store[store.length - 1]?.id ?? 0) + 1,
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

    return NextResponse.json({ ok: true, echo: created });
  } catch (error) {
    console.error("Failed to create echo:", error);
    return NextResponse.json({ error: "Failed to create echo" }, { status: 500 });
  }
}
