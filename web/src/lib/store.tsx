"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Account, AccountData, Announcement, Prefs, ProfileSettings, Story, StudioChapter, StudioStory, Taste } from "./types";
import { ACCOUNT_MAP, DEFAULT_PREFS, emptyData, genReaderData, makeInitialState, type AppState } from "@/data/accounts";
import { STORIES, STORY_MAP } from "@/data/stories";
import { studioToStory } from "./content";
import { SSR_NOW, uid } from "./util";
import { fetchContinue, mergeGuest, saveProgressRemote, type GuestItem } from "./library-api";
const KEY = "dootoon.v1";

interface ToastItem {
  id: number;
  msg: string;
  kind: "ok" | "info" | "warn";
}

export interface Actions {
  switchAccount(id: string): void;
  setTheme(t: "paper" | "night"): void;
  setPrefs(p: Partial<Prefs>): void;
  toggleLibrary(storyId: string): void;
  saveProgress(storyId: string, chapter: number, pct: number): void;
  addBookmark(storyId: string, chapter: number, pct: number, label: string): void;
  removeBookmark(id: string): void;
  toggleFollow(accountId: string): void;
  addReview(storyId: string, rating: number, text: string): void;
  setRating(storyId: string, rating: number): void;
  updateProfile(patch: Partial<ProfileSettings>): void;
  setTaste(patch: Partial<Taste>): void;
  addCollection(name: string, emoji: string, storyId?: string): void;
  deleteCollection(id: string): void;
  toggleInCollection(colId: string, storyId: string): void;
  addEcho(key: string, pct: number, kind: string): void;
  createStory(s: StudioStory): void;
  updateStory(id: string, patch: Partial<StudioStory>): void;
  deleteStory(id: string): void;
  upsertChapter(storyId: string, ch: StudioChapter): void;
  deleteChapter(storyId: string, chapterId: string): void;
  postAnnouncement(text: string): void;
  likeAnnouncement(id: string): void;
  deleteAnnouncement(id: string): void;
  resetDemo(): void;
}

interface Ctx {
  state: AppState;
  act: Actions;
  toast: (msg: string, kind?: ToastItem["kind"]) => void;
  now: number;
  account: Account;
  me: AccountData;
  catalog: Story[];
  getStory: (id: string) => Story | undefined;
  dataFor: (id: string) => AccountData;
}

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => makeInitialState(SSR_NOW));
  const [now, setNow] = useState(SSR_NOW);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const ref = useRef(state);
  ref.current = state;
  const tid = useRef(0);

  const toast = useCallback((msg: string, kind: ToastItem["kind"] = "ok") => {
    const id = ++tid.current;
    setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  /* hydrate from localStorage */
  useEffect(() => {
    const t = Date.now();
    let next: AppState | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<AppState>;
        const base = makeInitialState(t);
        next = {
          ...base,
          ...s,
          prefs: { ...DEFAULT_PREFS, ...(s.prefs ?? {}) },
          data: { ...base.data, ...(s.data ?? {}) },
          studio: s.studio ?? base.studio,
          announcements: s.announcements ?? base.announcements,
          echoes: s.echoes ?? {},
          hydrated: true,
        };
      }
    } catch {
      next = null;
    }
    if (!next) next = { ...makeInitialState(t), hydrated: true };
    setNow(t);
    setState(next);
    // Pull remote progress (library service) and merge last-write-wins.
    const accountId = next.accountId;
    void (async () => {
      try {
        const rows = await fetchContinue(accountId);
        if (!rows.length) return;
        setState((s) => {
          const d = s.data[accountId] ?? emptyData("Reader");
          const progress = { ...d.progress };
          const history = [...d.history];
          for (const r of rows) {
            const at = new Date(r.updated_at).getTime() || 0;
            const cur = progress[r.story_id];
            // chapterID format: `${storyId}-ch-${chapter}`
            const m = /-ch-(\d+)$/.exec(r.chapter_id);
            const chapter = m ? parseInt(m[1], 10) : 1;
            const pct = r.content_type === "novel" ? r.position / 10000 : 0;
            if (!cur || at > cur.at) {
              progress[r.story_id] = { chapter, pct, at };
              if (!history.some((h) => h.storyId === r.story_id && h.chapter === chapter)) {
                history.unshift({ storyId: r.story_id, chapter, at });
              }
            }
          }
          return { ...s, data: { ...s.data, [accountId]: { ...d, progress, history: history.slice(0, 60) } } };
        });
      } catch {
        // Library offline: local state stands alone.
      }
    })();
    // Push any queued guest progress once (FR-L4), then clear.
    void (async () => {
      try {
        const raw = localStorage.getItem("manga-guest-progress");
        if (!raw) return;
        const guest = JSON.parse(raw) as Record<string, GuestItem>;
        const items = Object.entries(guest).map(([storyID, g]) => ({
          story_id: storyID, chapter_id: g.chapter_id, content_type: g.content_type,
          position: g.position, updated_at: g.updated_at,
        }));
        if (!items.length) return;
        await mergeGuest(accountId, items);
        localStorage.removeItem("manga-guest-progress");
      } catch {
        // Keep the queue for next launch.
      }
    })();
  }, []);

  /* persist */
  useEffect(() => {
    if (!state.hydrated) return;
    document.documentElement.dataset.theme = state.theme;
    const h = setTimeout(() => {
      try {
        const { hydrated, ...rest } = state;
        void hydrated;
        localStorage.setItem(KEY, JSON.stringify(rest));
      } catch {
        toast("Browser storage is full — large uploads may not persist.", "warn");
      }
    }, 250);
    return () => clearTimeout(h);
  }, [state, toast]);

  const act = useMemo<Actions>(() => {
    const upMe = (fn: (d: AccountData) => AccountData) =>
      setState((s) => {
        const d = s.data[s.accountId] ?? emptyData(ACCOUNT_MAP[s.accountId]?.name ?? "Reader");
        return { ...s, data: { ...s.data, [s.accountId]: fn(d) } };
      });
    const me = () => ref.current.data[ref.current.accountId] ?? emptyData("Reader");
    const upStory = (id: string, fn: (s: StudioStory) => StudioStory) =>
      setState((s) => ({ ...s, studio: s.studio.map((x) => (x.id === id ? fn(x) : x)) }));

    return {
      switchAccount(id) {
        const a = ACCOUNT_MAP[id];
        if (!a) return;
        setState((s) => {
          const data = s.data[id] ? s.data : { ...s.data, [id]: genReaderData(id, Date.now()) };
          return { ...s, accountId: id, data };
        });
        toast(`Switched to ${a.name} — ${a.role === "creator" ? "Uploader" : "Reader"} view`, "info");
      },
      setTheme(t) {
        setState((s) => ({ ...s, theme: t }));
      },
      setPrefs(p) {
        setState((s) => ({ ...s, prefs: { ...s.prefs, ...p } }));
      },
      toggleLibrary(storyId) {
        const has = me().library.includes(storyId);
        upMe((d) => ({ ...d, library: has ? d.library.filter((x) => x !== storyId) : [storyId, ...d.library] }));
        toast(has ? "Removed from your library" : "Added to your library ✓", has ? "info" : "ok");
      },
      saveProgress(storyId, chapter, pct) {
        const at = Date.now();
        const story = STORY_MAP[storyId];
        upMe((d) => {
          const first = d.history[0];
          const history = first && first.storyId === storyId && first.chapter === chapter ? [{ ...first, at }, ...d.history.slice(1)] : [{ storyId, chapter, at }, ...d.history].slice(0, 60);
          const prev = d.progress[storyId];
          const keep = prev && prev.chapter > chapter;
          return { ...d, history, progress: { ...d.progress, [storyId]: keep ? prev : { chapter, pct, at } }, library: d.library.includes(storyId) ? d.library : d.library };
        });
        // Fire-and-forget remote sync (debounced by callers at 700-800ms).
        const visual = story ? story.type === "manga" || story.type === "manhwa" || story.type === "manhua" : true;
        const chapterID = `${storyId}-ch-${chapter}`;
        void saveProgressRemote(
          ref.current.accountId, storyId, chapterID,
          visual ? "manga" : "novel", visual ? chapter : Math.round(pct * 10000),
        ).catch(() => { /* offline: local state is source of truth */ });
      },
      addBookmark(storyId, chapter, pct, label) {
        upMe((d) => ({ ...d, bookmarks: [{ id: uid("bm"), storyId, chapter, pct, label, at: Date.now() }, ...d.bookmarks] }));
        toast("Bookmark saved 🔖");
      },
      removeBookmark(id) {
        upMe((d) => ({ ...d, bookmarks: d.bookmarks.filter((b) => b.id !== id) }));
        toast("Bookmark removed", "info");
      },
      toggleFollow(accountId) {
        const has = me().following.includes(accountId);
        upMe((d) => ({ ...d, following: has ? d.following.filter((x) => x !== accountId) : [...d.following, accountId] }));
        toast(has ? `Unfollowed ${ACCOUNT_MAP[accountId]?.name ?? ""}` : `Following ${ACCOUNT_MAP[accountId]?.name ?? "creator"} ✓`, has ? "info" : "ok");
      },
      addReview(storyId, rating, text) {
        upMe((d) => ({ ...d, reviews: [{ id: uid("rv"), storyId, rating, text, at: Date.now() }, ...d.reviews.filter((r) => r.storyId !== storyId)], ratings: { ...d.ratings, [storyId]: rating } }));
        toast("Review posted — thank you! ★");
      },
      setRating(storyId, rating) {
        upMe((d) => ({ ...d, ratings: { ...d.ratings, [storyId]: rating } }));
        toast(`Rated ${rating} ★`);
      },
      updateProfile(patch) {
        upMe((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
      },
      setTaste(patch) {
        upMe((d) => ({ ...d, taste: { ...d.taste, ...patch } }));
      },
      addCollection(name, emoji, storyId) {
        upMe((d) => ({ ...d, collections: [...d.collections, { id: uid("col"), name, emoji, storyIds: storyId ? [storyId] : [] }] }));
        toast(`Collection “${name}” created`);
      },
      deleteCollection(id) {
        upMe((d) => ({ ...d, collections: d.collections.filter((c) => c.id !== id) }));
        toast("Collection deleted", "info");
      },
      toggleInCollection(colId, storyId) {
        upMe((d) => ({ ...d, collections: d.collections.map((c) => (c.id === colId ? { ...c, storyIds: c.storyIds.includes(storyId) ? c.storyIds.filter((x) => x !== storyId) : [...c.storyIds, storyId] } : c)) }));
      },
      addEcho(key, pct, kind) {
        setState((s) => ({ ...s, echoes: { ...s.echoes, [key]: [...(s.echoes[key] ?? []), { pct, kind, at: Date.now() }] } }));
      },
      createStory(st) {
        setState((s) => ({ ...s, studio: [st, ...s.studio] }));
      },
      updateStory(id, patch) {
        upStory(id, (x) => ({ ...x, ...patch }));
      },
      deleteStory(id) {
        setState((s) => ({ ...s, studio: s.studio.filter((x) => x.id !== id) }));
        toast("Story deleted", "info");
      },
      upsertChapter(storyId, ch) {
        upStory(storyId, (x) => {
          const exists = x.chapters.some((c) => c.id === ch.id);
          const chapters = exists ? x.chapters.map((c) => (c.id === ch.id ? ch : c)) : [...x.chapters, ch];
          return { ...x, chapters: chapters.sort((a, b) => b.number - a.number) };
        });
      },
      deleteChapter(storyId, chapterId) {
        upStory(storyId, (x) => ({ ...x, chapters: x.chapters.filter((c) => c.id !== chapterId) }));
        toast("Chapter deleted", "info");
      },
      postAnnouncement(text) {
        setState((s) => {
          const a: Announcement = { id: uid("an"), authorId: s.accountId, text, at: Date.now(), likes: 0 };
          return { ...s, announcements: [a, ...s.announcements] };
        });
        toast("Announcement posted to your followers 📣");
      },
      likeAnnouncement(id) {
        setState((s) => ({ ...s, announcements: s.announcements.map((a) => (a.id === id ? { ...a, liked: !a.liked, likes: a.likes + (a.liked ? -1 : 1) } : a)) }));
      },
      deleteAnnouncement(id) {
        setState((s) => ({ ...s, announcements: s.announcements.filter((a) => a.id !== id) }));
      },
      resetDemo() {
        const fresh = { ...makeInitialState(Date.now()), hydrated: true };
        setState(fresh);
        toast("Demo data reset to defaults", "info");
      },
    };
  }, [toast]);

  const catalog = useMemo<Story[]>(() => {
    const extra = state.studio
      .filter((s) => !s.mirror && s.status === "published")
      .map((s) => studioToStory(s, ACCOUNT_MAP[s.ownerId]));
    return [...STORIES, ...extra];
  }, [state.studio]);

  const getStory = useCallback((id: string) => STORY_MAP[id] ?? catalog.find((s) => s.id === id), [catalog]);

  const dataFor = useCallback(
    (id: string) => state.data[id] ?? genReaderData(id, now),
    [state.data, now],
  );

  const value = useMemo<Ctx>(
    () => ({
      state,
      act,
      toast,
      now,
      account: ACCOUNT_MAP[state.accountId] ?? ACCOUNT_MAP["mika"],
      me: state.data[state.accountId] ?? emptyData("Reader"),
      catalog,
      getStory,
      dataFor,
    }),
    [state, act, toast, now, catalog, getStory, dataFor],
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-20 left-1/2 z-[300] flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`anim-pop panel-flat pointer-events-auto px-4 py-2.5 text-sm font-semibold shadow-[3px_3px_0_var(--shadow)] ${t.kind === "ok" ? "!bg-ink !text-paper" : t.kind === "warn" ? "!bg-hl !text-[#15120f]" : ""}`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}

export type { Story };
