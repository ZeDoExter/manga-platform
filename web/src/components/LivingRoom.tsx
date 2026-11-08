"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ECHO_EMOJI, ECHO_LABEL, getEchoes, type Echo, type EchoKind } from "@/lib/content";
import type { Mood } from "@/lib/types";
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
}

const EXTRA_QUOTES: Record<EchoKind, string[]> = {
  gasp: ["WAIT WHAT?!", "No way...", "Chills right now"],
  laugh: ["LMAOOO", "Peak comedy 💀", "I can't breathe"],
  cry: ["Why does it hurt 😭", "Who's cutting onions", "My heart..."],
  fire: ["ABSOLUTE CINEMA 🔥", "GOATED PANEL", "10/10 chapter"],
  heart: ["PROTECT THEM 💗", "Too precious!!", "So wholesome"],
  think: ["Wait look at the background", "Big clue here 👀", "Everything connects"],
};

export interface LivingRoomProps {
  storyId: string;
  ch: number;
  mood: Mood;
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
  mood,
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
  const base = useMemo(() => getEchoes(storyId, ch, mood), [storyId, ch, mood]);
  const mine = state.echoes[key] ?? [];
  const [shared, setShared] = useState<{ pct: number; kind: EchoKind; author: string }[]>([]);
  const [heat, setHeat] = useState<Record<string, Record<string, number>>>({});
  const seenPaid = useRef<Set<string>>(new Set());

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
  useEffect(() => {
    if (preview || totalPages < 1) return;
    let alive = true;
    const load = () => {
      fetch(`/api/echoes/heatmap?storyId=${encodeURIComponent(storyId)}&ch=${ch}&pages=${totalPages}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => alive && j?.heat && setHeat(j.heat))
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [storyId, ch, totalPages, preview]);

  const echoes: Echo[] = useMemo(
    () => [
      ...base,
      ...shared
        .filter((s) => s.author !== state.accountId)
        .map((s) => ({ pct: s.pct, kind: s.kind, count: 1, text: `Live from @${s.author}`, live: true })),
      ...mine.map((m) => ({ pct: m.pct, kind: m.kind as EchoKind, count: 1, text: "You were here.", mine: true })),
    ],
    [base, mine, shared, state.accountId],
  );

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
    setFloaters((f) => [...f.slice(-15), { ...item, id }]);
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
    const now = performance.now();

    const crossed: { echo: Echo; idx: number }[] = [];
    echoes.forEach((e, i) => {
      if (e.pct >= minP && e.pct <= maxP) {
        const lastAt = cooldowns.current.get(i) ?? 0;
        if (now - lastAt > 750) {
          cooldowns.current.set(i, now);
          crossed.push({ echo: e, idx: i });
        }
      }
    });

    if (crossed.length === 0) return;

    // Sort in the direction of scroll so comments stream in order
    crossed.sort((a, b) => (progress >= prev ? a.echo.pct - b.echo.pct : b.echo.pct - a.echo.pct));

    let delayIdx = 0;
    crossed.slice(0, 10).forEach(({ echo, idx }) => {
      const d1 = delayIdx++ * 65;
      setTimeout(() => {
        pushFloater({
          emoji: ECHO_EMOJI[echo.kind],
          text: echo.text,
          sub: echo.mine ? "You" : `${fmtNum(echo.count)} ${ECHO_LABEL[echo.kind]}`,
          x: (idx % 3) * 10 + Math.random() * 10,
          y: 26 + ((idx * 17) % 48) + (Math.random() * 8 - 4),
          mine: echo.mine,
        });
      }, d1);

      // Spawn a second comment bubble for high-activity echoes so it feels like a lively comment stream
      if (echo.count > 500) {
        const d2 = delayIdx++ * 65;
        const pool = EXTRA_QUOTES[echo.kind];
        const extraText = pool[idx % pool.length];
        setTimeout(() => {
          pushFloater({
            emoji: ECHO_EMOJI[echo.kind],
            text: extraText,
            sub: `+${fmtNum(Math.max(12, Math.round(echo.count * 0.28)))}`,
            x: 8 + ((idx + 1) % 3) * 12,
            y: 30 + (((idx + 3) * 19) % 44),
          });
        }, d2);
      }
    });
  }, [progress, echoes, quiet, preview]);

  const drop = (kind: EchoKind) => {
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
  // Paid comments live feed: poll every 5s, flash new ones for 3s.
  useEffect(() => {
    if (preview) return;
    let alive = true;
    const poll = () => {
      fetch(`/api/comments/paid?storyId=${encodeURIComponent(storyId)}&ch=${ch}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (!alive || !j?.comments) return;
          const rows = j.comments as { id: string; user: string; text: string; coins: number; page: number; at: number }[];
          const fresh = rows.filter((c) => Date.now() - c.at < 60000 && !seenPaid.current.has(c.id));
          for (const c of fresh) {
            seenPaid.current.add(c.id);
            pushFloater({ emoji: "💬", text: c.text, sub: `@${c.user} · 🪙${c.coins} · p.${c.page}`, x: 4, y: 40 + Math.random() * 20 }, 3000);
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
  }, [storyId, ch, preview]);

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
      if (data.id) seenPaid.current.add(data.id);
      pushFloater({ emoji: "💬", text, sub: `@${state.accountId} · 🪙${coins} · p.${page}`, x: 4, y: 44, mine: true }, 3000);
      setPaidText("");
      toast(`Comment posted · 🪙${coins}`, "ok");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Paid comment failed", "warn");
    } finally {
      setPaidBusy(false);
    }
  };


  const hv = hover !== null ? echoes[hover] : null;

  return (
    <>
      {/* Echo markers pinned directly onto the right-edge scrollbar of `scroll-y absolute inset-0` */}
      {!quiet && !preview && (
        <div
          className="pointer-events-none fixed inset-y-0 right-0 z-[45] w-3.5 select-none"
          aria-label="Community echoes on scrollbar"
        >
          {echoes.map((e, i) => {
            const sz = 10 + Math.min(8, Math.log10(e.count + 1) * 2.5);
            const topPos = `calc(8px + ${Math.min(1, Math.max(0, e.pct)) * 100}% * 0.96)`;
            return (
              <button
                key={i}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => onJump(e.pct)}
                aria-label={`${e.count} readers ${ECHO_LABEL[e.kind]} at ${Math.round(e.pct * 100)} percent`}
                className="pointer-events-auto absolute right-[1px] grid -translate-y-1/2 place-items-center rounded-full border border-line/80 bg-card text-[9px] leading-none shadow-sm transition-transform hover:z-20 hover:scale-150"
                style={{
                  top: topPos,
                  width: sz,
                  height: sz,
                  outline: e.mine ? "2px solid var(--accent)" : e.live ? "2px solid var(--hl)" : undefined,
                }}
              >
                <span className="scale-[.65]">{ECHO_EMOJI[e.kind]}</span>
              </button>
            );
          })}
          {/* Persistent heatmap peaks (SoundCloud-style): per-page top emoji + count */}
          {totalPages > 0 && Object.entries(heat).map(([pageStr, counts]) => {
            const page = Number(pageStr);
            const entries = Object.entries(counts);
            if (!entries.length) return null;
            const [topKind, topCount] = entries.sort((a, b) => b[1] - a[1])[0];
            const total = entries.reduce((a, [, c]) => a + c, 0);
            const pct = Math.min(1, Math.max(0, (page - 0.5) / totalPages));
            const intensity = Math.min(1, total / 20);
            return (
              <button
                key={`heat-${page}`}
                onClick={() => onJump(pct)}
                aria-label={`Page ${page}: ${total} reactions, top ${topKind}`}
                title={`p.${page} · ${entries.map(([k, c]) => `${k}×${c}`).join(" ")}`}
                className="pointer-events-auto absolute right-[15px] grid -translate-y-1/2 place-items-center rounded-full border-2 border-line bg-hl text-[10px] leading-none shadow transition-transform hover:z-20 hover:scale-150"
                style={{
                  top: `calc(8px + ${pct * 100}% * 0.96)`,
                  width: 20 + intensity * 10,
                  height: 20 + intensity * 10,
                  opacity: 0.75 + intensity * 0.25,
                }}
              >
                <span>{ECHO_EMOJI[topKind as EchoKind] ?? "💬"}</span>
                <span className="absolute -bottom-1 -right-1 grid min-w-4 place-items-center rounded-full border border-line bg-ink px-0.5 font-mono text-[0.55rem] font-bold text-paper">
                  {total > 99 ? "99+" : total}
                </span>
              </button>
            );
          })}
          {hv && hover !== null && (
            <div
              className="pointer-events-none absolute right-5 w-52 -translate-y-1/2 rounded-md border-2 border-line bg-card p-2.5 text-ink shadow-[3px_3px_0_var(--shadow)]"
            >
              <div className="flex items-center gap-1.5 text-sm font-extrabold">
                <span>{ECHO_EMOJI[hv.kind]}</span>
                {hv.live ? ECHO_LABEL[hv.kind] : `${fmtNum(hv.count)} ${ECHO_LABEL[hv.kind]}`}
                {hv.live && (
                  <span className="chip !border-line !bg-hl !px-1.5 !py-0 !text-[0.55rem] !text-[#15120f]">live</span>
                )}
              </div>
              <div className="mt-0.5 text-xs italic text-ink2">“{hv.text}”</div>
            </div>
          )}
        </div>
      )}

      {/* Drifting margin comment/reaction stream on the LEFT side when scrolling past Echo positions */}
      <div className="pointer-events-none fixed bottom-0 left-3 top-0 z-[48] w-64 sm:left-6 sm:w-72" aria-hidden="true">
        {floaters.map((f) => (
          <div
            key={f.id}
            className="absolute flex max-w-full items-center gap-2 rounded-2xl border-2 border-[#15120f] bg-[#fbf8f1]/95 px-3 py-1.5 text-xs font-bold text-[#15120f] shadow-[3px_3px_0_#15120f] backdrop-blur-xs"
            style={{
              left: `${f.x}px`,
              top: `${f.y}%`,
              animation: "echo-rise 3.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
              outline: f.mine ? "2px solid var(--accent)" : undefined,
            }}
          >
            <span className="shrink-0 text-base leading-none">{f.emoji}</span>
            <div className="min-w-0 leading-tight">
              <div className="truncate font-extrabold text-[#15120f]">“{f.text}”</div>
              {f.sub && <div className="font-mono text-[0.6rem] font-semibold text-[#7a7064]">{f.sub}</div>}
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

            {/* Card 2: Stacked Echoes & Community Reactions Pod */}
            {!preview && (
              <div className="panel anim-pop w-full p-3.5" style={{ animationDelay: "40ms" }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="label flex items-center gap-1.5 !text-[#15120f]">
                    <Icon name="heart" size={12} className="text-accent" /> Echoes · {Math.round(progress * 100)}%
                  </span>
                  <button
                    onClick={() => act.setPrefs({ quiet: !quiet })}
                    aria-pressed={!quiet}
                    className={cx("chip !text-[0.6rem]", !quiet ? "!bg-[#15120f] !text-[#fbf8f1]" : "!bg-paper2 !text-[#15120f]")}
                  >
                    <Icon name={quiet ? "mute" : "eye"} size={11} />
                    {quiet ? "Scrollbar: Hidden" : "Scrollbar: Shown"}
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Drop an echo reaction">
                  {(Object.keys(ECHO_EMOJI) as EchoKind[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => drop(k)}
                      title={`React: ${ECHO_LABEL[k]}`}
                      aria-label={`React: ${ECHO_LABEL[k]}`}
                      className="flex flex-col items-center justify-center gap-0.5 rounded-md border-2 border-line bg-paper2 py-1.5 transition-transform hover:-translate-y-0.5 hover:bg-hl active:translate-y-0"
                    >
                      <span className="text-lg leading-none">{ECHO_EMOJI[k]}</span>
                      <span className="font-mono text-[0.55rem] font-bold uppercase">{k}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Card 3: Paid comments (donate-to-post, min 5 coins) */}
            {!preview && (
              <div className="panel anim-pop w-full p-3.5" style={{ animationDelay: "80ms" }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="label flex items-center gap-1.5 !text-[#15120f]">
                    <Icon name="coin" size={12} className="text-accent" /> Paid comment · min 🪙5
                  </span>
                </div>
                <input
                  value={paidText}
                  onChange={(e) => setPaidText(e.target.value.slice(0, 140))}
                  placeholder={state.accountId === "guest" ? "Sign in to comment…" : "Say it loud — shows for 3s…"}
                  maxLength={140}
                  className="w-full rounded-md border-2 border-line bg-paper px-2.5 py-2 text-xs font-semibold outline-none placeholder:text-muted focus:bg-hl/20"
                />
                <div className="mt-2 flex items-center gap-1.5">
                  {[5, 10, 20, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPaidCoins(n)}
                      aria-pressed={paidCoins === n}
                      className={cx("chip !text-[0.65rem]", paidCoins === n && "chip-on")}
                    >
                      🪙{n}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={5}
                    max={1000}
                    value={paidCoins}
                    onChange={(e) => setPaidCoins(Math.max(5, Math.min(1000, Number(e.target.value) || 5)))}
                    className="ml-auto w-20 rounded-md border-2 border-line bg-paper px-2 py-1 font-mono text-xs font-bold outline-none"
                    aria-label="Coins to donate"
                  />
                  <button
                    onClick={sendPaid}
                    disabled={paidBusy}
                    className="btn btn-accent !py-1.5 !text-xs"
                  >
                    {paidBusy ? "…" : "Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Circular Buttons Stack: Up to Top + Settings (sliders icon) */}
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
