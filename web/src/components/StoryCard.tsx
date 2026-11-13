"use client";

import Link from "next/link";
import { memo, useEffect, useRef, type ReactNode } from "react";
import type { Story } from "@/lib/types";
import { cx, fmtAgoHours, fmtNum } from "@/lib/util";
import { useApp } from "@/lib/store";
import { Cover } from "./Cover";
import { Icon, Stars, TypeBadge } from "./ui";

export const StoryCard = memo(function StoryCard({ story, match, className, rank, showUpdated, progress }: { story: Story; match?: number; className?: string; rank?: number; showUpdated?: boolean; progress?: number }) {
  const { me, act } = useApp();
  const saved = me.library.includes(story.id);
  const ref = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  const enter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    rectRef.current = ref.current.getBoundingClientRect();
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const cx0 = e.clientX;
    const cy0 = e.clientY;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = ref.current;
      if (!el) return;
      const r = rectRef.current ?? (rectRef.current = el.getBoundingClientRect());
      el.style.setProperty("--rx", `${(-((cy0 - r.top) / r.height - 0.5) * 8).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(((cx0 - r.left) / r.width - 0.5) * 10).toFixed(2)}deg`);
    });
  };
  const leave = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    rectRef.current = null;
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };
  return (
    <div className={cx("group relative w-full", className)}>
      <Link href={`/story/${story.id}`} className="block" aria-label={`${story.title} — open details`}>
        <div
          ref={ref}
          onPointerEnter={enter}
          onPointerMove={move}
          onPointerLeave={leave}
          className="relative rounded-md border-2 border-line shadow-[4px_4px_0_var(--shadow)] transition-shadow duration-150 [transform:perspective(800px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] group-hover:shadow-[8px_8px_0_var(--shadow)]"
        >
          <Cover story={story} rank={rank} className="rounded-[4px]" />
          {match !== undefined && (
            <span className="absolute bottom-2 right-2 rounded-full border-2 border-line bg-hl px-2 py-0.5 font-mono text-[0.68rem] font-extrabold text-[#15120f]">{match}% match</span>
          )}
          {progress !== undefined && (
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/60">
              <div className="h-full bg-accent" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </div>
        <div className="mt-3 px-0.5">
          <div className="flex items-center gap-1.5">
            <TypeBadge type={story.type} />
            {story.rating > 0 && (
              <span className="flex items-center gap-1 font-mono text-[0.68rem] font-semibold">
                <Icon name="star" size={11} fill className="text-hl" /> {story.rating.toFixed(1)}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 line-clamp-1 text-[0.95rem] font-extrabold leading-tight">{story.title}</h3>
          <p className="line-clamp-1 text-xs text-muted">
            {showUpdated ? `Ch. ${story.chapters} · ${fmtAgoHours(story.updatedHours)}` : story.genres.slice(0, 2).join(" · ")}
          </p>
        </div>
      </Link>
      <button
        onClick={() => act.toggleLibrary(story.id)}
        aria-label={saved ? `Remove ${story.title} from library` : `Add ${story.title} to library`}
        aria-pressed={saved}
        className={cx("absolute right-2 top-2 grid size-8 place-items-center rounded-full border-2 border-line shadow-[2px_2px_0_var(--shadow)] transition-all md:scale-90 md:opacity-0 md:group-hover:scale-100 md:group-hover:opacity-100 focus-visible:opacity-100", saved ? "bg-accent text-white" : "bg-card text-ink")}
      >
        <Icon name={saved ? "check" : "bookmark"} size={14} />
      </button>
    </div>
  );
});

export function Rail({ children, className, resetKey }: { children: ReactNode; className?: string; resetKey?: string | number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "smooth" });
  }, [resetKey]);

  const go = (d: number) => {
    const el = ref.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    if (d > 0 && el.scrollLeft >= maxScroll - 12) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (d < 0 && el.scrollLeft <= 12) {
      el.scrollTo({ left: maxScroll, behavior: "smooth" });
    } else {
      const target = Math.max(0, Math.min(maxScroll, el.scrollLeft + d * el.clientWidth * 0.8));
      el.scrollTo({ left: target, behavior: "smooth" });
    }
  };

  return (
    <div className={cx("group/rail relative", className)}>
      <div ref={ref} className="scroll-x -mx-3 -my-3 flex snap-x gap-4 px-3 py-3 [overflow-anchor:none] md:gap-5 [&>*]:shrink-0 [&>*]:snap-start">
        {children}
      </div>
      <button onClick={() => go(-1)} aria-label="Scroll left" className="btn btn-ghost btn-icon absolute -left-3 top-[34%] z-20 hidden !rounded-full opacity-0 transition-opacity group-hover/rail:opacity-100 md:grid">
        <Icon name="left" size={18} />
      </button>
      <button onClick={() => go(1)} aria-label="Scroll right" className="btn btn-ghost btn-icon absolute -right-3 top-[34%] z-20 hidden !rounded-full opacity-0 transition-opacity group-hover/rail:opacity-100 md:grid">
        <Icon name="right" size={18} />
      </button>
    </div>
  );
}
