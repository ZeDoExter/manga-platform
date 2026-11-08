"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DETAILS } from "@/data/details";
import { CREATOR_MAP, STORIES } from "@/data/stories";
import { ACCOUNT_MAP } from "@/data/accounts";
import { TYPE_LABEL, isVisual, type Story } from "@/lib/types";
import { chapterTitle, ratingDist, relatedStories, seedReviews } from "@/lib/content";
import { chapterPrice } from "@/lib/economy";
import { useEconomy } from "@/lib/economy-store";
import { cx, fmtAgo, fmtAgoHours, fmtNum } from "@/lib/util";
import { useApp } from "@/lib/store";
import { Cover } from "./Cover";
import { CharacterWeb } from "./CharacterWeb";
import { Rail, StoryCard } from "./StoryCard";
import { Avatar, Empty, Icon, Modal, SectionHead, Stars, Stat, Tabs, TypeBadge } from "./ui";

type Tab = "chapters" | "codex" | "reviews" | "creator";
const COL_EMOJIS = ["⭐", "🌙", "🔥", "⚔️", "💔", "🌸", "🧠", "📚"];

export function StoryView({ id }: { id: string }) {
  const { getStory, state } = useApp();
  const story = getStory(id);
  if (!story) {
    if (!state.hydrated) return <div className="wrap py-20"><div className="skeleton h-96" /></div>;
    return (
      <div className="wrap py-20">
        <Empty icon="search" title="Story not found" text="This story doesn’t exist or hasn’t been published yet." action={<Link href="/discover" className="btn">Back to Discover</Link>} />
      </div>
    );
  }
  return <StoryInner story={story} />;
}

function StoryInner({ story }: { story: Story }) {
  const { me, act, state, toast } = useApp();
  const [tab, setTab] = useState<Tab>("chapters");
  const [colMenu, setColMenu] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColEmoji, setNewColEmoji] = useState("✨");
  const creator = CREATOR_MAP[story.creator] ?? ACCOUNT_MAP[story.creator];
  const prog = me.progress[story.id];
  const saved = me.library.includes(story.id);
  const following = me.following.includes(story.creator);
  const detail = DETAILS[story.id];
  const studio = state.studio.find((s) => s.id === story.id && !s.mirror);
  const [p0, p1, p2] = story.palette;
  void following;
  void p2;

  const firstCh = studio ? studio.chapters.filter((c) => c.status === "published").sort((a, b) => a.number - b.number)[0]?.number ?? 1 : 1;
  const readHref = `/read/${story.id}/${prog?.chapter ?? firstCh}`;

  return (
    <div>
      {/* banner */}
      <section className="relative isolate overflow-hidden border-b-2 border-line text-white" style={{ background: p0 }}>
        {story.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.cover} alt="" decoding="async" onError={(e) => { e.currentTarget.style.display = "none"; }} className="absolute inset-0 -z-10 h-full w-full scale-125 transform-gpu object-cover opacity-35 blur-2xl" />
        )}
        <div className="absolute inset-0 -z-10" style={{ background: `linear-gradient(115deg, ${p0} 15%, ${p0}d0 55%, ${p1}55 100%)` }} />
        <div className="tone-lg absolute inset-0 -z-10 opacity-40" style={{ ["--tone" as string]: "rgba(255,255,255,.12)" }} />
        <div className="wrap grid gap-8 py-10 md:grid-cols-[auto_1fr] md:py-14">
          <div className="mx-auto w-52 md:w-72">
            <div className="rounded-md border-2 border-white shadow-[10px_12px_0_rgba(0,0,0,.45)]">
              <Cover story={story} className="rounded-[4px]" priority />
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={story.type} />
              <span className="chip !border-white/60 !bg-white/10 !text-white">{story.status}</span>
              <span className="chip !border-white/60 !bg-white/10 !text-white">{story.age}</span>
              {story.rank && <span className="chip !border-hl !bg-hl !text-[#15120f]">Top 10 · #{story.rank}</span>}
              {story.user && <span className="chip !border-mint !bg-mint !text-[#15120f]">Published in Studio</span>}
            </div>
            <h1 className="h-display mt-4 text-[clamp(2.2rem,6vw,5rem)] uppercase [text-shadow:4px_4px_0_rgba(0,0,0,.35)]">{story.title}</h1>
            <p className="mt-1 font-display text-base tracking-[0.2em] text-white/60">{story.alt}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="flex items-center gap-2"><Stars value={story.rating} size={16} /><b className="text-lg">{story.rating.toFixed(1)}</b><span className="text-white/60">{fmtNum(story.votes)} ratings</span></span>
              {creator && <Link href={`/u/${creator.id}`} className="flex items-center gap-2 font-bold hover:underline"><Avatar account={creator} size={26} /> {creator.name}</Link>}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {story.genres.map((g) => <Link key={g} href={`/discover?genre=${encodeURIComponent(g)}`} className="chip !border-white/70 !bg-white/10 !text-white hover:!bg-white hover:!text-[#15120f]">{g}</Link>)}
              {story.tags.map((g) => <Link key={g} href={`/discover?q=${encodeURIComponent(g)}`} className="chip !border-white/30 !bg-transparent !text-white/80">#{g}</Link>)}
            </div>
            <p className="mt-5 max-w-2xl text-[1.02rem] leading-relaxed text-white/90">{story.synopsis}</p>
            <p className="mt-3 font-serif text-lg italic text-white/75">“{story.tagline}”</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={readHref} className="btn btn-accent !px-5 !py-3"><Icon name="play" size={15} fill /> {prog ? `Continue Ch. ${prog.chapter}` : "Start reading"}</Link>
              {prog && <Link href={`/read/${story.id}/${firstCh}`} className="btn !border-white !bg-white !text-[#15120f]">From Chapter {firstCh}</Link>}
              <button className="btn btn-ghost !border-white/80 !bg-transparent !text-white !shadow-none" onClick={() => act.toggleLibrary(story.id)} aria-pressed={saved}><Icon name={saved ? "check" : "plus"} size={15} /> {saved ? "In library" : "Add to library"}</button>
              <button className="btn btn-ghost !border-white/80 !bg-transparent !text-white !shadow-none" onClick={() => setColMenu(true)} aria-expanded={colMenu}><Icon name="grid" size={15} /> Collections</button>
              <button className="btn btn-ghost btn-icon !border-white/80 !bg-transparent !text-white !shadow-none" aria-label="Copy link" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast("Link copied to clipboard"); }}><Icon name="share" size={15} /></button>
            </div>
          </div>
        </div>
      </section>

      {/* Centered Collections Modal Popup */}
      <Modal open={colMenu} onClose={() => setColMenu(false)} title="Save to Collection">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border-2 border-line/20 bg-paper2 p-2.5">
            <Cover story={story} compact className="w-11 shrink-0 rounded border-2 border-line" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold">{story.title}</div>
              <div className="truncate font-mono text-[0.68rem] text-muted">Choose one or more shelves below</div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="label">Your collections</div>
            {me.collections.map((c) => {
              const on = c.storyIds.includes(story.id);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    act.toggleInCollection(c.id, story.id);
                    toast(on ? `Removed from ${c.name}` : `Added to ${c.name} ✓`, on ? "info" : "ok");
                  }}
                  aria-pressed={on}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left text-sm font-bold transition-all",
                    on
                      ? "border-line bg-ink text-paper shadow-[2px_2px_0_var(--accent)]"
                      : "border-line/30 bg-card text-ink hover:border-line hover:bg-paper2",
                  )}
                >
                  <span className="text-lg leading-none">{c.emoji}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className={cx("font-mono text-[0.68rem]", on ? "text-paper/75" : "text-muted")}>
                    {c.storyIds.length} {c.storyIds.length === 1 ? "story" : "stories"}
                  </span>
                  {on && <Icon name="check" size={16} className="text-accent" />}
                </button>
              );
            })}
          </div>

          <form
            className="space-y-2.5 border-t-2 border-dashed border-line/25 pt-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newColName.trim()) return;
              act.addCollection(newColName.trim(), newColEmoji, story.id);
              setNewColName("");
            }}
          >
            <div className="label">Create new collection</div>
            <div className="flex flex-wrap gap-1.5">
              {COL_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setNewColEmoji(em)}
                  aria-pressed={newColEmoji === em}
                  className={cx(
                    "grid size-8 place-items-center rounded-md border-2 text-base transition-colors",
                    newColEmoji === em ? "border-line bg-hl text-[#15120f]" : "border-transparent bg-paper2 hover:border-line/40",
                  )}
                >
                  {em}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="field flex-1"
                placeholder="Collection name (e.g. Weekend Binge)…"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                maxLength={32}
                aria-label="New collection name"
              />
              <button type="submit" className="btn btn-accent shrink-0" disabled={!newColName.trim()}>
                <Icon name="plus" size={14} /> Create
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <div className="wrap py-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Followers" value={fmtNum(story.followers + (saved ? 1 : 0))} sub={saved ? "including you" : "readers following"} />
          <Stat label="Weekly readers" value={story.weekly >= 10 ? fmtNum(story.weekly * 1000) : fmtNum(story.weekly * 1000)} sub="last 7 days" />
          <Stat label="Chapters" value={story.chapters} sub={`Latest: ${story.latest}`} />
          <Stat label="Updated" value={fmtAgoHours(story.updatedHours)} sub={`${story.year} · ${isVisual(story.type) ? "illustrated" : "prose"}`} />
        </div>

        <Tabs
          className="mt-8"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "chapters", label: "Chapters", icon: "list", count: story.chapters },
            { id: "codex", label: "Codex & Timeline", icon: "sparkles" },
            { id: "reviews", label: "Reviews", icon: "star" },
            { id: "creator", label: "Creator", icon: "user" },
          ]}
        />
        <div className="mt-5">
          {tab === "chapters" && <Chapters story={story} />}
          {tab === "codex" && (detail ? <CharacterWeb detail={detail} maxCh={story.chapters} initial={prog?.chapter ?? 1} /> : <Empty icon="lock" title="Codex coming soon" text={`${creator?.name ?? "The creator"} hasn’t published a character codex for this story yet. Top 10 titles include interactive, spoiler-safe codexes.`} action={<Link href="/story/hollow-moon-courier" className="btn btn-ghost">See an example</Link>} />)}
          {tab === "reviews" && <Reviews story={story} />}
          {tab === "creator" && creator && <CreatorCard story={story} />}
        </div>

        <section className="mt-20">
          <SectionHead kicker="// if you like this" title="Similar stories" jp="似た作品" />
          <Rail>
            {relatedStories(story, 8).map((s) => <div key={s.id} className="w-[150px] sm:w-[178px]"><StoryCard story={s} /></div>)}
          </Rail>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------ chapters ------------------------------ */
function Chapters({ story }: { story: Story }) {
  const { me, act, state, account, now } = useApp();
  const { hasEntitlement } = useEconomy();
  const [desc, setDesc] = useState(true);
  const [page, setPage] = useState(0);
  const prog = me.progress[story.id];
  const studio = state.studio.find((s) => s.id === story.id && !s.mirror);
  const owned = story.creator === account.id;
  const rows = useMemo(() => {
    if (studio) {
      const published = studio.chapters.filter((c) => c.status === "published");
      return published.map((c) => ({
        n: c.number,
        title: c.title,
        hours: Math.max(0, (now - c.updatedAt) / 3600000),
        price: chapterPrice(studio.type, c.number, Math.max(published.length, c.number), c.priceCoins),
      }));
    }
    const step = story.type === "web-novel" ? 24 : 168;
    return Array.from({ length: story.chapters }, (_, i) => ({
      n: i + 1,
      title: chapterTitle(story, i + 1),
      hours: story.updatedHours + (story.chapters - 1 - i) * step,
      price: chapterPrice(story.type, i + 1, story.chapters),
    }));
  }, [story, studio, now]);
  const sorted = useMemo(() => (desc ? [...rows].sort((a, b) => b.n - a.n) : [...rows].sort((a, b) => a.n - b.n)), [rows, desc]);
  const size = 30;
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const cur = sorted.slice(page * size, page * size + size);
  if (!rows.length) return <Empty icon="book" title="No published chapters yet" text="The creator hasn’t published a chapter. Check back soon." />;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => { setDesc((d) => !d); setPage(0); }}><Icon name={desc ? "down" : "up"} size={13} /> {desc ? "Newest first" : "Oldest first"}</button>
          {prog && <Link href={`/read/${story.id}/${prog.chapter}`} className="btn btn-sm"><Icon name="play" size={12} fill /> Resume Ch. {prog.chapter}</Link>}
        </div>
        {pages > 1 && (
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: pages }, (_, i) => {
              const a = sorted[i * size]?.n;
              const b = sorted[Math.min(sorted.length - 1, i * size + size - 1)]?.n;
              return <button key={i} className={cx("chip", page === i && "chip-on")} onClick={() => setPage(i)}>{Math.min(a, b)}–{Math.max(a, b)}</button>;
            })}
          </div>
        )}
      </div>
      <ul className="panel-flat divide-y-2 divide-line/15 overflow-hidden">
        {cur.map((c) => {
          const read = prog ? c.n < prog.chapter : false;
          const current = prog?.chapter === c.n;
          const bm = me.bookmarks.find((b) => b.storyId === story.id && b.chapter === c.n && b.label.startsWith("Saved chapter"));
          const free = owned || c.price === 0;
          const unlocked = !free && hasEntitlement(story.id, c.n);
          return (
            <li key={c.n} className={cx("group relative flex items-center gap-3 px-3 py-3 transition-colors hover:bg-paper2", current && "bg-hl/20")}>
              <Link href={`/read/${story.id}/${c.n}`} className="absolute inset-0" aria-label={`Read chapter ${c.n}: ${c.title}`} />
              <span className={cx("grid size-11 shrink-0 place-items-center rounded-md border-2 border-line font-display text-sm", read ? "bg-paper2 text-muted" : "bg-ink text-paper")}>{c.n}</span>
              <div className="min-w-0 flex-1">
                <div className={cx("truncate text-[0.95rem] font-extrabold", read && "text-muted")}>{c.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[0.68rem] text-muted">
                  <span>{fmtAgoHours(c.hours)}</span>
                  <span className={cx("chip !px-1.5 !py-0", free ? "!border-line !bg-mint !text-[#15120f]" : unlocked ? "!border-line !bg-hl !text-[#15120f]" : "")}>
                    {free ? "Free" : unlocked ? <><Icon name="check" size={10} /> Unlocked</> : <><Icon name="lock" size={10} /> {c.price}</>}
                  </span>
                  {c.n === story.chapters && story.updatedHours < 48 && <span className="chip !border-accent !bg-accent !px-1.5 !py-0 !text-white">new</span>}
                  {current && <span className="chip !px-1.5 !py-0">{Math.round((prog?.pct ?? 0) * 100)}% read</span>}
                </div>
              </div>
              {read && <Icon name="check" size={16} className="text-mint" />}
              <button className={cx("relative z-10 grid size-9 place-items-center rounded-md border-2 transition-colors", bm ? "border-line bg-accent text-white" : "border-transparent text-muted hover:border-line hover:bg-card")} aria-label={bm ? `Remove saved chapter ${c.n}` : `Save chapter ${c.n}`} aria-pressed={!!bm} onClick={() => (bm ? act.removeBookmark(bm.id) : act.addBookmark(story.id, c.n, 0, `Saved chapter ${c.n} — ${c.title}`))}>
                <Icon name="bookmark" size={15} fill={!!bm} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------ reviews ------------------------------ */
function Reviews({ story }: { story: Story }) {
  const { me, act, now, toast, account } = useApp();
  const creator = CREATOR_MAP[story.creator];
  const seeded = useMemo(() => seedReviews(story, creator?.name ?? "the author"), [story, creator]);
  const dist = ratingDist(story);
  const mine = me.reviews.find((r) => r.storyId === story.id);
  const [rating, setRating] = useState(me.ratings[story.id] ?? 0);
  const [text, setText] = useState(mine?.text ?? "");
  const [helpful, setHelpful] = useState<Set<string>>(new Set());
  const [remoteComments, setRemoteComments] = useState<{ id: string; user: string; userId: string; rating: number; text: string; at: number }[]>([]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/community?storyId=${encodeURIComponent(story.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.comments) setRemoteComments(d.comments);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [story.id, mine?.at]);
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-5">
        <div className="panel p-5">
          <div className="flex items-end gap-3"><span className="h-display text-6xl">{story.rating.toFixed(1)}</span><div className="pb-2"><Stars value={story.rating} size={16} /><div className="font-mono text-[0.68rem] text-muted">{fmtNum(story.votes)} ratings</div></div></div>
          <div className="mt-4 space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => (
              <div key={n} className="flex items-center gap-2 font-mono text-[0.68rem]">
                <span className="w-3">{n}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full border border-line/50 bg-paper2"><div className="h-full bg-hl" style={{ width: `${dist[n - 1] * 100}%` }} /></div>
                <span className="w-9 text-right text-muted">{Math.round(dist[n - 1] * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
        <form className="panel p-5" onSubmit={(e) => { e.preventDefault(); if (!rating) return toast("Pick a star rating first", "warn"); if (text.trim().length < 10) return toast("Write at least a sentence (10+ characters)", "warn"); act.addReview(story.id, rating, text.trim()); }}>
          <h3 className="h-display text-lg">{mine ? "Edit your review" : "Write a review"}</h3>
          <div className="mt-2"><Stars value={rating} size={26} onChange={setRating} /></div>
          <textarea className="field mt-3 min-h-28 text-sm" placeholder="What stayed with you? (No spoilers, please.)" value={text} onChange={(e) => setText(e.target.value)} maxLength={600} />
          <div className="mt-1 text-right font-mono text-[0.65rem] text-muted">{text.length}/600</div>
          <button className="btn mt-2 w-full" type="submit">{mine ? "Update review" : "Post review"}</button>
        </form>
      </div>
      <ul className="space-y-4">
        {mine && (
          <li className="panel anim-fade-up p-4">
            <div className="flex items-center gap-2"><span className="chip chip-on">Your review</span><Stars value={mine.rating} size={13} /><span className="ml-auto font-mono text-[0.68rem] text-muted">{fmtAgo(mine.at, now)}</span></div>
            <p className="mt-2 text-sm leading-relaxed">{mine.text}</p>
          </li>
        )}
        {remoteComments.filter((c) => c.userId !== account.id).map((r) => (
          <li key={r.id} className="panel-flat p-4">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full border-2 border-line bg-paper2 text-xs font-extrabold">{(r.user[0] ?? "R").toUpperCase()}</span>
              <b className="text-sm">{r.user}</b>
              <Stars value={r.rating} size={13} />
              <span className="ml-auto font-mono text-[0.68rem] text-muted">{fmtAgo(r.at, now)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink2">{r.text}</p>
          </li>
        ))}
        {seeded.map((r) => (
          <li key={r.id} className="panel-flat p-4">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full border-2 border-line bg-paper2 text-xs font-extrabold">{r.user[0]}</span>
              <b className="text-sm">{r.user}</b>
              <Stars value={r.rating} size={13} />
              <span className="ml-auto font-mono text-[0.68rem] text-muted">{fmtAgoHours(r.hours)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink2">{r.text}</p>
            <button className={cx("chip mt-3", helpful.has(r.id) && "chip-on")} aria-pressed={helpful.has(r.id)} onClick={() => setHelpful((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })}>
              <Icon name="heart" size={11} fill={helpful.has(r.id)} /> Helpful · {r.helpful + (helpful.has(r.id) ? 1 : 0)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------ creator ------------------------------ */
function CreatorCard({ story }: { story: Story }) {
  const { me, act } = useApp();
  const c = CREATOR_MAP[story.creator] ?? ACCOUNT_MAP[story.creator];
  const works = STORIES.filter((s) => s.creator === c.id);
  const f = me.following.includes(c.id);
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="panel p-5">
        <div className="flex items-center gap-4">
          <Avatar account={c} size={72} />
          <div>
            <h3 className="h-display text-xl">{c.name}</h3>
            {c.native && <div className="font-display text-sm text-muted">{c.native}</div>}
            <div className="font-mono text-[0.68rem] text-muted">{c.location} · since {c.joined}</div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink2">{c.bio}</p>
        <div className="mt-4 flex gap-2">
          <button className={cx("btn flex-1", f && "btn-ghost")} onClick={() => act.toggleFollow(c.id)} aria-pressed={f}><Icon name={f ? "check" : "plus"} size={14} /> {f ? "Following" : "Follow"}</button>
          <Link href={`/u/${c.id}`} className="btn btn-ghost">Profile</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <Stat label="Followers" value={fmtNum(c.followers + (f ? 1 : 0))} />
          <Stat label="Works" value={works.length} />
        </div>
      </div>
      <div>
        <h3 className="h-display mb-3 text-lg">More by {c.name}</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {works.map((w) => <StoryCard key={w.id} story={w} />)}
        </div>
      </div>
    </div>
  );
}

export { TYPE_LABEL };
