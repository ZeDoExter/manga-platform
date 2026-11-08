"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Prefs } from "@/lib/types";
import { useApp } from "@/lib/store";
import { cx } from "@/lib/util";
import { AtmosLayer } from "../Atmos";
import { LivingRoom } from "../LivingRoom";
import { Icon, Stars } from "../ui";
import { ChapterPicker, neighbors, useFullscreen, type ReaderProps } from "./shared";

const THEMES: Record<Prefs["readerTheme"], { bg: string; fg: string; mute: string; edge: string; label: string; light: boolean }> = {
  paper: { bg: "#f6f1e7", fg: "#231f1a", mute: "#8a8070", edge: "#d8cfbd", label: "Paper", light: true },
  sepia: { bg: "#ecdcbd", fg: "#3b2d1c", mute: "#8a7556", edge: "#cdb98f", label: "Sepia", light: true },
  mint: { bg: "#dcebe3", fg: "#1c2a24", mute: "#667d71", edge: "#b7d0c3", label: "Mist", light: true },
  night: { bg: "#15141b", fg: "#d8d3c6", mute: "#827e8f", edge: "#2b2a35", label: "Night", light: false },
  ink: { bg: "#000000", fg: "#bcb7aa", mute: "#6d6a62", edge: "#1e1e1e", label: "OLED", light: false },
};
const FONTS: Record<Prefs["font"], string> = {
  serif: "var(--font-serif)",
  sans: "var(--font-sans)",
  mono: "var(--font-mono)",
};

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function NovelReader({ story, chapter, title, nav, paragraphs, preview, onClose, z = 60 }: ReaderProps & { paragraphs: string[] }) {
  const { me, act, state, toast } = useApp();
  const p = state.prefs;
  const th = THEMES[p.readerTheme];
  const scroller = useRef<HTMLDivElement>(null);
  const paraRefs = useRef<(HTMLElement | null)[]>([]);
  const [pct, setPct] = useState(0);
  const [focusIdx, setFocusIdx] = useState(0);
  const [chrome, setChrome] = useState(true);
  const [picker, setPicker] = useState(false);
  const fs = useFullscreen();
  const { prev, next } = neighbors(nav, chapter);

  const body = useMemo(() => paragraphs.filter((x) => x.trim()), [paragraphs]);
  const words = useMemo(() => body.filter((b) => b !== "---").join(" ").split(/\s+/).filter(Boolean).length, [body]);
  const total = Math.max(1, Math.round(words / 230));

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setPct(max > 0 ? Math.round(Math.min(1, Math.max(0, el.scrollTop / max)) * 200) / 200 : 0);
    const line = el.getBoundingClientRect().top + el.clientHeight * 0.42;
    let best = 0;
    let bd = Infinity;
    paraRefs.current.forEach((n, i) => {
      if (!n) return;
      const r = n.getBoundingClientRect();
      const d = line >= r.top && line <= r.bottom ? 0 : Math.min(Math.abs(r.top - line), Math.abs(r.bottom - line));
      if (d < bd) { bd = d; best = i; }
    });
    setFocusIdx(best);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let raf = 0;
    let last = el.scrollTop;
    let hideTimer = 0;
    let shownAt = 0;
    const h = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        onScroll();
        const t = el.scrollTop;
        if (Math.abs(t - last) > 24) {
          const up = t < last;
          last = t;
          if (up || t < 100) {
            clearTimeout(hideTimer);
            shownAt = performance.now();
            setChrome(true);
            hideTimer = window.setTimeout(() => { hideTimer = 0; setChrome(false); }, 2000);
          } else if (performance.now() - shownAt >= 2000) {
            setChrome(false);
          }
        }
      });
    };
    el.addEventListener("scroll", h, { passive: true });
    onScroll();
    return () => { el.removeEventListener("scroll", h); cancelAnimationFrame(raf); clearTimeout(hideTimer); };
  }, [onScroll, body]);

  /* save + resume */
  useEffect(() => {
    if (preview) return;
    const t = setTimeout(() => act.saveProgress(story.id, chapter, pct), 800);
    return () => clearTimeout(t);
  }, [pct, story.id, chapter, preview, act]);

  const resumed = useRef(false);
  useEffect(() => {
    if (preview || !state.hydrated || resumed.current) return;
    resumed.current = true;
    const pr = me.progress[story.id];
    if (pr && pr.chapter === chapter && pr.pct > 0.04 && pr.pct < 0.97) {
      setTimeout(() => {
        const el = scroller.current;
        if (el) el.scrollTop = pr.pct * (el.scrollHeight - el.clientHeight);
        toast(`Resumed where you left off · ${Math.round(pr.pct * 100)}%`, "info");
      }, 200);
    }
  }, [state.hydrated, me.progress, story.id, chapter, preview, toast]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement).tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      if (e.key === "Escape" && preview) onClose?.();
      if (e.key === "f") fs.toggle();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fs, preview, onClose]);

  const jump = (pc: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: pc * (el.scrollHeight - el.clientHeight), behavior: "smooth" });
  };

  const scrollToTop = useCallback(() => {
    scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const bmFor = (i: number) => me.bookmarks.find((b) => b.storyId === story.id && b.chapter === chapter && b.label === `“${body[i]?.replace(/[*]/g, "").slice(0, 46)}…”`);
  const toggleBm = (i: number) => {
    if (!body[i]) return;
    const ex = bmFor(i);
    if (ex) return act.removeBookmark(ex.id);
    const el = scroller.current;
    const n = paraRefs.current[i];
    const pc = el && n ? Math.max(0, Math.min(1, (n.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop) / (el.scrollHeight - el.clientHeight))) : pct;
    act.addBookmark(story.id, chapter, pc, `“${body[i].replace(/[*]/g, "").slice(0, 46)}…”`);
  };

  const set = (patch: Partial<Prefs>) => act.setPrefs(patch);

  return (
    <div className="fixed inset-0 transition-colors duration-500" style={{ zIndex: z, background: th.bg, color: th.fg }}>
      <div ref={scroller} className="scroll-y absolute inset-0" onClick={() => setChrome((c) => !c)}>
        <article className="mx-auto px-5 pb-40 pt-24 sm:px-8" style={{ maxWidth: p.width + 64, fontFamily: FONTS[p.font], fontSize: p.fontSize, lineHeight: p.lineHeight }}>
          <header className="mb-12 text-center">
            <div className="font-mono text-[0.7rem] uppercase tracking-[0.3em]" style={{ color: th.mute }}>{story.title}</div>
            <div className="mt-6 font-display text-6xl leading-none" style={{ color: "var(--accent)" }}>{String(chapter).padStart(2, "0")}</div>
            <h1 className="mt-3 text-[1.55em] font-bold leading-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}>{title}</h1>
            <div className="mt-4 flex justify-center gap-4 font-mono text-[0.72rem]" style={{ color: th.mute }}>
              <span>{words.toLocaleString()} words</span><span>·</span><span>~{total} min read</span>
            </div>
            <div className="mx-auto mt-8 h-px w-24" style={{ background: th.edge }} />
          </header>

          {body.map((t, i) =>
            t === "---" ? (
              <div key={i} className="my-12 text-center text-2xl tracking-[1em]" style={{ color: th.mute }} role="separator">⁂</div>
            ) : (
              <p
                key={i}
                ref={(n) => { paraRefs.current[i] = n; }}
                className={cx("group relative mb-[1.15em] text-pretty transition-opacity duration-500", i === 0 && "first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-[3.3em] first-letter:leading-[0.82] first-letter:text-[var(--accent)]")}
                style={{ opacity: p.focusLens && i !== focusIdx ? 0.22 : 1 }}
              >
                {!preview && (
                  <button onClick={(e) => { e.stopPropagation(); toggleBm(i); }} className={cx("absolute -left-9 top-[0.35em] hidden size-7 place-items-center rounded-md transition-opacity md:grid", bmFor(i) ? "opacity-100" : "opacity-0 group-hover:opacity-70")} style={{ color: bmFor(i) ? "var(--accent)" : th.mute }} aria-label={bmFor(i) ? "Remove paragraph bookmark" : "Bookmark this paragraph"}>
                    <Icon name="bookmark" size={16} fill={!!bmFor(i)} />
                  </button>
                )}
                {inline(t)}
              </p>
            ),
          )}

          <div className="mt-20 rounded-lg border-2 p-6 text-center" style={{ borderColor: th.edge }}>
            <div className="th-display text-3xl">ดูตูน</div>
            <div className="mt-1 font-mono text-xs uppercase tracking-widest" style={{ color: th.mute }}>ตอนต่อไป</div>
            {!preview && <div className="mt-4 flex justify-center"><Stars value={me.ratings[story.id] ?? 0} size={26} onChange={(n) => act.setRating(story.id, n)} /></div>}
            <div className="mt-5 flex flex-col items-center gap-2.5">
              {next && !preview ? <Link href={`/read/${story.id}/${next}`} className="btn btn-accent !py-3.5">Next: Chapter {next} — {nav.titleOf(next)} <Icon name="arrow" size={15} /></Link> : preview ? <button className="btn" onClick={onClose}>Close preview</button> : <span className="text-sm" style={{ color: th.mute }}>You’re all caught up — new chapters soon.</span>}
              {!preview && <Link href={`/story/${story.id}`} className="text-sm font-bold underline underline-offset-4">Back to story</Link>}
            </div>
          </div>
        </article>
      </div>

      {p.atmos && !preview && <AtmosLayer mood={story.mood} strength={0.5} className={cx("z-[5]", th.light && "opacity-60")} />}

      {/* Unified Scrollbar Echoes + Bottom-Right Circular Settings & Up-to-Top Dock */}
      <LivingRoom
        storyId={story.id}
        ch={chapter}
        progress={pct}
        onJump={jump}
        totalPages={body.length}
        onScrollTop={scrollToTop}
        onOpenChapters={() => setPicker(true)}
        bookmarked={!!bmFor(focusIdx)}
        onToggleBookmark={() => toggleBm(focusIdx)}
        fullscreen={fs.on}
        onToggleFullscreen={fs.toggle}
        light={th.light}
        preview={preview}
        visible={chrome}
      >
        <div className="space-y-3">
          <div>
            <div className="label mb-1.5">Theme</div>
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.keys(THEMES) as Prefs["readerTheme"][]).map((k) => (
                <button
                  key={k}
                  onClick={() => set({ readerTheme: k })}
                  aria-pressed={p.readerTheme === k}
                  className={cx(
                    "rounded-md border-2 py-1.5 text-[0.65rem] font-bold",
                    p.readerTheme === k ? "border-[#ff4a22] ring-2 ring-[#ff4a22]/40" : "border-[#15120f]/30",
                  )}
                  style={{ background: THEMES[k].bg, color: THEMES[k].fg }}
                >
                  {THEMES[k].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="label mb-1.5">Typeface</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(["serif", "sans", "mono"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => set({ font: f })}
                  aria-pressed={p.font === f}
                  className={cx(
                    "rounded-md border-2 border-[#15120f] py-1 text-xs font-extrabold transition-colors",
                    p.font === f ? "bg-[#15120f] text-[#fbf8f1] shadow-[2px_2px_0_var(--accent)]" : "bg-[#e8e1d1] text-[#15120f] hover:bg-hl",
                  )}
                  style={{ fontFamily: FONTS[f] }}
                >
                  {f === "serif" ? "Serif" : f === "sans" ? "Sans" : "Mono"}
                </button>
              ))}
            </div>
          </div>

          {([
            ["Font size", "fontSize", 14, 30, 1, `${p.fontSize}px`],
            ["Line spacing", "lineHeight", 1.3, 2.3, 0.05, p.lineHeight.toFixed(2)],
            ["Column width", "width", 480, 900, 20, `${p.width}px`],
          ] as const).map(([l, k, mn, mx, st, v]) => (
            <label key={k} className="block">
              <span className="label flex justify-between">
                <span>{l}</span>
                <span className="text-[#15120f]">{v}</span>
              </span>
              <input
                type="range"
                min={mn}
                max={mx}
                step={st}
                value={p[k]}
                onChange={(e) => set({ [k]: +e.target.value } as Partial<Prefs>)}
                className="w-full"
              />
            </label>
          ))}

          <div className="flex items-center justify-between text-xs font-extrabold text-[#15120f]">
            <span>Focus lens (highlight current line)</span>
            <button
              className={cx(
                "chip !border-[#15120f]",
                p.focusLens ? "!bg-[#15120f] !text-[#fbf8f1]" : "!bg-[#fbf8f1] !text-[#15120f] hover:!bg-hl",
              )}
              onClick={() => set({ focusLens: !p.focusLens })}
            >
              {p.focusLens ? "On" : "Off"}
            </button>
          </div>
        </div>
      </LivingRoom>

      {/* Top Nav: Left = Back to Story, Center = Story Title + Current Chapter */}
      <header
        className={cx("absolute inset-x-0 top-0 z-40 grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 backdrop-blur-md transition-transform duration-300 sm:px-5", !chrome ? "-translate-y-full" : "translate-y-0")}
        style={{ background: th.bg + "ee", borderBottom: `1px solid ${th.edge}` }}
      >
        <div className="justify-self-start">
          {preview ? (
            <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-md border-2 px-2.5 py-1.5 text-xs font-extrabold" style={{ borderColor: th.edge }}>
              <Icon name="left" size={14} />
              <span>Close</span>
            </button>
          ) : (
            <Link href={`/story/${story.id}`} className="inline-flex items-center gap-1.5 rounded-md border-2 px-2.5 py-1.5 text-xs font-extrabold" style={{ borderColor: th.edge }}>
              <Icon name="left" size={14} />
              <span>Back</span>
            </Link>
          )}
        </div>

        <button onClick={() => setPicker(true)} className="min-w-0 max-w-[60vw] text-center" aria-label="Table of contents">
          <div className="truncate text-sm font-extrabold sm:text-base">{story.title}</div>
          <div className="truncate font-mono text-[0.68rem]" style={{ color: th.mute }}>
            {preview ? "PREVIEW · " : ""}Ch. {chapter} — {title}
          </div>
        </button>

        <div className="justify-self-end" />
      </header>

      {/* Bottom Nav: Left = Previous Chapter, Center = Current Chapter + Title, Right = Next Chapter */}
      <footer
        className={cx("absolute inset-x-0 bottom-0 z-40 px-3 py-2.5 backdrop-blur-md transition-transform duration-300 sm:px-5", !chrome ? "translate-y-full" : "translate-y-0")}
        style={{ background: th.bg + "ee", borderTop: `1px solid ${th.edge}` }}
      >
        <div className="mx-auto grid max-w-5xl grid-cols-[auto_1fr_auto] items-center gap-3">
          {prev && !preview ? (
            <Link href={`/read/${story.id}/${prev}`} className="inline-flex items-center gap-1.5 rounded-md border-2 px-3 py-1.5 font-mono text-xs font-extrabold" style={{ borderColor: th.edge }}>
              <Icon name="left" size={14} />
              <span>Ch. {prev}</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border-2 px-3 py-1.5 font-mono text-xs font-bold opacity-35" style={{ borderColor: th.edge }}>
              <Icon name="left" size={14} />
              <span>Prev</span>
            </span>
          )}

          <button onClick={() => setPicker(true)} className="min-w-0 truncate px-2 text-center" aria-label="Open chapter list">
            <span className="font-mono text-xs font-extrabold sm:text-sm">
              Ch. {chapter} <span style={{ color: th.mute }}>—</span> <span className="font-sans">{title}</span>
            </span>
          </button>

          {next && !preview ? (
            <Link href={`/read/${story.id}/${next}`} className="inline-flex items-center gap-1.5 rounded-md border-2 px-3 py-1.5 font-mono text-xs font-extrabold" style={{ borderColor: th.edge }}>
              <span>Ch. {next}</span>
              <Icon name="right" size={14} />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border-2 px-3 py-1.5 font-mono text-xs font-bold opacity-35" style={{ borderColor: th.edge }}>
              <span>Next</span>
              <Icon name="right" size={14} />
            </span>
          )}
        </div>
      </footer>

      <ChapterPicker open={picker} onClose={() => setPicker(false)} nav={nav} chapter={chapter} storyId={story.id} preview={preview} />
    </div>
  );
}
