"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { STORIES, CREATORS, STORY_MAP, ALL_GENRES } from "@/data/stories";
import { TYPE_LABEL, isVisual, type Story } from "@/lib/types";
import { chapterTitle } from "@/lib/content";
import { cx, fmtAgoHours, fmtNum } from "@/lib/util";
import { useApp } from "@/lib/store";
import { Cover } from "./Cover";
import { Rail, StoryCard } from "./StoryCard";
import { Avatar, Empty, Icon, ProgressBar, Tabs, TypeBadge } from "./ui";

export function Ticker() {
  const items = useMemo(() => [...STORIES].sort((a, b) => a.updatedHours - b.updatedHours).slice(0, 12), []);
  const row = (k: string) => (
    <div key={k} className="flex shrink-0 items-center gap-8 pr-8">
      {items.map((s) => (
        <Link key={k + s.id} href={`/read/${s.id}/${s.chapters}`} className="flex items-center gap-2 whitespace-nowrap font-mono text-xs font-semibold hover:text-accent">
          <span className="size-2 rounded-full bg-accent" />
          {s.title} <span className="text-muted">Ch. {s.chapters}</span> <span className="text-muted">· {fmtAgoHours(s.updatedHours)}</span>
        </Link>
      ))}
    </div>
  );
  return (
    <div className="mt-8 overflow-hidden border-y-2 border-line bg-card py-2.5" aria-label="Live chapter updates">
      <div className="anim-marquee pause-hover flex w-max">{row("a")}{row("b")}</div>
    </div>
  );
}

export function ContinueReading() {
  const { me, getStory, now } = useApp();
  const items = useMemo(() => {
    const seen = new Set<string>();
    return me.history.filter((h) => (seen.has(h.storyId) ? false : seen.add(h.storyId))).slice(0, 5);
  }, [me.history]);
  void now;
  if (!items.length) return <Empty icon="book" title="Nothing in progress yet" text="Open any story and your place is saved automatically — down to the panel or paragraph." action={<Link href="/discover" className="btn">Find something to read</Link>} />;
  return (
    <div className="scroll-x -mx-4 -my-2.5 flex snap-x gap-4 px-4 py-2.5 md:-mx-2.5 md:-my-2.5 md:grid md:grid-cols-5 md:overflow-visible md:px-2.5 md:py-2.5">
      {items.map((h) => {
        const s = getStory(h.storyId);
        if (!s) return null;
        const p = me.progress[s.id];
        const pct = Math.min(1, ((p?.chapter ?? h.chapter) - 1 + (p?.pct ?? 0)) / s.chapters);
        return (
          <Link key={s.id} href={`/read/${s.id}/${h.chapter}`} className="panel panel-hover group flex w-[72vw] max-w-[280px] shrink-0 snap-start gap-3 p-2.5 md:w-auto md:max-w-none md:flex-col">
            <Cover story={s} compact className="w-20 shrink-0 rounded border-2 border-line md:w-full" />
            <div className="min-w-0 flex-1 md:flex-none">
              <div className="truncate text-sm font-extrabold">{s.title}</div>
              <div className="mt-0.5 truncate text-xs text-muted">Ch. {h.chapter} · {chapterTitle(s, h.chapter)}</div>
              <ProgressBar value={pct} className="mt-2" />
              <div className="mt-1.5 flex items-center justify-between font-mono text-[0.65rem] text-muted">
                <span>{Math.round(pct * 100)}% of series</span>
                <span className="flex items-center gap-1 font-bold text-accent group-hover:underline"><Icon name="play" size={10} fill /> Resume</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

type Range = "today" | "week" | "all";
export function Trending({ variant = "rail" }: { variant?: "rail" | "list" }) {
  const { catalog } = useApp();
  const [range, setRange] = useState<Range>("week");
  const [fmt, setFmt] = useState<"all" | "visual" | "text">("all");
  const list = useMemo(() => {
    const f = catalog.filter((s) => (fmt === "all" ? true : fmt === "visual" ? isVisual(s.type) : !isVisual(s.type)));
    const score = (s: Story) => (range === "today" ? s.weekly / (1 + s.updatedHours / 10) : range === "week" ? s.weekly : s.votes);
    return [...f].sort((a, b) => score(b) - score(a)).slice(0, variant === "list" ? 10 : 12);
  }, [catalog, range, fmt, variant]);
  if (variant === "list") {
    return (
      <div>
        <Tabs tabs={[{ id: "today", label: "Today" }, { id: "week", label: "Week" }, { id: "all", label: "All-time" }]} value={range} onChange={(v) => setRange(v as Range)} />
        <ol className="mt-3 space-y-2">
          {list.map((s, i) => (
            <li key={`${range}-${s.id}`}>
              <Link href={`/story/${s.id}`} className="panel-flat group flex items-center gap-2.5 p-2 transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--shadow)]">
                <span className={cx("h-display w-7 shrink-0 text-center text-2xl", i < 3 ? "text-accent" : "text-muted")}>{i + 1}</span>
                <Cover story={s} compact className="w-11 shrink-0 rounded border-2 border-line" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.82rem] font-extrabold leading-tight group-hover:underline">{s.title}</span>
                  <span className="block truncate font-mono text-[0.62rem] text-muted">{s.alt}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[0.65rem] text-muted">
                    <TypeBadge type={s.type} />
                    <span className="flex items-center gap-0.5 font-bold text-ink"><Icon name="star" size={10} fill className="text-hl" />{s.rating.toFixed(1)}</span>
                    <span className="flex items-center gap-0.5"><Icon name="flame" size={10} className="text-accent" />{fmtNum((range === "all" ? s.votes : s.weekly * 1000))}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs tabs={[{ id: "today", label: "Today" }, { id: "week", label: "This week" }, { id: "all", label: "All-time" }]} value={range} onChange={(v) => setRange(v as Range)} />
        <div className="flex flex-wrap gap-1.5 py-1">
          {(["all", "visual", "text"] as const).map((f) => (
            <button key={f} className={cx("chip", fmt === f && "chip-on")} onClick={() => setFmt(f)} aria-pressed={fmt === f}>{f === "all" ? "Everything" : f === "visual" ? "Manga & webtoons" : "Novels & prose"}</button>
          ))}
        </div>
      </div>
      <Rail resetKey={`${range}-${fmt}`}>
        {list.map((s, i) => (
          <div key={`${range}-${fmt}-${s.id}`} className="w-[150px] sm:w-[178px]">
            <StoryCard story={s} rank={i + 1} />
          </div>
        ))}
      </Rail>
    </div>
  );
}

export function NewUpdates() {
  const { catalog } = useApp();
  const [page, setPage] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const list = useMemo(() => [...catalog].sort((a, b) => a.updatedHours - b.updatedHours), [catalog]);
  const PER = 16;
  const pages = Math.max(1, Math.ceil(list.length / PER));
  const cur = Math.min(page, pages - 1);
  const items = list.slice(cur * PER, cur * PER + PER);
  const go = (p: number) => {
    setPage(Math.min(pages - 1, Math.max(0, p)));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div ref={topRef} className="scroll-mt-24">
      <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((s, i) => (
          <li key={s.id} className="anim-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="panel-flat group flex h-full flex-col overflow-hidden p-2 transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--shadow)]">
              <Link href={`/story/${s.id}`} className="relative block" aria-label={s.title}>
                <Cover story={s} compact className="rounded border-2 border-line" />
                {s.updatedHours < 24 && <span className="chip absolute left-1.5 top-1.5 !border-accent !bg-accent !text-white">NEW</span>}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col px-1 pb-1 pt-2">
                <TypeBadge type={s.type} className="self-start" />
                <Link href={`/story/${s.id}`} className="mt-1.5 line-clamp-2 min-h-[2.4em] text-sm font-extrabold leading-tight hover:underline">{s.title}</Link>
                <div className="mt-1.5 space-y-1 border-t-2 border-dashed border-line/20 pt-1.5">
                  {[0, 1, 2].map((k) => {
                    const n = s.chapters - k;
                    if (n < 1) return null;
                    return (
                      <Link key={n} href={`/read/${s.id}/${n}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-1.5 font-mono text-[0.68rem] hover:text-accent">
                        <span className="font-bold">Ch. {n}</span>
                        <span className="truncate text-muted">{k === 0 ? s.latest : chapterTitle(s, n)}</span>
                        {k === 0 ? <span className="text-muted">{fmtAgoHours(s.updatedHours)}</span> : <span />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <nav className="mt-5 flex items-center justify-center gap-2" aria-label="Newly updated pages">
          <button className="btn btn-sm" disabled={cur === 0} onClick={() => go(cur - 1)} aria-label="Previous page"><Icon name="arrow" size={13} className="rotate-180" /></button>
          {Array.from({ length: pages }, (_, p) => (
            <button key={p} className={cx("btn btn-sm", p === cur && "btn-accent")} onClick={() => go(p)} aria-current={p === cur ? "page" : undefined} aria-label={`Page ${p + 1}`}>{p + 1}</button>
          ))}
          <button className="btn btn-sm" disabled={cur === pages - 1} onClick={() => go(cur + 1)} aria-label="Next page"><Icon name="arrow" size={13} /></button>
        </nav>
      )}
    </div>
  );
}

export function CreatorSpotlight() {
  const { me, act } = useApp();
  const picks = CREATORS.filter((c) => ["hana-mori", "seo-yeon-han", "liang-wei", "ume-kobayashi"].includes(c.id));
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {picks.map((c) => {
        const works = STORIES.filter((s) => s.creator === c.id);
        const f = me.following.includes(c.id);
        return (
          <div key={c.id} className="panel panel-hover flex flex-col p-4">
            <div className="flex items-center gap-3">
              <Avatar account={c} size={52} />
              <div className="min-w-0">
                <Link href={`/u/${c.id}`} className="block truncate font-extrabold hover:underline">{c.name}</Link>
                <div className="font-mono text-[0.68rem] text-muted">{fmtNum(c.followers)} followers</div>
              </div>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-ink2">{c.tagline}</p>
            <div className="mt-3 flex -space-x-3">
              {works.slice(0, 3).map((w) => <Cover key={w.id} story={w} compact className="w-10 rounded border-2 border-line" />)}
            </div>
            <button className={cx("btn btn-sm mt-4", f ? "btn-ghost" : "")} onClick={() => act.toggleFollow(c.id)} aria-pressed={f}>
              <Icon name={f ? "check" : "plus"} size={13} /> {f ? "Following" : "Follow"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function StudioBanner() {
  const { account, act } = useApp();
  const creator = account.role === "creator";
  return (
    <div className="panel relative overflow-hidden bg-hl p-6 md:p-10" style={{ background: "var(--hl)" }}>
      <div className="tone-lg absolute inset-0 opacity-60" style={{ ["--tone" as string]: "rgba(21,18,15,.18)" }} />
      <div className="relative grid items-center gap-6 text-[#15120f] md:grid-cols-[1fr_auto]">
        <div>
          <div className="font-mono text-xs font-bold uppercase tracking-[0.2em]">For creators</div>
          <h3 className="h-display mt-2 text-3xl md:text-5xl">Your story deserves a “ตอนต่อไป.”</h3>
          <p className="mt-3 max-w-xl font-semibold text-[#15120f]/80">Draft chapters, drop in manga pages, schedule releases, and watch simulated reader analytics respond to every choice. Everything saves in your browser.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {creator ? (
            <Link href="/studio" className="btn !px-5 !py-3">Open your Studio <Icon name="arrow" size={16} /></Link>
          ) : (
            <button className="btn !px-5 !py-3" onClick={() => act.switchAccount("ren-akitsuki")}>Try the Uploader demo <Icon name="arrow" size={16} /></button>
          )}
          <Link href="/studio/new" className="btn btn-ghost !border-[#15120f]">New story</Link>
        </div>
      </div>
    </div>
  );
}

export function GenreStrip() {
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_GENRES.map((g) => (
        <Link key={g} href={`/discover?genre=${encodeURIComponent(g)}`} className="chip !px-3 !py-1.5 !text-xs transition-transform hover:-translate-y-0.5 hover:!bg-hl hover:!text-[#15120f]">{g}</Link>
      ))}
    </div>
  );
}

export function TopSummary() {
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    STORIES.filter((s) => s.rank).forEach((s) => (m[TYPE_LABEL[s.type]] = (m[TYPE_LABEL[s.type]] ?? 0) + 1));
    return Object.entries(m);
  }, []);
  void STORY_MAP;
  return (
    <div className="flex flex-wrap gap-1.5">
      {counts.map(([k, v]) => <span key={k} className="chip">{v} × {k}</span>)}
    </div>
  );
}
