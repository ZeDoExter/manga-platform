import type { StudioChapter, StudioStory } from "./types";

export async function fetchRemoteCatalog(): Promise<StudioStory[]> {
  const res = await fetch("/api/catalog", { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => ({}))) as { stories?: StudioStory[] };
  return data.stories ?? [];
}

export async function syncCatalogStory(story: StudioStory, chapter?: StudioChapter): Promise<void> {
  await fetch("/api/catalog", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ story, chapter }),
  });
}
