// Client for the library service (progress, follows, bookmarks).
// User identity travels via X-User-ID (gateway injects it in prod;
// local dev uses the demo user below).

const BASE = process.env.NEXT_PUBLIC_LIBRARY_URL ?? 'http://localhost:8087';
const GUEST_KEY = 'manga-guest-progress';

export const DEMO_USER = 'demo-user-1';

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
    headers: { 'Content-Type': 'application/json', 'X-User-ID': userID, ...(init?.headers ?? {}) },
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
  const list = (await res.json()) as { story_id: string }[];
  return list.map((f) => f.story_id);
}

export async function setFollow(userID: string, storyID: string, follow: boolean): Promise<void> {
  await req(`/follows/${encodeURIComponent(storyID)}`, userID, { method: follow ? 'PUT' : 'DELETE' });
}

export async function mergeGuest(userID: string, items: GuestItem[]): Promise<void> {
  if (items.length === 0) return;
  await req('/merge', userID, { method: 'POST', body: JSON.stringify({ items }) });
}

// --- Guest localStorage (FR-L4) ---

export function loadGuestProgress(): Record<string, GuestItem> {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) ?? '{}') as Record<string, GuestItem>;
  } catch {
    return {};
  }
}

export function saveGuestProgress(storyID: string, item: GuestItem): void {
  const all = loadGuestProgress();
  all[storyID] = item;
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(all));
  } catch {
    // Storage full or unavailable: guest progress is best-effort.
  }
}

export function clearGuestProgress(): void {
  localStorage.removeItem(GUEST_KEY);
}

// debounce returns a trailing-edge debounced fn + flush.
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timer: number | undefined;
  let last: A | null = null;
  const fire = (...args: A) => {
    last = args;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = undefined;
      if (last) fn(...last);
      last = null;
    }, ms);
  };
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (last) {
      fn(...last);
      last = null;
    }
  };
  return { fire, flush };
}
