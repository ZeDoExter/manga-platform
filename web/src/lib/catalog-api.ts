import type { StudioChapter, StudioStory } from "./types";

/** Null = catalog unreachable (offline). Empty array = reachable but no stories. */
export async function fetchRemoteCatalog(): Promise<StudioStory[] | null> {
  try {
    const res = await fetch("/api/catalog", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { stories?: StudioStory[] };
    return data.stories ?? [];
  } catch {
    return null;
  }
}

export async function syncCatalogStory(story: StudioStory, chapter?: StudioChapter): Promise<void> {
  const res = await fetch("/api/catalog", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ story, chapter }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "").then((t) => t.slice(0, 120));
    throw new Error(`sync failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }
}
export async function deleteRemoteStory(id: string): Promise<void> {
  const res = await fetch(`/api/catalog?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  // 404 = already gone server-side: treat as success so retries converge.
  if (!res.ok && res.status !== 404) {
    const detail = await res.text().catch(() => "").then((t) => {
      try {
        const body: unknown = JSON.parse(t);
        if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
          return body.error;
        }
      } catch {
        // Not JSON: fall through to raw text below.
      }
      return t.slice(0, 120);
    });
    throw new Error(detail ? `${detail} (${res.status})` : `delete failed (${res.status})`);
  }
}
