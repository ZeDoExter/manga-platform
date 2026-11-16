"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Account, AccountData, Announcement, Prefs, ProfileSettings, Story, StudioChapter, StudioStory, Taste } from "./types";
import { ACCOUNT_MAP, DEFAULT_PREFS, emptyData, genReaderData, makeInitialState, type AppState } from "@/data/accounts";
import { STORIES, STORY_MAP } from "@/data/stories";
import { studioToStory } from "./content";
import { SSR_NOW, uid } from "./util";
import {
  addBookmarkRemote,
  fetchBookmarks,
  fetchContinue,
  fetchFollows,
  mergeGuest,
  removeBookmarkRemote,
  saveProgressRemote,
  setFollow,
  type GuestItem,
} from "./library-api";
import { deleteRemoteChapter, deleteRemoteStory, fetchRemoteCatalog, syncCatalogStory } from "./catalog-api";
import { useSession } from "./auth-client";
const KEY = "dootoon.v3";

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "network error";
}

// Throttled sync-failure toast for high-frequency updates (metadata keystrokes):
// the first failure shows immediately, repeats at most every 15s.
let lastSyncWarn = 0;
function syncFailedToast(toast: (msg: string, kind: "ok" | "info" | "warn") => void, err: unknown): void {
  const now = Date.now();
  if (now - lastSyncWarn < 15000) return;
  lastSyncWarn = now;
  toast(`Server sync failed (${errMsg(err)}). Changes are local-only until it succeeds.`, "warn");
}

interface ToastItem {
  id: number;
  msg: string;
  kind: "ok" | "info" | "warn";
}

export interface Actions {
  signOutLocal(): void;
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
  const { data: session, isPending: sessionPending, error: sessionError } = useSession();

  const sessionAccount = useMemo<Account | null>(() => {
    if (!session?.user) return null;
    const u = session.user;
    const id = (u.email.split("@")[0] ?? u.id).replace(/[^a-z0-9_-]/gi, "-").toLowerCase() || u.id;
    const role: "reader" | "creator" | "admin" =
      "role" in u && (u.role === "creator" || u.role === "admin") ? u.role : "reader";
    const acc: Account = {
      id,
      name: u.name || u.email.split("@")[0] || "Reader",
      role,
      bio: "Signed in to DOOTOON.",
      location: "DOOTOON",
      joined: "2026",
      tagline: u.email,
      colors: role === "creator" ? ["#ff4a22", "#ffd43b"] : ["#3340ff", "#12b58b"],
      glyph: (u.name?.[0] ?? u.email[0] ?? "ด").toUpperCase(),
      followers: 0,
      following: 0,
      verified: true,
      image: u.image ?? undefined,
    };
    ACCOUNT_MAP[id] = acc;
    return acc;
  }, [session?.user]);

  /* sync Better Auth session into active account */
  useEffect(() => {
    if (!state.hydrated || !sessionAccount) return;
    const id = sessionAccount.id;
    ACCOUNT_MAP[id] = sessionAccount;
    setState((s) => {
      const existing = s.data[id];
      const data = {
        ...s.data,
        [id]: existing
          ? { ...existing, profile: { ...existing.profile, name: sessionAccount.name } }
          : emptyData(sessionAccount.name),
      };
      if (s.accountId === id && existing?.profile.name === sessionAccount.name) return s;
      return { ...s, accountId: id, data };
    });
  }, [state.hydrated, sessionAccount]);
  /* reconcile dead server session into guest (data buckets are kept) */
  useEffect(() => {
    if (!state.hydrated || sessionPending || sessionError || session?.user || state.accountId === "guest") return;
    setState((s) => (s.accountId === "guest" ? s : { ...s, accountId: "guest" }));
    toast("Signed out — browsing as guest", "info");
  }, [state.hydrated, sessionPending, sessionError, session?.user, state.accountId, toast]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!ACCOUNT_MAP[next.accountId]) next.accountId = "guest";
    setNow(t);
    setState(next);
    // Pull remote progress (library service) and merge last-write-wins.
    const accountId = next.accountId;
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
    // Pull remote catalog stories (catalog service) and merge into studio list.
    // Remote is the source of truth: stories confirmed deleted remotely are
    // dropped locally too (except never-synced drafts). Refetch on focus +
    // every 60s so long-open tabs don't go stale.
    const pullCatalog = async () => {
      try {
        const remote = await fetchRemoteCatalog();
        if (!remote) return; // offline: local stories stand alone, prune nothing.
        const remoteIds = new Set(remote.map((r) => r.id));
        setState((s) => {
          const byId = new Map(s.studio.map((x) => [x.id, x] as [string, StudioStory]));
          for (const r of remote) {
            if (!byId.has(r.id)) {
              byId.set(r.id, r);
            } else {
              const cur = byId.get(r.id)!;
              const chMap = new Map(cur.chapters.map((c) => [c.number, c] as [number, StudioChapter]));
              for (const rc of r.chapters) {
                const existing = chMap.get(rc.number);
                if (!existing) {
                  chMap.set(rc.number, rc);
                } else if ((rc.pages?.length ?? 0) > (existing.pages?.length ?? 0)) {
                  chMap.set(rc.number, { ...existing, pages: rc.pages, text: rc.text || existing.text });
                }
              }
              byId.set(r.id, {
                ...cur,
                coverImage: cur.coverImage || r.coverImage,
                chapters: Array.from(chMap.values()).sort((a, b) => b.number - a.number),
              });
            }
          }
          // Legacy copies predate the syncedAt marker: anything older than 7 days
          // was surely pushed at least once (every save syncs), so treat it as
          // synced; fresher ones keep the benefit of the doubt (offline drafts).
          const now = Date.now();
          const GRACE_MS = 7 * 86400000;
          const studio = Array.from(byId.values())
            .map((x) =>
              x.syncedAt || STORY_MAP[x.id] || now - x.createdAt <= GRACE_MS ? x : { ...x, syncedAt: now },
            )
            .filter((x) => {
              if (STORY_MAP[x.id]) return true;
              if (x.syncedAt && !remoteIds.has(x.id)) return false; // deleted remotely
              return true;
            });
          return { ...s, studio };
        });
      } catch {
        // Catalog offline: local stories stand alone.
      }
    };
    void pullCatalog();
    const timer = setInterval(() => void pullCatalog(), 60000);
    const onFocus = () => void pullCatalog();
    const onVisible = () => {
      if (document.visibilityState === "visible") void pullCatalog();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  /* sync remote library state (continue reading, follows, bookmarks) per active account */
  useEffect(() => {
    if (!state.hydrated) return;
    const accountId = state.accountId;
    let cancelled = false;
    void (async () => {
      try {
        const [rows, follows, bookmarks] = await Promise.all([
          fetchContinue(accountId).catch(() => []),
          fetchFollows(accountId).catch(() => []),
          fetchBookmarks(accountId).catch(() => []),
        ]);
        if (cancelled || (!rows.length && !follows.length && !bookmarks.length)) return;
        setState((s) => {
          const d = s.data[accountId] ?? emptyData("Reader");
          const progress = { ...d.progress };
          const history = [...d.history];
          for (const r of rows) {
            const at = new Date(r.updated_at).getTime() || 0;
            const cur = progress[r.story_id];
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
          const library = Array.from(new Set([...follows, ...d.library]));
          const bmList = [...d.bookmarks];
          for (const b of bookmarks) {
            const m = /-ch-(\d+)$/.exec(b.chapter_id);
            const chapter = m ? parseInt(m[1], 10) : 1;
            if (!bmList.some((x) => x.storyId === b.story_id && x.chapter === chapter)) {
              bmList.unshift({
                id: b.chapter_id,
                storyId: b.story_id,
                chapter,
                pct: 0,
                label: `Saved chapter ${chapter}`,
                at: new Date(b.created_at).getTime() || Date.now(),
              });
            }
          }
          return {
            ...s,
            data: {
              ...s.data,
              [accountId]: { ...d, progress, history: history.slice(0, 60), library, bookmarks: bmList },
            },
          };
        });
      } catch {
        // Library offline: local state stands alone.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.hydrated, state.accountId]);

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
      signOutLocal() {
        setState((s) => ({ ...s, accountId: "guest" }));
        toast("Signed out", "info");
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
        void setFollow(ref.current.accountId, storyId, !has).catch(() => {});
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
        const id = uid("bm");
        upMe((d) => ({ ...d, bookmarks: [{ id, storyId, chapter, pct, label, at: Date.now() }, ...d.bookmarks] }));
        toast("Bookmark saved 🔖");
        void addBookmarkRemote(ref.current.accountId, `${storyId}-ch-${chapter}`, storyId).catch(() => {});
      },
      removeBookmark(id) {
        const cur = me().bookmarks;
        const target = cur.find((b) => b.id === id);
        const next = cur.filter((b) => b.id !== id);
        upMe((d) => ({ ...d, bookmarks: next }));
        toast("Bookmark removed", "info");
        if (target && !next.some((b) => b.storyId === target.storyId && b.chapter === target.chapter)) {
          void removeBookmarkRemote(ref.current.accountId, `${target.storyId}-ch-${target.chapter}`).catch(() => {});
        }
      },
      toggleFollow(accountId) {
        const has = me().following.includes(accountId);
        upMe((d) => ({ ...d, following: has ? d.following.filter((x) => x !== accountId) : [...d.following, accountId] }));
        toast(has ? `Unfollowed ${ACCOUNT_MAP[accountId]?.name ?? ""}` : `Following ${ACCOUNT_MAP[accountId]?.name ?? "creator"} ✓`, has ? "info" : "ok");
      },
      addReview(storyId, rating, text) {
        const accId = ref.current.accountId;
        const prev = ref.current.data[accId]?.reviews.find((r) => r.storyId === storyId);
        const now = Date.now();
        upMe((d) => ({ ...d, reviews: [{ id: uid("rv"), storyId, rating, text, at: prev?.at ?? now, ...(prev ? { editedAt: now } : {}) }, ...d.reviews.filter((r) => r.storyId !== storyId)], ratings: { ...d.ratings, [storyId]: rating } }));
        toast(prev ? "Review updated ✓" : "Review posted — thank you! ★");
        const authorName = ref.current.data[accId]?.profile?.name || ACCOUNT_MAP[accId]?.name || accId;
        void fetch("/api/community", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ storyId, userId: accId, authorName, rating, text }),
        }).catch(() => {});
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
        void syncCatalogStory(st).then(
          () => upStory(st.id, (x) => ({ ...x, syncedAt: Date.now() })),
          (err) => toast(`Saved locally, but server sync failed (${errMsg(err)}). Others can't see it yet — try logging in again?`, "warn"),
        );
      },
      updateStory(id, patch) {
        upStory(id, (x) => {
          const next = { ...x, ...patch };
          void syncCatalogStory(next).then(
            () => upStory(id, (x) => ({ ...x, syncedAt: Date.now() })),
            (err) => syncFailedToast(toast, err),
          );
          return next;
        });
      },
      deleteStory(id) {
        const snapshot = ref.current.studio.find((x) => x.id === id);
        setState((s) => ({ ...s, studio: s.studio.filter((x) => x.id !== id) }));
        void deleteRemoteStory(id).then(
          () => toast("Story deleted", "info"),
          (err) => {
            // Remote failed: restore locally so we never diverge silently.
            if (snapshot) {
              setState((s) => (s.studio.some((x) => x.id === id) ? s : { ...s, studio: [snapshot, ...s.studio] }));
            }
            toast(`Delete failed on server (${errMsg(err)}) — story restored. Try logging in again?`, "warn");
          },
        );
      },
      upsertChapter(storyId, ch) {
        upStory(storyId, (x) => {
          const exists = x.chapters.some((c) => c.id === ch.id);
          const chapters = exists ? x.chapters.map((c) => (c.id === ch.id ? ch : c)) : [...x.chapters, ch];
          const next = { ...x, chapters: chapters.sort((a, b) => b.number - a.number) };
          void syncCatalogStory(next, ch).then(
            () => upStory(storyId, (x) => ({ ...x, syncedAt: Date.now() })),
            (err) => toast(`Chapter saved locally, but server sync failed (${errMsg(err)}).`, "warn"),
          );
          return next;
        });
      },
      deleteChapter(storyId, chapterId) {
        const snapshot = ref.current.studio.find((x) => x.id === storyId)?.chapters.find((c) => c.id === chapterId);
        const chapterNo = snapshot?.number;
        upStory(storyId, (x) => ({ ...x, chapters: x.chapters.filter((c) => c.id !== chapterId) }));
        if (chapterNo === undefined) {
          toast("Chapter deleted", "info");
          return;
        }
        void deleteRemoteChapter(storyId, chapterNo).then(
          () => toast("Chapter deleted", "info"),
          (err) => {
            // Remote failed: restore locally so we never diverge silently.
            if (snapshot) {
              upStory(storyId, (x) => (x.chapters.some((c) => c.id === chapterId) ? x : { ...x, chapters: [...x.chapters, snapshot] }));
            }
            toast(`Delete failed on server (${errMsg(err)}) — chapter restored.`, "warn");
          },
        );
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
      .filter((s) => !s.mirror && s.status === "published" && !STORY_MAP[s.id])
      .map((s) => studioToStory(s, ACCOUNT_MAP[s.ownerId]));
    return [...STORIES, ...extra];
  }, [state.studio]);

  const getStory = useCallback((id: string) => STORY_MAP[id] ?? catalog.find((s) => s.id === id), [catalog]);

  const dataFor = useCallback(
    (id: string) => state.data[id] ?? genReaderData(id, now),
    [state.data, now],
  );

  const activeAccount = useMemo<Account>(() => {
    if (sessionAccount && (state.accountId === sessionAccount.id || state.accountId === "guest")) {
      return sessionAccount;
    }
    if (ACCOUNT_MAP[state.accountId]) return ACCOUNT_MAP[state.accountId];
    const stored = state.data[state.accountId];
    if (stored?.profile?.name) {
      return {
        id: state.accountId,
        name: stored.profile.name,
        role: "reader",
        bio: stored.profile.bio || "",
        location: "DOOTOON",
        joined: "2026",
        tagline: "",
        colors: ["#3340ff", "#12b58b"],
        glyph: (stored.profile.name[0] ?? "ด").toUpperCase(),
        followers: 0,
        following: 0,
        verified: true,
      };
    }
    return ACCOUNT_MAP["guest"];
  }, [sessionAccount, state.accountId, state.data]);

  const value = useMemo<Ctx>(
    () => ({
      state,
      act,
      toast,
      now,
      account: activeAccount,
      me: state.data[activeAccount.id] ?? emptyData(activeAccount.name),
      catalog,
      getStory,
      dataFor,
    }),
    [state, act, toast, now, activeAccount, catalog, getStory, dataFor],
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-1/2 z-[300] flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-6" aria-live="polite">
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
