"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ECHO_EMOJI, ECHO_LABEL, type Echo, type EchoKind } from "@/lib/content";
import { useApp } from "@/lib/store";
import { cx, fmtNum } from "@/lib/util";
import { Icon } from "./ui";

interface Floater {
  id: number;
  emoji: string;
  text: string;
  sub?: string;
  x: number;
  y: number;
  mine?: boolean;
  ttl?: number;
}

// Read-time TTL: count graphemes (works for TH/JP/KR/emoji/RTL), clamp 5s–8s.
const READ_MS = 5000;
const READ_MAX = 8000;
const READ_PER_CHAR = 60;
const paidTtl = (text: string) => {
  const len = [...(text ?? "")].length;
  return Math.min(READ_MAX, READ_MS + len * READ_PER_CHAR);
};


export interface LivingRoomProps {
  storyId: string;
  ch: number;
  progress: number;
  onJump: (pct: number) => void;
  totalPages?: number;
  onScrollTop: () => void;
  onOpenChapters?: () => void;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  light?: boolean;
  preview?: boolean;
  visible?: boolean;
  children?: ReactNode;
}

/**
 * Unified Reader Overlay:
 * 1) Pins community Echo markers directly onto the right-edge scrollbar of `scroll-y absolute inset-0`.
 * 2) Floats triggered Echo bubbles up along the left margin (supports burst/spam streaming when scrolling across multiple echoes).
 * 3) Provides the bottom-right circular `Up to Top` + `Settings` (`sliders` icon) floating dock (shifted left of scrollbar & auto-hiding with Nav).
 */
export function LivingRoom({
  storyId,
  ch,
  progress,
  onJump,
  totalPages = 0,
  onScrollTop,
  onOpenChapters,
  bookmarked,
  onToggleBookmark,
  fullscreen,
  onToggleFullscreen,
  light,
  preview,
  visible = true,
  children,
}: LivingRoomProps) {
  const { state, act, toast } = useApp();
  const quiet = state.prefs.quiet;
  const atmos = state.prefs.atmos;
  const key = `${storyId}:${ch}`;
  const mine = state.echoes[key] ?? [];
  const [shared, setShared] = useState<{ pct: number; kind: EchoKind; author: string }[]>([]);
  const [heat, setHeat] = useState<Record<string, Record<string, number>>>({});
  const seenPaid = useRef<Set<string>>(new Set());
  const [feed, setFeed] = useState<{ id: string; user: string; text: string; coins: number; page: number; at: number; mine?: boolean }[]>([]);
  const [feedOpen, setFeedOpen] = useState(false);
  const [echoLeft, setEchoLeft] = useState(3);

  useEffect(() => {
    if (preview) return;
    let alive = true;
    fetch(`/api/echoes?story=${encodeURIComponent(storyId)}&ch=${ch}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && j && setShared(j.echoes ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [storyId, ch, preview]);

  // Heatmap: per-page emoji counters (persistent, SoundCloud peaks).
  const refreshHeat = useCallback(() => {
    if (preview || totalPages < 1) return;
    fetch(`/api/echoes/heatmap?storyId=${encodeURIComponent(storyId)}&ch=${ch}&pages=${totalPages}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.heat && setHeat(j.heat))
      .catch(() => {});
  }, [storyId, ch, totalPages, preview]);
  useEffect(() => {
    if (preview || totalPages < 1) return;
    refreshHeat();
    const t = setInterval(refreshHeat, 15000);
    return () => clearInterval(t);
  }, [refreshHeat, storyId, ch, totalPages, preview]);

  const echoes: Echo[] = useMemo(
    () => [
      ...shared
        .filter((s) => s.author !== state.accountId)
        .map((s) => ({ pct: s.pct, kind: s.kind, count: 1, text: `Live from @${s.author}`, live: true })),
      ...mine.map((m) => ({ pct: m.pct, kind: m.kind as EchoKind, count: 1, text: "You were here.", mine: true })),
    ],
    [mine, shared, state.accountId],
  );

  // Zone clustering: heat (server truth) wins; local mine[] fills gaps only.
  const zones = useMemo(() => {
    const buckets: Record<number, { kinds: Record<string, number>; total: number; mine: boolean }> = {};
    const add = (pct: number, kind: string, count: number, isMine: boolean) => {
      const z = Math.min(9, Math.floor(Math.max(0, Math.min(1, pct)) * 10));
      buckets[z] ??= { kinds: {}, total: 0, mine: false };
      buckets[z].kinds[kind] = (buckets[z].kinds[kind] ?? 0) + count;
      buckets[z].total += count;
      if (isMine) buckets[z].mine = true;
    };
    const heatTotal = Object.values(heat).reduce((a, c) => a + Object.values(c).reduce((x, y) => x + y, 0), 0);
    if (heatTotal > 0) {
      // Server has data: use it exclusively (it already includes our echoes).
      if (totalPages > 0) {
        for (const [pageStr, counts] of Object.entries(heat)) {
          const pct = (Number(pageStr) - 0.5) / totalPages;
          for (const [kind, count] of Object.entries(counts)) {
            add(pct, kind, count, false);
          }
        }
      }
    } else {
      // Server empty/offline: fall back to local echoes.
      for (const e of echoes) add(e.pct, e.kind, e.count, !!e.mine);
    }
    return Object.entries(buckets)
      .map(([z, b]) => {
        const sorted = Object.entries(b.kinds).sort((a, c) => c[1] - a[1]);
        const top = sorted.find(([k]) => k !== "paid") ?? sorted[0];
        return { zone: Number(z), pct: (Number(z) + 0.5) / 10, kind: top[0] as EchoKind, total: b.total, mine: b.mine, kinds: b.kinds };
      })
      .sort((a, b) => a.zone - b.zone);
  }, [echoes, heat, totalPages]);

  const [hover, setHover] = useState<number | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [open, setOpen] = useState(false);
  const [paidText, setPaidText] = useState("");
  const [paidCoins, setPaidCoins] = useState(5);
  const [paidBusy, setPaidBusy] = useState(false);
  const prevProg = useRef<number>(progress);
  const cooldowns = useRef<Map<number, number>>(new Map());
  const fid = useRef(0);

  const pushFloater = (item: Omit<Floater, "id">, ttlMs = 3400) => {
    const id = ++fid.current;
    setFloaters((f) => [...f.slice(-15), { ...item, id, ttl: ttlMs }]);
    setTimeout(() => {
      setFloaters((f) => f.filter((x) => x.id !== id));
    }, ttlMs);
  };

  useEffect(() => {
    cooldowns.current.clear();
    prevProg.current = 0;
  }, [key]);

  useEffect(() => {
    if (!visible && open) setOpen(false);
  }, [visible, open]);

  useEffect(() => {
    if (quiet || preview) return;
    const prev = prevProg.current;
    prevProg.current = progress;
    const delta = Math.abs(progress - prev);
    if (delta < 0.0005) return;

    const minP = Math.min(prev, progress) - 0.016;
    const maxP = Math.max(prev, progress) + 0.016;
    // Use the deduped zones memo: find zones whose center falls in scroll range.
    const hitZones = new Map<number, { kinds: Record<string, number>; total: number }>();
    for (const z of zones) {
      if (z.pct < minP || z.pct > maxP) continue;
      hitZones.set(z.zone, { kinds: z.kinds, total: z.total });
    }
    if (hitZones.size === 0) return;
    const now = performance.now();
    const fresh = [...hitZones.entries()].filter(([z]) => now - (cooldowns.current.get(z + 100) ?? 0) > 5000);
    if (fresh.length === 0) return;
    for (const [z] of fresh) cooldowns.current.set(z + 100, now);
    // Paid first (up to 3), then ONE echo rollup. Never paid OR echo.
    const pageNow = totalPages > 0 ? Math.max(1, Math.min(totalPages, Math.floor(progress * totalPages) + 1)) : 0;
    const paidHere = feed
      .filter((c) => Math.abs(c.page - pageNow) <= 1)
      .sort((a, b) => b.coins - a.coins || b.at - a.at)
      .slice(0, 3);
    for (const c of paidHere) {
      pushFloater(
        {
          emoji: "💬",
          text: c.text,
          sub: `@${c.user} · 🪙${c.coins} · p.${c.page}`,
          x: 4,
          y: 44,
          mine: c.mine,
        },
        paidTtl(c.text),
      );
    }
    let best = { kind: "fire" as EchoKind, total: 0 };
    let grand = 0;
    for (const [, b] of fresh) {
      const nonPaid = Object.entries(b.kinds).filter(([k]) => k !== "paid");
      const etotal = nonPaid.reduce((a, [, n]) => a + n, 0);
      grand += etotal;
      const top = nonPaid.sort((a, c) => c[1] - a[1])[0];
      if (top && etotal >= best.total) {
        best = { kind: top[0] as EchoKind, total: etotal };
      }
    }
    if (grand > 0) {
      pushFloater(
        {
          emoji: ECHO_EMOJI[best.kind],
          text: `${ECHO_LABEL[best.kind]} · ${grand}`,
          sub: fresh.length > 1 ? `${fresh.length} zones` : undefined,
          x: 4,
          y: 44,
          mine: false,
        },
        8000,
      );
    }
  }, [progress, echoes, heat, totalPages, quiet, preview, feed]);
  // Daily echo budget: 3 free echoes per day, persisted in localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dootoon.echoBudget");
      const today = new Date().toISOString().slice(0, 10);
      if (!raw) {
        setEchoLeft(3);
        return;
      }
      const saved = JSON.parse(raw) as { date?: string; left?: number };
      setEchoLeft(saved.date === today ? Math.max(0, Math.min(3, saved.left ?? 3)) : 3);
    } catch {
      setEchoLeft(3);
    }
  }, []);

  const spendEcho = (): boolean => {
    if (echoLeft <= 0) {
      toast("Daily echoes used up (3/day) — paid comments still open 💬", "warn");
      return false;
    }
    const left = echoLeft - 1;
    setEchoLeft(left);
    try {
      localStorage.setItem("dootoon.echoBudget", JSON.stringify({ date: new Date().toISOString().slice(0, 10), left }));
    } catch {
      // Budget is best-effort client-side.
    }
    return true;
  };

  const drop = (kind: EchoKind) => {
    if (!spendEcho()) return;
    act.addEcho(key, progress, kind);
    if (!preview) {
      fetch("/api/echoes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storyId, chapter: ch, pct: progress, kind, author: state.accountId }),
      }).catch(() => {});
    }
    pushFloater({
      emoji: ECHO_EMOJI[kind],
      text: "Echo dropped!",
      sub: `@${state.accountId}`,
      x: 4,
      y: 48,
      mine: true,
    });
    toast(`${ECHO_EMOJI[kind]} Echo left at ${Math.round(progress * 100)}%`);
  };
  // Paid comments live feed: poll every 5s, flash new ones for 3s + keep persistent feed.
  useEffect(() => {
    if (preview) return;
    let alive = true;
    const poll = () => {
      fetch(`/api/comments/paid?storyId=${encodeURIComponent(storyId)}&ch=${ch}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (!alive || !j?.comments) return;
          const rows = j.comments as { id: string; user: string; text: string; coins: number; page: number; at: number }[];
          setFeed((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            const merged = [...rows.filter((c) => !ids.has(c.id)).map((c) => ({ ...c, mine: c.user === state.accountId })), ...prev];
            return merged.slice(0, 30);
          });
          const fresh = rows.filter((c) => Date.now() - c.at < 60000 && !seenPaid.current.has(c.id));
          for (const c of fresh) {
            seenPaid.current.add(c.id);
            pushFloater({ emoji: "💬", text: c.text, sub: `@${c.user} · 🪙${c.coins} · p.${c.page}`, x: 4, y: 44, mine: c.user === state.accountId }, paidTtl(c.text));
          }
        })
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [storyId, ch, preview, state.accountId]);

  const sendPaid = async () => {
    const text = paidText.trim();
    if (!text) {
      toast("Write something first", "warn");
      return;
    }
    if (state.accountId === "guest") {
      toast("Please sign in to post paid comments", "warn");
      return;
    }
    const coins = Math.max(5, Math.min(1000, Math.floor(paidCoins) || 5));
    const page = totalPages > 0 ? Math.max(1, Math.min(totalPages, Math.floor(progress * totalPages) + 1)) : 1;
    setPaidBusy(true);
    try {
      const res = await fetch("/api/comments/paid", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storyId,
          chapter: ch,
          page,
          userId: state.accountId,
          authorName: state.accountId,
          text,
          coins,
          idempotencyKey: `${state.accountId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Paid comment failed");
      const cid = data.id ?? `mine-${Date.now()}`;
      seenPaid.current.add(cid);
      setFeed((prev) => [{ id: cid, user: state.accountId, text, coins, page, at: Date.now(), mine: true }, ...prev].slice(0, 30));
      pushFloater({ emoji: "💬", text, sub: `@${state.accountId} · 🪙${coins} · p.${page}`, x: 4, y: 44, mine: true }, paidTtl(text));
      refreshHeat();
      setPaidText("");
      toast(`Comment posted · 🪙${coins}`, "ok");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Paid comment failed", "warn");
    } finally {
      setPaidBusy(false);
    }
  };


  const hv = hover !== null ? zones[hover] ?? null : null;
  return (
    <>
      {/* Echo markers pinned directly onto the right-edge scrollbar of `scroll-y absolute inset-0` */}
      {!quiet && !preview && (
        <div
          className="pointer-events-none fixed inset-y-0 right-0 z-[45] w-3.5 select-none"
          aria-label="Community echoes on scrollbar"
        >
          {zones.map((z, i) => {
            const intensity = Math.min(1, z.total / 20);
            const sz = 22 + intensity * 10;
            return (
              <button
                key={z.zone}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => onJump(z.pct)}
                aria-label={`${z.total} reactions in ${z.zone * 10}-${z.zone * 10 + 10} percent, top ${ECHO_LABEL[z.kind]}`}
                className="pointer-events-auto absolute right-[1px] grid -translate-y-1/2 place-items-center rounded-full border-2 border-line bg-hl text-[11px] leading-none shadow transition-transform hover:z-20 hover:scale-150"
                style={{
                  top: `calc(8px + ${z.pct * 100}% * 0.96)`,
                  width: sz,
                  height: sz,
                  opacity: 0.75 + intensity * 0.25,
                  outline: z.mine ? "2px solid var(--accent)" : undefined,
                }}
              >
                <span>{ECHO_EMOJI[z.kind]}</span>
                <span className="absolute -bottom-1 -right-1 grid min-w-4 place-items-center rounded-full border border-line bg-ink px-0.5 font-mono text-[0.55rem] font-bold text-paper">
                  {z.total > 99 ? "99+" : z.total}
                </span>
              </button>
            );
          })}
          {hv && hover !== null && (
            <div
              className="pointer-events-none absolute right-5 w-52 -translate-y-1/2 rounded-md border-2 border-line bg-card p-2.5 text-ink shadow-[3px_3px_0_var(--shadow)]"
              style={{ top: `calc(8px + ${Math.min(0.92, Math.max(0.08, hv.pct)) * 100}% * 0.96)` }}
            >
              <div className="flex items-center gap-1.5 text-sm font-extrabold">
                <span>{ECHO_EMOJI[hv.kind]}</span>
                {fmtNum(hv.total)} reactions · {hv.zone * 10}-{hv.zone * 10 + 10}%
              </div>
              <div className="mt-0.5 text-xs italic text-ink2">Top: {ECHO_LABEL[hv.kind]}</div>
            </div>
          )}
        </div>
      )}

      {/* Merged zone bubbles stack vertically — no overlap */}
      <div className="pointer-events-none fixed bottom-24 left-3 top-24 z-[48] flex flex-col items-start justify-center gap-1.5 sm:left-6" aria-hidden="true">
        {floaters.slice(-4).map((f) => (
          <div
            key={f.id}
            className="flex w-fit max-w-64 items-center gap-2 rounded-2xl border-2 border-[#15120f] bg-[#fbf8f1]/95 px-3 py-1.5 text-xs font-bold text-[#15120f] shadow-[3px_3px_0_#15120f] backdrop-blur-xs sm:max-w-72"
            style={{
              animation: `echo-rise ${(f.ttl ?? 8000) / 1000}s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
              outline: f.mine ? "2px solid var(--accent)" : undefined,
            }}
          >
            <span className="shrink-0 text-sm leading-none">{f.emoji}</span>
            <div className="min-w-0 leading-tight">
              <div className="truncate font-extrabold text-[#15120f]">“{f.text}”</div>
              {f.sub && <div className="truncate font-mono text-[0.55rem] font-semibold text-[#7a7064]">{f.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Backdrop when Settings popup is open */}
      {open && (
        <div
          className="fixed inset-0 z-[50] bg-black/25 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Bottom-Right Floating Dock: Shifted left away from scrollbar & auto-hides with Nav */}
      <div
        className={cx(
          "fixed bottom-16 right-7 z-[55] flex flex-col items-end gap-2.5 transition-all duration-300 sm:bottom-18 sm:right-10 md:right-14",
          visible || open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0",
        )}
      >
        {open && (
          <div
            className="flex w-[min(90vw,21.5rem)] flex-col items-end gap-2.5 text-[#15120f] [--card:#fbf8f1] [--ink:#15120f] [--ink2:#3b352e] [--line:#15120f] [--muted:#7a7064] [--paper:#fbf8f1] [--paper2:#e8e1d1] [--shadow:#15120f]"
            role="dialog"
            aria-label="Reader settings and echoes"
          >
            {/* Card 1: Reader Settings & Mode Controls */}
            <div className="panel anim-pop w-full space-y-3.5 p-4">
              <div className="flex items-center justify-between border-b-2 border-dashed border-line/25 pb-2">
                <span className="flex items-center gap-2 font-display text-sm uppercase tracking-wider">
                  <Icon name="sliders" size={15} className="text-accent" /> Reader Settings
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="grid size-7 place-items-center rounded-md border-2 border-line bg-paper2 text-[#15120f] hover:bg-hl"
                  aria-label="Close settings"
                >
                  <Icon name="x" size={13} />
                </button>
              </div>

              {/* Custom Mode / Typography / Width Controls injected by MangaReader or NovelReader */}
              {children}

              {/* Quick Actions Grid */}
              <div>
                <div className="label mb-1.5">Quick Actions</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => act.setPrefs({ atmos: !atmos })}
                    aria-pressed={atmos}
                    className={cx(
                      "flex items-center gap-2 rounded-md border-2 border-line px-2.5 py-2 text-xs font-extrabold transition-colors",
                      atmos ? "bg-[#15120f] text-[#fbf8f1] shadow-[2px_2px_0_var(--accent)]" : "bg-paper2 text-[#15120f] hover:bg-hl",
                    )}
                  >
                    <Icon name="sparkles" size={14} />
                    <span className="truncate">{atmos ? "Atmosphere: On" : "Atmosphere: Off"}</span>
                  </button>

                  {onToggleBookmark && !preview && (
                    <button
                      onClick={onToggleBookmark}
                      aria-pressed={bookmarked}
                      className={cx(
                        "flex items-center gap-2 rounded-md border-2 border-line px-2.5 py-2 text-xs font-extrabold transition-colors",
                        bookmarked ? "bg-accent text-white shadow-[2px_2px_0_var(--line)]" : "bg-paper2 text-[#15120f] hover:bg-hl",
                      )}
                    >
                      <Icon name="bookmark" size={14} fill={!!bookmarked} />
                      <span className="truncate">{bookmarked ? "Bookmarked" : "Bookmark"}</span>
                    </button>
                  )}

                  {onOpenChapters && (
                    <button
                      onClick={() => {
                        setOpen(false);
                        onOpenChapters();
                      }}
                      className="flex items-center gap-2 rounded-md border-2 border-line bg-paper2 px-2.5 py-2 text-xs font-extrabold text-[#15120f] transition-colors hover:bg-hl"
                    >
                      <Icon name="list" size={14} />
                      <span className="truncate">Chapter List</span>
                    </button>
                  )}

                  {onToggleFullscreen && (
                    <button
                      onClick={onToggleFullscreen}
                      aria-pressed={fullscreen}
                      className={cx(
                        "flex items-center gap-2 rounded-md border-2 border-line px-2.5 py-2 text-xs font-extrabold transition-colors",
                        fullscreen ? "bg-[#15120f] text-[#fbf8f1] shadow-[2px_2px_0_var(--accent)]" : "bg-paper2 text-[#15120f] hover:bg-hl",
                      )}
                    >
                      <Icon name="fullscreen" size={14} />
                      <span className="truncate">{fullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Echoes + paid comment + totals, all in one */}
            {!preview && (
              <div className="panel anim-pop w-full p-3.5" style={{ animationDelay: "40ms" }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="label flex items-center gap-1.5 !text-[#15120f]">
                    <Icon name="heart" size={12} className="text-accent" /> Echoes · {echoLeft}/3
                  </span>
                  <button
                    onClick={() => act.setPrefs({ quiet: !quiet })}
                    aria-pressed={!quiet}
                    className={cx("chip !text-[0.6rem]", !quiet ? "!bg-[#15120f] !text-[#fbf8f1]" : "!bg-paper2 !text-[#15120f]")}
                  >
                    <Icon name={quiet ? "mute" : "eye"} size={11} />
                    {quiet ? "Hidden" : "Shown"}
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1" role="group" aria-label="Drop an echo reaction">
                  {(Object.keys(ECHO_EMOJI) as EchoKind[]).filter((k) => k !== "paid").map((k) => (
                    <button
                      key={k}
                      onClick={() => drop(k)}
                      title={`React: ${ECHO_LABEL[k]}`}
                      aria-label={`React: ${ECHO_LABEL[k]}`}
                      className="grid place-items-center rounded-md border-2 border-line bg-paper2 py-1 text-base leading-none transition-transform hover:-translate-y-0.5 hover:bg-hl active:translate-y-0"
                    >
                      {ECHO_EMOJI[k]}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <input
                    value={paidText}
                    onChange={(e) => setPaidText(e.target.value.slice(0, 140))}
                    placeholder={state.accountId === "guest" ? "Sign in…" : "💬 min 🪙5…"}
                    maxLength={140}
                    className="min-w-0 flex-1 rounded-md border-2 border-line bg-paper px-2 py-1.5 text-xs font-semibold outline-none placeholder:text-muted focus:bg-hl/20"
                  />
                  <input
                    type="number"
                    min={5}
                    max={1000}
                    value={paidCoins}
                    onChange={(e) => setPaidCoins(Math.max(5, Math.min(1000, Number(e.target.value) || 5)))}
                    className="w-16 shrink-0 rounded-md border-2 border-line bg-paper px-1.5 py-1.5 font-mono text-xs font-bold outline-none"
                    aria-label="Coins"
                  />
                  <button
                    onClick={sendPaid}
                    disabled={paidBusy}
                    className="btn btn-accent shrink-0 !px-3 !py-1.5 !text-xs"
                  >
                    {paidBusy ? "…" : "Send"}
                  </button>
                </div>
                {Object.keys(heat).length > 0 && (
                  <div className="mt-2 border-t border-dashed border-line/30 pt-2">
                    <div className="label mb-1.5 !text-[0.6rem]">This chapter · all pages</div>
                    <div className="flex flex-wrap gap-1">
                    {(Object.keys(ECHO_EMOJI) as EchoKind[])
                      .map((k) => ({
                        kind: k,
                        count: Object.values(heat).reduce((a, counts) => a + (counts[k] ?? 0), 0),
                      }))
                      .filter((r) => r.count > 0)
                      .sort((a, b) => b.count - a.count)
                      .map((r) => (
                        <button
                          key={r.kind}
                          onClick={() => drop(r.kind)}
                          title={`React ${ECHO_LABEL[r.kind]}`}
                          className="chip !gap-1 !px-2 !py-1 !text-[0.65rem]"
                        >
                          {ECHO_EMOJI[r.kind]} ×{r.count > 99 ? "99+" : r.count}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col items-center gap-2.5">
          <button
            onClick={onScrollTop}
            title="Up to Top"
            aria-label="Scroll to top"
            className={cx(
              "grid size-11 place-items-center rounded-full border-2 border-line shadow-[3px_3px_0_var(--shadow)] transition-all hover:-translate-y-0.5 active:translate-y-0.5",
              light ? "bg-[#fbf8f1] text-[#15120f]" : "bg-[#1a1923] text-white border-white/80",
            )}
          >
            <Icon name="up" size={18} />
          </button>

          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            title="Settings & Echoes"
            aria-label="Settings and Echoes"
            className={cx(
              "grid size-13 place-items-center rounded-full border-2 shadow-[4px_4px_0_var(--shadow)] transition-all hover:-translate-y-0.5 active:translate-y-0.5",
              open
                ? "rotate-90 border-white bg-ink text-white"
                : "border-line bg-accent text-white",
            )}
          >
            <Icon name={open ? "x" : "sliders"} size={21} />
          </button>
        </div>
      </div>
    </>
  );
}
