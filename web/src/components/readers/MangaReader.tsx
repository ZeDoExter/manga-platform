"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isVisual } from "@/lib/types";
import type { ReaderContent, ReaderPageItem } from "@/lib/content";
import { useApp } from "@/lib/store";
import { cx } from "@/lib/util";
import { MangaPageSvg, type PageStyle } from "../MangaPage";
import { AtmosLayer } from "../Atmos";
import { LivingRoom } from "../LivingRoom";
import { Icon, Stars } from "../ui";
import { ChapterPicker, neighbors, useFullscreen, type ReaderProps } from "./shared";

type Content = Extract<ReaderContent, { kind: "manga" }>;
type Mode = "scroll" | "page" | "book";

const PageSlot = memo(function PageSlot({ item, idx, style, root, onVisible }: { item: ReaderPageItem; idx: number; style: PageStyle; root: React.RefObject<HTMLDivElement | null>; onVisible: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(idx < 3);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const a = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { root: root.current, rootMargin: "1600px 0px" });
    const b = new IntersectionObserver(([e]) => e.isIntersecting && onVisible(idx), { root: root.current, rootMargin: "-46% 0px -46% 0px" });
    a.observe(el);
    b.observe(el);
    return () => { a.disconnect(); b.disconnect(); };
  }, [idx, onVisible, root]);
  return (
    <div ref={ref} data-page={idx} className={cx("relative w-full", !item.src && "aspect-[2/3]")} style={{ background: style.strip ? "#0d0d12" : "#fbfaf6" }}>
      {near ? (
        item.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.src} alt={`Page ${idx + 1}`} className="block w-full" loading="lazy" />
        ) : item.spec ? (
          <MangaPageSvg page={item.spec} style={style} className="block h-full w-full" />
        ) : null
      ) : (
        <div className="absolute inset-0 grid place-items-center text-xs text-black/30">page {idx + 1}</div>
      )}
    </div>
  );
});

function renderSinglePage(item: ReaderPageItem, idx: number, style: PageStyle) {
  if (item.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.src} alt={`Page ${idx + 1}`} className="h-full w-full object-contain" />;
  }
  if (item.spec) {
    return <MangaPageSvg page={item.spec} style={style} className="block h-full w-full" />;
  }
  return null;
}

export function MangaReader({ story, chapter, title, nav, content, preview, onClose, z = 60 }: ReaderProps & { content: Content }) {
  const { me, act, state, toast } = useApp();
  const prefs = state.prefs;
  const rawMode = prefs.mangaMode as string;
  const mode: Mode = rawMode === "page" || rawMode === "book" ? rawMode : "scroll";
  const pages = content.pages;
  const total = pages.length;
  const scroller = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [scrollPct, setScrollPct] = useState(0);
  const [chrome, setChrome] = useState(true);
  const [picker, setPicker] = useState(false);
  const [width, setWidth] = useState(820);
  const fs = useFullscreen();
  const { prev, next } = neighbors(nav, chapter);
  const style: PageStyle = useMemo(() => ({ color: story.type !== "manga", palette: story.palette, strip: story.type !== "manga" }), [story.type, story.palette]);

  const spreadStart = page - (page % 2);
  const leftPage = pages[spreadStart];
  const rightIdx = spreadStart + 1;
  const rightPage = rightIdx < total ? pages[rightIdx] : undefined;
  const atLastSpread = spreadStart >= total - 2;

  const goPage = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(total - 1, i));
      const n = mode === "book" ? clamped - (clamped % 2) : clamped;
      setPage(n);
      if (mode === "scroll") scroller.current?.querySelector(`[data-page="${n}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [mode, total],
  );

  const scrollToTop = useCallback(() => {
    setPage(0);
    setScrollPct(0);
    if (mode === "scroll") {
      scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [mode]);

  const setMode = (m: Mode) => {
    act.setPrefs({ mangaMode: m });
    if (m === "book") setPage((p) => p - (p % 2));
    if (m === "scroll") setTimeout(() => scroller.current?.querySelector(`[data-page="${page}"]`)?.scrollIntoView({ block: "start" }), 30);
  };

  /* keyboard */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "SELECT") return;
      if (e.key === "Escape" && preview) onClose?.();
      if (e.key === "f") fs.toggle();
      const step = mode === "book" ? 2 : 1;
      if (mode === "page" || mode === "book") {
        if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goPage(page + step); }
        if (e.key === "ArrowLeft") { e.preventDefault(); goPage(page - step); }
      } else {
        if (e.key === "ArrowRight") goPage(page + 1);
        if (e.key === "ArrowLeft") goPage(page - 1);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [mode, page, goPage, fs, preview, onClose]);

  /* chrome autohide + continuous scroll progress on scroll; rAF-throttled, progress quantized to 0.5% steps */
  useEffect(() => {
    const el = scroller.current;
    if (!el || mode !== "scroll") return;
    let last = el.scrollTop;
    let frame = 0;
    const run = () => {
      frame = 0;
      const t = el.scrollTop;
      const max = el.scrollHeight - el.clientHeight;
      if (max > 0) setScrollPct(Math.round(Math.min(1, Math.max(0, t / max)) * 200) / 200);
      if (Math.abs(t - last) > 14) {
        setChrome(t < last || t < 80);
        last = t;
      }
    };
    const h = () => {
      if (!frame) frame = requestAnimationFrame(run);
    };
    el.addEventListener("scroll", h, { passive: true });
    return () => {
      el.removeEventListener("scroll", h);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mode]);

  /* progress save + resume */
  useEffect(() => {
    if (preview) return;
    const currentLast = mode === "book" ? Math.min(total, spreadStart + 2) : page + 1;
    const t = setTimeout(() => act.saveProgress(story.id, chapter, currentLast / total), 700);
    return () => clearTimeout(t);
  }, [page, spreadStart, mode, story.id, chapter, total, preview, act]);

  const resumed = useRef(false);
  useEffect(() => {
    if (preview || !state.hydrated || resumed.current) return;
    resumed.current = true;
    const p = me.progress[story.id];
    if (p && p.chapter === chapter && p.pct > 0.12 && p.pct < 0.98 && mode === "scroll") {
      const idx = Math.round(p.pct * total) - 1;
      setTimeout(() => {
        scroller.current?.querySelector(`[data-page="${idx}"]`)?.scrollIntoView({ block: "start" });
        toast(`Resumed at page ${idx + 1}`, "info");
      }, 250);
    }
  }, [state.hydrated, me.progress, story.id, chapter, total, mode, preview, toast]);

  const bm = me.bookmarks.find((b) => b.storyId === story.id && b.chapter === chapter && Math.abs(b.pct - (page + 1) / total) < 0.5 / total);
  const onJumpPct = (p: number) => {
    const el = scroller.current;
    if (mode === "scroll" && el) {
      el.scrollTo({ top: p * (el.scrollHeight - el.clientHeight), behavior: "smooth" });
    } else {
      goPage(Math.round(p * (total - 1)));
    }
  };
  const liveProgress = mode === "scroll" ? scrollPct : Math.min(1, Math.max(0, total > 1 ? page / (total - 1) : 0));

  const Cta = (
    <div className="mx-auto my-10 max-w-md px-4 text-center text-white">
      <div className="h-display text-3xl">Chapter complete</div>
      <p className="mt-2 text-sm text-white/70">How was “{title}”?</p>
      {!preview && <div className="mt-2 flex justify-center"><Stars value={me.ratings[story.id] ?? 0} size={26} onChange={(n) => act.setRating(story.id, n)} /></div>}
      <div className="mt-5 flex flex-col gap-2.5">
        {next && !preview && <Link href={`/read/${story.id}/${next}`} className="btn btn-accent !py-3.5"><Icon name="arrow" size={16} /> Next: Chapter {next} — {nav.titleOf(next)}</Link>}
        {!preview && <Link href={`/story/${story.id}`} className="btn btn-ghost">Back to story</Link>}
        {preview && <button className="btn btn-ghost" onClick={onClose}>Close preview</button>}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#0d0c12] text-white" style={{ zIndex: z }}>
      {/* content */}
      {mode === "scroll" && (
        <div ref={scroller} className="scroll-y absolute inset-0">
          <div className="mx-auto pb-24 pt-16 transition-[max-width] duration-300" style={{ maxWidth: width }} onClick={() => setChrome((c) => !c)}>
            <div>
              {pages.map((p, i) => <PageSlot key={p.key} item={p} idx={i} style={style} root={scroller} onVisible={setPage} />)}
            </div>
          </div>
          <div className="pb-28">{Cta}</div>
        </div>
      )}

      {mode === "page" && (
        <div className="absolute inset-0 flex items-center justify-center px-2 pb-16 pt-16">
          <div className="relative flex h-full w-full items-center justify-center">
            <div className="relative max-h-full overflow-hidden rounded-sm bg-[#fbfaf6] shadow-2xl" style={{ aspectRatio: pages[page].src ? undefined : "2 / 3", height: pages[page].src ? undefined : "100%", maxWidth: "100%" }}>
              {renderSinglePage(pages[page], page, style)}
              <span className="pointer-events-none absolute bottom-2 right-2.5 rounded bg-black/65 px-2 py-0.5 font-mono text-[0.65rem] font-bold text-white/90">
                {page + 1} / {total}
              </span>
            </div>
            <button className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize" aria-label="Previous page" onClick={() => goPage(page - 1)} />
            <button className="absolute inset-y-0 left-1/3 w-1/3" aria-label="Toggle controls" onClick={() => setChrome((c) => !c)} />
            <button className="absolute inset-y-0 right-0 w-1/3 cursor-e-resize" aria-label="Next page" onClick={() => goPage(page + 1)} />
            {page === total - 1 && <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center"><div className="pointer-events-auto rounded-xl bg-black/80 p-3">{next && !preview ? <Link href={`/read/${story.id}/${next}`} className="btn btn-accent">Next chapter <Icon name="arrow" size={14} /></Link> : <button className="btn btn-ghost" onClick={preview ? onClose : undefined}>{preview ? "Close preview" : "End of series so far"}</button>}</div></div>}
          </div>
        </div>
      )}

      {mode === "book" && leftPage && (
        <div className="absolute inset-0 flex items-center justify-center px-3 pb-16 pt-16 sm:px-6">
          <div className="relative flex h-full w-full items-center justify-center">
            {/* Two-page open book spread */}
            <div
              className="relative grid aspect-[4/3] max-h-full max-w-full grid-cols-2 overflow-hidden rounded-md border border-white/15 bg-[#fbfaf6] shadow-[0_24px_60px_rgba(0,0,0,0.8)]"
              style={{ height: "100%" }}
            >
              {/* Left Page */}
              <div className="relative h-full w-full overflow-hidden bg-[#fbfaf6]">
                {renderSinglePage(leftPage, spreadStart, style)}
                <span className="pointer-events-none absolute bottom-2 left-2.5 rounded bg-black/65 px-2 py-0.5 font-mono text-[0.62rem] font-bold text-white/90">
                  {spreadStart + 1}
                </span>
              </div>

              {/* Right Page */}
              <div className="relative h-full w-full overflow-hidden bg-[#fbfaf6]">
                {rightPage ? (
                  <>
                    {renderSinglePage(rightPage, rightIdx, style)}
                    <span className="pointer-events-none absolute bottom-2 right-2.5 rounded bg-black/65 px-2 py-0.5 font-mono text-[0.62rem] font-bold text-white/90">
                      {rightIdx + 1}
                    </span>
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-[#f4efe4] p-6 text-center text-[#15120f]">
                    <div className="font-display text-xl sm:text-2xl">End of Chapter {chapter}</div>
                    <p className="mt-1 font-mono text-xs text-[#7a7064]">{title}</p>
                  </div>
                )}
              </div>

              {/* Center Book Spine Shadow & Seam */}
              <div
                className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-8 -translate-x-1/2"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 42%, rgba(0,0,0,0.48) 50%, rgba(0,0,0,0.18) 58%, rgba(0,0,0,0) 100%)",
                }}
              />
            </div>

            {/* Click zones: Left = Prev 2 pages, Center = Toggle Nav, Right = Next 2 pages */}
            <button className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize" aria-label="Previous spread" onClick={() => goPage(spreadStart - 2)} />
            <button className="absolute inset-y-0 left-1/3 w-1/3" aria-label="Toggle controls" onClick={() => setChrome((c) => !c)} />
            <button className="absolute inset-y-0 right-0 w-1/3 cursor-e-resize" aria-label="Next spread" onClick={() => goPage(spreadStart + 2)} />

            {atLastSpread && (
              <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center">
                <div className="pointer-events-auto rounded-xl bg-black/80 p-3">
                  {next && !preview ? (
                    <Link href={`/read/${story.id}/${next}`} className="btn btn-accent">
                      Next chapter <Icon name="arrow" size={14} />
                    </Link>
                  ) : (
                    <button className="btn btn-ghost" onClick={preview ? onClose : undefined}>
                      {preview ? "Close preview" : "End of series so far"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {prefs.atmos && !preview && <AtmosLayer mood={story.mood} strength={0.45} className="z-[5] mix-blend-screen" />}

      {/* Unified Scrollbar Echoes + Bottom-Right Circular Settings & Up-to-Top Dock */}
      <LivingRoom
        storyId={story.id}
        ch={chapter}
        mood={story.mood}
        progress={liveProgress}
        onJump={onJumpPct}
        onScrollTop={scrollToTop}
        onOpenChapters={() => setPicker(true)}
        bookmarked={!!bm}
        onToggleBookmark={() => (bm ? act.removeBookmark(bm.id) : act.addBookmark(story.id, chapter, (page + 1) / total, `Ch. ${chapter} · page ${page + 1}`))}
        fullscreen={fs.on}
        onToggleFullscreen={fs.toggle}
        preview={preview}
        visible={chrome}
      >
        <div className="space-y-3">
          <div>
            <div className="label mb-1.5">Reading Mode</div>
            <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Reading mode">
              {([["scroll", "Scroll"], ["page", "Page"], ["book", "Book"]] as const).map(([m, l]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={cx(
                    "rounded-md border-2 border-[#15120f] py-1.5 text-xs font-extrabold transition-colors",
                    mode === m
                      ? "bg-[#15120f] text-[#fbf8f1] shadow-[2px_2px_0_var(--accent)]"
                      : "bg-[#e8e1d1] text-[#15120f] hover:bg-hl",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {mode === "scroll" && (
            <div>
              <div className="label mb-1 flex justify-between">
                <span>Page Width</span>
                <span className="text-[#15120f]">{width}px</span>
              </div>
              <input
                type="range"
                min={560}
                max={1080}
                step={20}
                value={width}
                onChange={(e) => setWidth(+e.target.value)}
                className="w-full"
                aria-label="Page width"
              />
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {[
                  [640, "Compact"],
                  [820, "Standard"],
                  [1020, "Wide"],
                ].map(([w, lbl]) => (
                  <button
                    key={w}
                    onClick={() => setWidth(w as number)}
                    className={cx(
                      "chip justify-center !border-[#15120f] !py-1",
                      width === w ? "!bg-[#15120f] !text-[#fbf8f1]" : "!bg-[#fbf8f1] !text-[#15120f] hover:!bg-hl",
                    )}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </LivingRoom>

      {/* Top Nav: Left = Back to Story, Center = Story Title + Current Chapter */}
      <header className={cx("absolute inset-x-0 top-0 z-40 border-b border-white/15 bg-black/85 backdrop-blur-md transition-transform duration-300", chrome ? "translate-y-0" : "-translate-y-full")}>
        <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-5">
          <div className="justify-self-start">
            {preview ? (
              <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-md border-2 border-white/30 px-2.5 py-1.5 text-xs font-extrabold text-white transition-colors hover:border-white">
                <Icon name="left" size={14} />
                <span>Close</span>
              </button>
            ) : (
              <Link href={`/story/${story.id}`} className="inline-flex items-center gap-1.5 rounded-md border-2 border-white/30 px-2.5 py-1.5 text-xs font-extrabold text-white transition-colors hover:border-white">
                <Icon name="left" size={14} />
                <span>Back</span>
              </Link>
            )}
          </div>

          <button onClick={() => setPicker(true)} className="min-w-0 max-w-[60vw] text-center" aria-label="Choose chapter">
            <div className="truncate text-sm font-extrabold sm:text-base">{story.title}</div>
            <div className="truncate font-mono text-[0.68rem] text-white/65">
              {preview ? "PREVIEW · " : ""}Ch. {chapter} — {title}
            </div>
          </button>

          <div className="justify-self-end" />
        </div>
      </header>

      {/* Bottom Nav: Left = Previous Chapter, Center = Current Chapter + Title, Right = Next Chapter */}
      <footer className={cx("absolute inset-x-0 bottom-0 z-40 border-t border-white/15 bg-black/85 px-3 py-2.5 backdrop-blur-md transition-transform duration-300 sm:px-5", chrome || mode !== "scroll" ? "translate-y-0" : "translate-y-full")}>
        <div className="mx-auto grid max-w-5xl grid-cols-[auto_1fr_auto] items-center gap-3">
          {prev && !preview ? (
            <Link href={`/read/${story.id}/${prev}`} className="inline-flex items-center gap-1.5 rounded-md border-2 border-white/30 px-3 py-1.5 font-mono text-xs font-extrabold text-white transition-colors hover:border-white">
              <Icon name="left" size={14} />
              <span>Ch. {prev}</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-white/15 px-3 py-1.5 font-mono text-xs font-bold text-white/35">
              <Icon name="left" size={14} />
              <span>Prev</span>
            </span>
          )}

          <button onClick={() => setPicker(true)} className="min-w-0 truncate px-2 text-center" aria-label="Open chapter list">
            <span className="font-mono text-xs font-extrabold text-white sm:text-sm">
              Ch. {chapter} <span className="text-white/40">—</span> <span className="font-sans">{title}</span>
            </span>
          </button>

          {next && !preview ? (
            <Link href={`/read/${story.id}/${next}`} className="inline-flex items-center gap-1.5 rounded-md border-2 border-white/30 px-3 py-1.5 font-mono text-xs font-extrabold text-white transition-colors hover:border-white">
              <span>Ch. {next}</span>
              <Icon name="right" size={14} />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-white/15 px-3 py-1.5 font-mono text-xs font-bold text-white/35">
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

export { isVisual };
