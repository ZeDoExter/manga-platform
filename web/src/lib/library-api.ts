// Client for the library service (progress, follows, bookmarks).
// Identity comes from the session cookie; the BFF stamps X-User-ID itself.

const BASE = process.env.NEXT_PUBLIC_LIBRARY_URL ?? '/api/library';


export interface RemoteProgress {
  user_id: string;
  story_id: string;
  chapter_id: string;
  content_type: 'manga' | 'novel';
  position: number;
  updated_at: string;
}

export interface GuestItem {
  story_id: string;
  chapter_id: string;
  content_type: 'manga' | 'novel';
  position: number;
  updated_at: string;
}

async function req(path: string, userID: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`library ${path} -> ${res.status}`);
  }
  return res;
}

export async function saveProgressRemote(
  userID: string, storyID: string, chapterID: string,
  contentType: 'manga' | 'novel', position: number,
): Promise<void> {
  await req('/progress', userID, {
    method: 'PUT',
    body: JSON.stringify({ story_id: storyID, chapter_id: chapterID, content_type: contentType, position }),
  });
}

export async function fetchContinue(userID: string): Promise<RemoteProgress[]> {
  const res = await req('/me/continue', userID);
  return (await res.json()) as RemoteProgress[];
}

export async function fetchFollows(userID: string): Promise<string[]> {
  const res = await req('/me/follows', userID);
  const list = ((await res.json()) as { story_id: string }[] | null) ?? [];
  return list.map((f) => f.story_id);
}

export async function setFollow(userID: string, storyID: string, follow: boolean): Promise<void> {
  await req(`/follows/${encodeURIComponent(storyID)}`, userID, { method: follow ? 'PUT' : 'DELETE' });
}

export interface RemoteBookmark {
  user_id: string;
  chapter_id: string;
  story_id: string;
  created_at: string;
}

export async function fetchBookmarks(userID: string): Promise<RemoteBookmark[]> {
  const res = await req('/me/bookmarks', userID);
  return ((await res.json()) as RemoteBookmark[] | null) ?? [];
}

export async function addBookmarkRemote(userID: string, chapterID: string, storyID: string): Promise<void> {
  await req(`/bookmarks/${encodeURIComponent(chapterID)}`, userID, {
    method: 'PUT',
    body: JSON.stringify({ story_id: storyID }),
  });
}

export async function removeBookmarkRemote(userID: string, chapterID: string): Promise<void> {
  await req(`/bookmarks/${encodeURIComponent(chapterID)}`, userID, { method: 'DELETE' });
}
export async function mergeGuest(userID: string, items: GuestItem[]): Promise<void> {
  if (items.length === 0) return;
  await req('/merge', userID, { method: 'POST', body: JSON.stringify({ items }) });
}
