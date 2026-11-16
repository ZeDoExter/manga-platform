"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_GENRES, CREATOR_MAP } from "@/data/stories";
import { COLOR_LABEL, TYPE_LABEL, type ColorMode, type StoryType } from "@/lib/types";
import { matchScore } from "@/lib/content";
import { suggest } from "@/lib/search";
import { cx } from "@/lib/util";
import { useApp } from "@/lib/store";
import { liveRating, useStoryRatings } from "@/lib/ratings";
import { useStoryReads } from "@/lib/reads";
import { StoryCard } from "./StoryCard";
import { Cover } from "./Cover";
import { Empty, Icon } from "./ui";

const TYPES: StoryType[] = ["manga", "manhwa", "manhua", "light-novel", "web-novel", "original"];
const SORTS = [
  ["match", "Best match for you"],
  ["trending", "Trending"],
  ["rating", "Top rated"],
  ["updated", "Recently updated"],
  ["popular", "Most followed"],
  ["chapters", "Most chapters"],
] as const;
type Sort = (typeof SORTS)[number][0];

export function DiscoverView({ initial }: { initial: { q?: string; genre?: string; type?: string } }) {
  const sp = { get: (k: string) => initial[k as "q" | "genre" | "type"] ?? null };
  const router = useRouter();
  const { catalog, me } = useApp();
  const ratings = useStoryRatings(catalog.map((s) => s.id));
  const readsWeek = useStoryReads("week");
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [types, setTypes] = useState<StoryType[]>(sp.get("type") ? [sp.get("type") as StoryType] : []);
  const [genres, setGenres] = useState<string[]>(sp.get("genre") ? [sp.get("genre") as string] : []);
  const [status, setStatus] = useState("any");
  const [artwork, setArtwork] = useState<"any" | ColorMode>("any");
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<Sort>("match");
  const [focus, setFocus] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const spKey = `${initial.q ?? ""}|${initial.genre ?? ""}|${initial.type ?? ""}`;
  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setGenres(sp.get("genre") ? [sp.get("genre") as string] : []);
    setTypes(sp.get("type") ? [sp.get("type") as StoryType] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spKey]);

  useEffect(() => {
    const h = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setFocus(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const sugg = useMemo(() => suggest(q, catalog, 7), [q, catalog]);

  const results = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = catalog
      .filter((s) => (types.length ? types.includes(s.type) : true))
      .filter((s) => (genres.length ? genres.every((g) => s.genres.includes(g)) : true))
      .filter((s) => (status === "any" ? true : s.status === status))
      .filter((s) => (artwork === "any" ? true : s.colorMode === artwork))
      .filter((s) => liveRating(ratings, s).avg >= minRating)
      .filter((s) => {
        if (!terms.length) return true;
        const hay = `${s.title} ${s.alt} ${CREATOR_MAP[s.creator]?.name ?? ""} ${s.tags.join(" ")} ${s.genres.join(" ")} ${s.synopsis}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      })
      .map((s) => ({ s, m: matchScore(s, me.taste, me.profile.genres) }));
    const by: Record<Sort, (a: { s: (typeof list)[0]["s"]; m: number }, b: { s: (typeof list)[0]["s"]; m: number }) => number> = {
      match: (a, b) => b.m - a.m,
      trending: (a, b) => (readsWeek[b.s.id] ?? 0) - (readsWeek[a.s.id] ?? 0),
      rating: (a, b) => liveRating(ratings, b.s).avg - liveRating(ratings, a.s).avg || liveRating(ratings, b.s).count - liveRating(ratings, a.s).count,
      updated: (a, b) => a.s.updatedHours - b.s.updatedHours,
      popular: (a, b) => b.s.followers - a.s.followers,
      chapters: (a, b) => b.s.chapters - a.s.chapters,
    };
    return list.sort(by[sort]);
  }, [catalog, q, types, genres, status, artwork, minRating, sort, me.taste, me.profile.genres, ratings, readsWeek]);

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const activeCount = types.length + genres.length + (status !== "any" ? 1 : 0) + (artwork !== "any" ? 1 : 0) + (minRating > 0 ? 1 : 0) + (q ? 1 : 0);
  const clear = () => { setQ(""); setTypes([]); setGenres([]); setStatus("any"); setArtwork("any"); setMinRating(0); router.replace("/discover"); };

  return (
    <div className="wrap py-8 md:py-12">
      <div className="mb-8">
        <div className="label">{"// advanced search"}</div>
        <h1 className="h-display mt-1 text-4xl md:text-6xl">Discover <span className="align-top font-sans text-sm font-extrabold text-accent">探す</span></h1>
      </div>

      <div ref={wrap} className="relative z-[60]">
        <div className="panel flex items-center gap-3 !rounded-xl px-4">
          <Icon name="search" size={20} />
          <input
            value={q}
            onFocus={() => setFocus(true)}
            onChange={(e) => { setQ(e.target.value); setFocus(true); }}
            onKeyDown={(e) => e.key === "Enter" && setFocus(false)}
            placeholder="Try “bell”, “ghost chef”, “Kaito Ryuzaki”, “slow burn”…"
            className="h-14 min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-muted md:h-16 md:text-lg"
            aria-label="Search stories"
            aria-autocomplete="list"
          />
          {q && <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setQ("")} aria-label="Clear search"><Icon name="x" size={14} /></button>}
          <button className="btn btn-ghost btn-sm lg:hidden" onClick={() => setFiltersOpen((o) => !o)}><Icon name="sliders" size={14} /> Filters{activeCount ? ` (${activeCount})` : ""}</button>
        </div>
        {focus && sugg.length > 0 && (
          <ul className="panel anim-pop absolute inset-x-0 top-[calc(100%+8px)] z-[70] overflow-hidden p-1.5 shadow-[6px_6px_0_var(--shadow)]" role="listbox">
            {sugg.map((s) => (
              <li key={s.kind + s.id}>
                <button
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-paper2"
                  onClick={() => {
                    setFocus(false);
                    if (s.kind === "genre") { setGenres((g) => (g.includes(s.id) ? g : [...g, s.id])); setQ(""); }
                    else if (s.kind === "tag") setQ(s.id);
                    else router.push(s.href);
                  }}
                >
                  {s.story ? <Cover story={s.story} compact className="w-8 shrink-0 rounded border border-line" /> : <span className="grid size-8 place-items-center rounded border-2 border-line"><Icon name={s.kind === "creator" ? "user" : "sparkles"} size={14} /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold">{s.label}</span>
                    <span className="block truncate text-xs text-muted">{s.sub}</span>
                  </span>
                  <span className="chip !text-[0.58rem]">{s.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[260px_1fr]">
        <aside className={cx("lg:sticky lg:top-20 lg:block lg:self-start", filtersOpen ? "block" : "hidden")} aria-label="Filters">
          <div className="panel-flat flex flex-col overflow-hidden p-4 lg:max-h-[calc(100dvh-6rem)]">
            <div className="scroll-y min-h-0 flex-1 pr-0.5">
              <div className="label mb-2">Format</div>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => <button key={t} className={cx("chip", types.includes(t) && "chip-on")} aria-pressed={types.includes(t)} onClick={() => setTypes(toggle(types, t))}>{TYPE_LABEL[t]}</button>)}
              </div>
              <div className="label mb-2 mt-5">Genres <span className="normal-case">(match all)</span></div>
              <div className="scroll-y flex max-h-48 flex-wrap gap-1.5 pr-1">
                {ALL_GENRES.map((g) => <button key={g} className={cx("chip", genres.includes(g) && "chip-on")} aria-pressed={genres.includes(g)} onClick={() => setGenres(toggle(genres, g))}>{g}</button>)}
              </div>
              <div className="label mb-2 mt-5">Status</div>
              <div className="flex flex-wrap gap-1.5">
                {["any", "Ongoing", "Completed"].map((s) => <button key={s} className={cx("chip", status === s && "chip-on")} aria-pressed={status === s} onClick={() => setStatus(s)}>{s}</button>)}
              </div>
              <div className="label mb-2 mt-5">Artwork</div>
              <div className="flex flex-wrap gap-1.5">
                {(["any", "color", "mono"] as const).map((a) => <button key={a} className={cx("chip", artwork === a && "chip-on")} aria-pressed={artwork === a} onClick={() => setArtwork(a)}>{a === "any" ? "All" : COLOR_LABEL[a]}</button>)}
              </div>
              <div className="label mb-1 mt-5 flex justify-between"><span>Minimum rating</span><span className="text-ink">{minRating ? `${minRating.toFixed(1)}★` : "any"}</span></div>
              <input type="range" min={0} max={4.8} step={0.1} value={minRating} onChange={(e) => setMinRating(+e.target.value)} className="w-full" aria-label="Minimum rating" />
            </div>
            <button className="btn btn-ghost btn-sm mt-4 w-full shrink-0" onClick={clear}>Clear all filters</button>
          </div>
        </aside>

        <section aria-live="polite">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-sm font-bold">{results.length} {results.length === 1 ? "story" : "stories"}</span>
              {q && <button className="chip chip-on" onClick={() => setQ("")}>“{q}” ✕</button>}
              {types.map((t) => <button key={t} className="chip chip-on" onClick={() => setTypes(toggle(types, t))}>{TYPE_LABEL[t]} ✕</button>)}
              {genres.map((g) => <button key={g} className="chip chip-on" onClick={() => setGenres(toggle(genres, g))}>{g} ✕</button>)}
            </div>
            <label className="flex items-center gap-2 text-sm font-bold">
              <span className="label">Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="field !w-auto !py-1.5 text-sm font-bold">
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          {results.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
              {results.map(({ s, m }, i) => (
                <div key={s.id} className="anim-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                  <StoryCard story={s} match={sort === "match" ? m : undefined} />
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="search" title="No stories match those filters" text="Loosen a filter or try a different tag." action={<button className="btn" onClick={clear}>Reset filters</button>} />
          )}
        </section>
      </div>
    </div>
  );
}
