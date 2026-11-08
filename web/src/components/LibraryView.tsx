"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Story } from "@/lib/types";
import { fmtAgo, cx } from "@/lib/util";
import { useApp } from "@/lib/store";
import { Cover } from "./Cover";
import { StoryCard } from "./StoryCard";
import { Empty, Icon, ProgressBar, Stat, Tabs } from "./ui";

type Tab = "smart" | "mine" | "bookmarks" | "history" | "all";
const DAY = 86400000;
const EMOJIS = ["⭐", "🌙", "🔥", "☔", "🍜", "💔", "⚔️", "🧠", "🌸", "👻", "🚀", "📚"];

interface SmartRule {
  id: string;
  name: string;
  icon: string;
  rule: string;
  test: (s: Story, ctx: { prog?: { chapter: number; at: number }; now: number }) => boolean;
}

const RULES: SmartRule[] = [
  { id: "finish", name: "Finish tonight", icon: "clock", rule: "Within 15 chapters of the latest release", test: (s, { prog }) => !!prog && s.chapters - prog.chapter > 0 && s.chapters - prog.chapter <= 15 },
  { id: "fresh", name: "Fresh drops", icon: "zap", rule: "New chapter in the last 48 hours that you haven’t read", test: (s, { prog }) => s.updatedHours < 48 && (!prog || prog.chapter < s.chapters) },
  { id: "caught", name: "All caught up", icon: "check", rule: "You’ve read the latest chapter", test: (s, { prog }) => !!prog && prog.chapter >= s.chapters },
  { id: "slow", name: "Slow burns", icon: "moon", rule: "Pace ≤ 4 · depth ≥ 7", test: (s) => s.taste.pace <= 4 && s.taste.depth >= 7 },
  { id: "pound", name: "Heart-pounders", icon: "flame", rule: "Action ≥ 8 or pace ≥ 8", test: (s) => s.taste.action >= 8 || s.taste.pace >= 8 },
  { id: "dormant", name: "Gathering dust", icon: "calendar", rule: "Untouched for 30+ days", test: (_s, { prog, now }) => !!prog && now - prog.at > 30 * DAY },
  { id: "long", name: "Long hauls", icon: "library", rule: "200+ chapters", test: (s) => s.chapters >= 200 },
  { id: "noct", name: "Nocturnal reads", icon: "sparkles", rule: "Mood: dread, rain or stars", test: (s) => ["dread", "rain", "stars"].includes(s.mood) },
  { id: "cosy", name: "Comfort food", icon: "heart", rule: "Humor ≥ 6 or romance ≥ 8, darkness ≤ 3", test: (s) => (s.taste.humor >= 6 || s.taste.romance >= 8) && s.taste.darkness <= 3 },
];

function Stack({ stories }: { stories: Story[] }) {
  return (
    <div className="flex -space-x-5">
      {stories.slice(0, 4).map((s, i) => (
        <Cover key={s.id} story={s} compact className="w-12 rounded border-2 border-line shadow-[2px_2px_0_var(--shadow)]" />
      )).map((el, i) => <div key={i} style={{ zIndex: 10 - i, transform: `rotate(${(i - 1.5) * 4}deg)` }}>{el}</div>)}
    </div>
  );
}

export function LibraryView() {
  const { me, act, getStory, catalog, now, account } = useApp();
  const [tab, setTab] = useState<Tab>("smart");
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("⭐");

  const saved = useMemo(() => me.library.map(getStory).filter((s): s is Story => !!s), [me.library, getStory]);
  const smart = useMemo(
    () => RULES.map((r) => ({ r, items: saved.filter((s) => r.test(s, { prog: me.progress[s.id], now })) })).filter((x) => x.items.length),
    [saved, me.progress, now],
  );
  const collections = me.collections;
  const history = me.history.slice(0, 30);

  return (
    <div className="wrap py-8 md:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label">{"// "}{account.name.split(" ")[0]}’s shelves · auto-organized</div>
          <h1 className="h-display mt-1 text-4xl md:text-6xl">Smart Library <span className="align-top font-sans text-sm font-extrabold text-accent">本棚</span></h1>
        </div>
        <Link href="/discover" className="btn btn-ghost"><Icon name="plus" size={15} /> Find more stories</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Saved" value={saved.length} sub="stories in library" />
        <Stat label="In progress" value={Object.keys(me.progress).length} sub="with a saved place" />
        <Stat label="Bookmarks" value={me.bookmarks.length} sub="pages & paragraphs" />
        <Stat label="Smart shelves" value={smart.length} sub="auto-built from your habits" />
      </div>

      <Tabs
        className="mt-8"
        value={tab}
        onChange={(t) => { setTab(t); setOpen(null); }}
        tabs={[
          { id: "smart", label: "Smart shelves", icon: "wand", count: smart.length },
          { id: "mine", label: "My collections", icon: "grid", count: collections.length },
          { id: "bookmarks", label: "Bookmarks", icon: "bookmark", count: me.bookmarks.length },
          { id: "history", label: "History", icon: "clock" },
          { id: "all", label: "Everything", icon: "library", count: saved.length },
        ]}
      />

      <div className="mt-6">
        {tab === "smart" && (
          <div>
            <p className="mb-4 max-w-2xl text-sm text-ink2">Your library organizes itself. These shelves are live rules — finish a story, add a new one, or leave something untouched for a month and the shelves reshuffle.</p>
            {smart.length === 0 ? (
              <Empty icon="wand" title="Add stories to see smart shelves" text="Save a few titles and DOOTOON will sort them by pace, mood, progress and freshness." action={<Link href="/discover" className="btn">Browse stories</Link>} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {smart.map(({ r, items }) => (
                  <div key={r.id} className={cx(open === r.id && "md:col-span-2 lg:col-span-3")}>
                    <button onClick={() => setOpen(open === r.id ? null : r.id)} className="panel panel-hover flex w-full items-center gap-4 p-4 text-left" aria-expanded={open === r.id}>
                      <span className="grid size-12 shrink-0 place-items-center rounded-lg border-2 border-line bg-hl text-[#15120f]"><Icon name={r.icon} size={22} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="h-display block text-lg">{r.name}</span>
                        <span className="block text-xs text-muted">{r.rule}</span>
                        <span className="mt-1 inline-block font-mono text-[0.68rem] font-bold">{items.length} {items.length === 1 ? "story" : "stories"}</span>
                      </span>
                      <Stack stories={items} />
                    </button>
                    {open === r.id && (
                      <div className="anim-fade-up mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                        {items.map((s) => <StoryCard key={s.id} story={s} showUpdated progress={me.progress[s.id] ? me.progress[s.id].chapter / s.chapters : undefined} />)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "mine" && (
          <div>
            <form className="panel-flat mb-6 flex flex-wrap items-center gap-3 p-3" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { act.addCollection(name.trim(), emoji); setName(""); } }}>
              <div className="flex flex-wrap gap-1">
                {EMOJIS.map((e) => <button type="button" key={e} onClick={() => setEmoji(e)} aria-pressed={emoji === e} className={cx("grid size-9 place-items-center rounded-md border-2 text-lg", emoji === e ? "border-line bg-hl" : "border-transparent hover:border-line/40")}>{e}</button>)}
              </div>
              <input className="field !w-auto min-w-[180px] flex-1" placeholder="New collection name…" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} aria-label="Collection name" />
              <button className="btn" type="submit" disabled={!name.trim()}><Icon name="plus" size={14} /> Create</button>
            </form>
            {collections.length === 0 ? (
              <Empty icon="grid" title="No collections yet" text="Group stories your way — “Cry Safely”, “Train Reads”, “Better Than Sleep”." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {collections.map((c) => {
                  const items = c.storyIds.map(getStory).filter((s): s is Story => !!s);
                  return (
                    <div key={c.id} className={cx("panel p-4", open === c.id && "md:col-span-2")}>
                      <div className="flex items-center gap-3">
                        <span className="grid size-12 place-items-center rounded-lg border-2 border-line bg-paper2 text-2xl">{c.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="h-display truncate text-lg">{c.name}</div>
                          <div className="font-mono text-[0.68rem] text-muted">{items.length} stories</div>
                        </div>
                        <Stack stories={items} />
                        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>{open === c.id ? "Close" : "Open"}</button>
                      </div>
                      {open === c.id && (
                        <div className="anim-fade-up mt-4">
                          {items.length === 0 ? <p className="text-sm text-muted">Empty. Use “Collections” on a story page to add titles.</p> : (
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                              {items.map((s) => (
                                <div key={s.id} className="relative">
                                  <StoryCard story={s} />
                                  <button className="btn btn-ghost btn-sm absolute left-2 top-2 !px-2 !py-1 text-[0.65rem]" onClick={() => act.toggleInCollection(c.id, s.id)} aria-label={`Remove ${s.title} from ${c.name}`}><Icon name="x" size={11} /></button>
                                </div>
                              ))}
                            </div>
                          )}
                          <button className="btn btn-ghost btn-sm mt-4 !text-accent" onClick={() => act.deleteCollection(c.id)}><Icon name="trash" size={13} /> Delete collection</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "bookmarks" && (
          me.bookmarks.length === 0 ? <Empty icon="bookmark" title="No bookmarks yet" text="Tap the bookmark icon in any reader — on a manga page or beside a novel paragraph — to pin that exact spot." /> : (
            <ul className="grid gap-3 md:grid-cols-2">
              {me.bookmarks.map((b) => {
                const s = getStory(b.storyId);
                if (!s) return null;
                return (
                  <li key={b.id} className="panel-flat flex items-center gap-3 p-3">
                    <Cover story={s} compact className="w-14 shrink-0 rounded border-2 border-line" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold">{s.title}</div>
                      <div className="truncate text-xs italic text-ink2">{b.label}</div>
                      <div className="mt-1 font-mono text-[0.65rem] text-muted">Ch. {b.chapter} · {Math.round(b.pct * 100)}% · {fmtAgo(b.at, now)}</div>
                    </div>
                    <Link href={`/read/${s.id}/${b.chapter}`} className="btn btn-sm">Jump</Link>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => act.removeBookmark(b.id)} aria-label="Remove bookmark"><Icon name="trash" size={13} /></button>
                  </li>
                );
              })}
            </ul>
          )
        )}

        {tab === "history" && (
          history.length === 0 ? <Empty icon="clock" title="Nothing here yet" text="Everything you read shows up here, newest first." /> : (
            <ol className="panel-flat divide-y-2 divide-line/15">
              {history.map((h, i) => {
                const s = getStory(h.storyId);
                if (!s) return null;
                const p = me.progress[s.id];
                return (
                  <li key={i} className="flex items-center gap-3 p-3">
                    <Cover story={s} compact className="w-10 shrink-0 rounded border-2 border-line" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold">{s.title}</div>
                      <div className="font-mono text-[0.68rem] text-muted">Chapter {h.chapter} · {fmtAgo(h.at, now)}</div>
                      {p && <ProgressBar value={Math.min(1, p.chapter / s.chapters)} className="mt-1.5 max-w-xs" />}
                    </div>
                    <Link href={`/read/${s.id}/${h.chapter}`} className="btn btn-sm btn-ghost">Re-read</Link>
                  </li>
                );
              })}
            </ol>
          )
        )}

        {tab === "all" && (
          saved.length === 0 ? <Empty icon="library" title="Your library is empty" text="Hit “Add to library” on any story." action={<Link href="/discover" className="btn">Discover stories</Link>} /> : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">
              {saved.map((s) => <StoryCard key={s.id} story={s} showUpdated progress={me.progress[s.id] ? Math.min(1, me.progress[s.id].chapter / s.chapters) : undefined} />)}
            </div>
          )
        )}
      </div>
      <div className="mt-10 font-mono text-[0.68rem] text-muted">{catalog.length} titles on the platform · your data is stored in this browser only.</div>
    </div>
  );
}
