"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Account } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/types";
import { cx, fmtAgo, fmtAgoHours, fmtNum } from "@/lib/util";
import { useApp } from "@/lib/store";
import { liveRating, useStoryRatings } from "@/lib/ratings";
import { Avatar, Empty, Icon, Stars, Stat, Tabs, TypeBadge } from "../ui";
import { Cover } from "../Cover";

type Tab = "portfolio" | "releases" | "news" | "community" | "stats";

export function CreatorProfile({ account, isMe }: { account: Account; isMe: boolean }) {
  const { state, act, me, now, toast, catalog } = useApp();
  const [tab, setTab] = useState<Tab>("portfolio");
  const [text, setText] = useState("");
  const following = me.following.includes(account.id);
  const works = useMemo(() => catalog.filter((s) => s.creator === account.id), [catalog, account.id]);
  const ratings = useStoryRatings(works.map((w) => w.id));
  const owned = isMe ? state.studio.filter((s) => s.ownerId === account.id) : [];
  const ownedIds = new Set(owned.map((o) => o.id));
  const draftOnly = owned.filter((o) => !works.some((w) => w.id === o.id));
  const anns = state.announcements.filter((a) => a.authorId === account.id).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.at - a.at);
  const totalRatings = works.reduce((a, w) => a + liveRating(ratings, w).count, 0);
  const ratedAvgs = works.map((w) => liveRating(ratings, w)).filter((r) => r.count > 0);
  const avg = ratedAvgs.length ? ratedAvgs.reduce((a, r) => a + r.avg, 0) / ratedAvgs.length : 0;
  const upcoming = owned.flatMap((s) => s.chapters.filter((c) => c.status === "scheduled").map((c) => ({ s, c }))).sort((a, b) => (a.c.scheduledFor ?? "").localeCompare(b.c.scheduledFor ?? ""));
  const pending = owned.flatMap((s) => s.chapters.filter((c) => c.status !== "published").map((c) => ({ s, c })));
  const [c1, c2] = account.colors;

  return (
    <div>
      {/* banner: publisher masthead */}
      <section className="relative isolate overflow-hidden border-b-2 border-line text-white" style={{ background: c1 }}>
        <div className="absolute inset-0 -z-10" style={{ background: `linear-gradient(120deg, ${c1} 30%, ${c2}55 140%)` }} />
        <div className="tone-lg absolute inset-0 -z-10 opacity-50" style={{ ["--tone" as string]: "rgba(255,255,255,.12)" }} />
        <div className="pointer-events-none absolute -right-6 top-0 max-w-full select-none overflow-hidden font-display text-[10rem] leading-none opacity-[0.07] md:text-[22rem]" aria-hidden="true">{account.glyph}</div>
        <div className="wrap relative grid grid-cols-1 items-end gap-6 py-10 md:grid-cols-[auto_minmax(0,1fr)_auto] md:py-14">
          <Avatar account={account} size={120} ring />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip !border-white/60 !bg-white/10 !text-white">Uploader · {account.location}</span>
              {account.verified && <span className="chip !border-hl !bg-hl !text-[#15120f]">✓ Verified creator</span>}
              {isMe && <span className="chip !border-accent !bg-accent !text-white">This is you</span>}
            </div>
            <h1 className="h-display mt-3 text-4xl md:text-6xl">{account.name}</h1>
            {account.native && <div className="mt-1 font-display text-lg tracking-[0.3em] text-white/60">{account.native}</div>}
            <p className="mt-3 max-w-2xl font-serif text-xl italic text-white/90">“{account.tagline}”</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {isMe ? (
              <>
                <Link href="/studio" className="btn btn-accent"><Icon name="pen" size={14} /> Open Studio</Link>
                <Link href="/studio/new" className="btn !border-white !bg-white !text-[#15120f]"><Icon name="plus" size={14} /> New story</Link>
                <button className="btn btn-ghost !border-white/70 !bg-transparent !text-white !shadow-none" onClick={() => setTab("news")}><Icon name="bell" size={14} /> Post update</button>
              </>
            ) : (
              <>
                <button className={cx("btn btn-accent", following && "!bg-white !text-[#15120f]")} onClick={() => act.toggleFollow(account.id)}><Icon name={following ? "check" : "plus"} size={14} /> {following ? "Following" : "Follow"}</button>
                <button className="btn btn-ghost !border-white/70 !bg-transparent !text-white !shadow-none" onClick={() => toast("Commissions are a placeholder in this demo", "info")}><Icon name="pen" size={14} /> Commission</button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="wrap grid grid-cols-1 gap-8 py-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* sticky studio card */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="panel p-4">
            <div className="label">Studio at a glance</div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <Stat label="Followers" value={fmtNum(account.followers + (following ? 1 : 0))} />
              <Stat label="Ratings" value={fmtNum(totalRatings)} />
              <Stat label="Avg rating" value={avg ? avg.toFixed(2) : "—"} />
              <Stat label="Works" value={works.length + draftOnly.length} />
            </div>
          </div>
          <div className="panel p-4">
            <div className="label">{isMe ? "Next scheduled release" : "Release rhythm"}</div>
            {isMe ? (
              upcoming[0] ? (
                <div className="mt-2"><div className="font-extrabold">{upcoming[0].s.title}</div><div className="text-sm text-ink2">Ch. {upcoming[0].c.number} — {upcoming[0].c.title}</div><div className="mt-1 font-mono text-xs font-bold text-accent">{upcoming[0].c.scheduledFor?.replace("T", " · ")}</div><Link href={`/studio/${upcoming[0].s.id}/edit/${upcoming[0].c.id}`} className="btn btn-sm mt-3">Open chapter</Link></div>
              ) : <p className="mt-2 text-sm text-muted">Nothing scheduled. Drafts are waiting in your Studio.</p>
            ) : <p className="mt-2 text-sm text-ink2">New chapters land weekly. Follow to get notified the moment {account.name.split(" ")[0]} publishes.</p>}
          </div>
          <div className="panel p-4">
            <div className="label">About</div>
            <p className="mt-2 text-sm leading-relaxed text-ink2">{account.bio}</p>
            <div className="mt-3 font-mono text-[0.68rem] text-muted">Joined {account.joined} · {account.location}</div>
          </div>
        </aside>

        <div className="min-w-0">
          <Tabs value={tab} onChange={setTab} tabs={[
            { id: "portfolio", label: "Portfolio", icon: "book", count: works.length + draftOnly.length },
            { id: "releases", label: isMe ? "Drafts & schedule" : "Releases", icon: "calendar", count: isMe ? pending.length : undefined },
            { id: "news", label: "Announcements", icon: "bell", count: anns.length },
            { id: "community", label: "Community", icon: "heart" },
            { id: "stats", label: "Story analytics", icon: "chart" },
          ]} />
          <div className="mt-6">
            {tab === "portfolio" && (
              <div className="space-y-5">
                {[...works, ...[]].map((w) => (
                  <div key={w.id} className="panel panel-hover flex gap-4 p-3 sm:p-4">
                    <Link href={`/story/${w.id}`} className="block w-28 shrink-0 sm:w-36"><Cover story={w} compact className="rounded border-2 border-line" /></Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><TypeBadge type={w.type} /><span className="chip">{w.status}</span>{w.rank && <span className="chip chip-on">Top 10 · #{w.rank}</span>}</div>
                      <Link href={`/story/${w.id}`} className="h-display mt-1.5 block text-xl hover:underline sm:text-2xl">{w.title}</Link>
                      <p className="mt-1 line-clamp-2 text-sm text-ink2">{w.tagline}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs"><span className="flex items-center gap-1"><Stars value={liveRating(ratings, w).avg} size={12} /> {liveRating(ratings, w).avg ? liveRating(ratings, w).avg.toFixed(1) : "—"}</span><span>{w.chapters} chapters</span><span>{fmtNum(liveRating(ratings, w).count)} ratings</span><span>updated {fmtAgoHours(w.updatedHours)}</span></div>
                      <div className="mt-3 flex flex-wrap gap-2"><Link href={`/story/${w.id}`} className="btn btn-sm btn-ghost">View</Link>{ownedIds.has(w.id) && <Link href={`/studio/${w.id}`} className="btn btn-sm"><Icon name="pen" size={12} /> Manage in Studio</Link>}</div>
                    </div>
                  </div>
                ))}
                {draftOnly.map((s) => (
                  <div key={s.id} className="panel-flat flex gap-4 border-dashed p-3 sm:p-4">
                    <Cover story={{ id: s.id, title: s.title, alt: "", type: s.type, palette: s.palette, motif: s.motif, cover: s.coverImage }} compact className="w-28 shrink-0 rounded border-2 border-line sm:w-36" />
                    <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><TypeBadge type={s.type} /><span className="chip !border-hl !bg-hl !text-[#15120f]">{s.status}</span></div><div className="h-display mt-1.5 text-xl">{s.title}</div><p className="mt-1 line-clamp-2 text-sm text-ink2">{s.synopsis}</p><div className="mt-2 font-mono text-xs text-muted">{s.chapters.length} chapters · only you can see this</div><Link href={`/studio/${s.id}`} className="btn btn-sm mt-3"><Icon name="pen" size={12} /> Continue in Studio</Link></div>
                  </div>
                ))}
                {!works.length && !draftOnly.length && <Empty icon="book" title="No published work yet" />}
              </div>
            )}

            {tab === "releases" && (
              isMe ? (
                pending.length ? (
                  <ul className="space-y-3">
                    {pending.sort((a, b) => b.c.updatedAt - a.c.updatedAt).map(({ s, c }) => (
                      <li key={c.id} className="panel-flat flex flex-wrap items-center gap-3 p-3">
                        <span className={cx("chip", c.status === "scheduled" ? "chip-on" : "")}>{c.status}</span>
                        <div className="min-w-0 flex-1"><div className="truncate text-sm font-extrabold">{s.title} · Ch. {c.number} — {c.title}</div><div className="font-mono text-[0.68rem] text-muted">{c.status === "scheduled" ? `goes live ${c.scheduledFor?.replace("T", " ")}` : `edited ${fmtAgo(c.updatedAt, now)}`}</div></div>
                        <Link href={`/studio/${s.id}/edit/${c.id}`} className="btn btn-sm">Edit</Link>
                      </li>
                    ))}
                  </ul>
                ) : <Empty icon="calendar" title="Inbox zero" text="No drafts or scheduled chapters." action={<Link href="/studio" className="btn">Go to Studio</Link>} />
              ) : (
                <ul className="space-y-3">{works.map((w) => <li key={w.id} className="panel-flat flex items-center gap-3 p-3"><Cover story={w} compact className="w-10 rounded border-2 border-line" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-extrabold">{w.title}</div><div className="truncate text-xs text-muted">Ch. {w.chapters} — {w.latest}</div></div><span className="font-mono text-xs font-bold">{fmtAgoHours(w.updatedHours)}</span></li>)}</ul>
              )
            )}

            {tab === "news" && (
              <div className="space-y-4">
                {isMe && (
                  <form className="panel p-4" onSubmit={(e) => { e.preventDefault(); if (text.trim().length < 3) return toast("Write something first", "warn"); act.postAnnouncement(text.trim()); setText(""); }}>
                    <label className="label" htmlFor="ann">Announce to {fmtNum(account.followers)} followers</label>
                    <textarea id="ann" className="field mt-2 min-h-24" placeholder="Release dates, hiatus notices, behind-the-scenes sketches…" value={text} onChange={(e) => setText(e.target.value)} maxLength={400} />
                    <div className="mt-2 flex items-center justify-between"><span className="font-mono text-[0.65rem] text-muted">{text.length}/400</span><button className="btn btn-sm" type="submit"><Icon name="bell" size={13} /> Post</button></div>
                  </form>
                )}
                {anns.length === 0 && <Empty icon="bell" title="No announcements" />}
                {anns.map((a) => (
                  <article key={a.id} className={cx("panel-flat p-4", a.pinned && "border-accent")}>
                    <div className="flex items-center gap-2 font-mono text-[0.68rem] text-muted">{a.pinned && <span className="chip chip-on !text-[0.58rem]">📌 pinned</span>}<span>{fmtAgo(a.at, now)}</span></div>
                    <p className="mt-2 text-[0.95rem] leading-relaxed">{a.text}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button className={cx("chip", a.liked && "chip-on")} aria-pressed={!!a.liked} onClick={() => act.likeAnnouncement(a.id)}><Icon name="heart" size={11} fill={!!a.liked} /> {fmtNum(a.likes)}</button>
                      {isMe && <button className="chip" onClick={() => act.deleteAnnouncement(a.id)}><Icon name="trash" size={11} /> Delete</button>}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {tab === "community" && (
              <Empty icon="heart" title="No community posts yet" text="Comments readers leave on chapters will appear here." />
            )}

            {tab === "stats" && (
              <div className="panel-flat divide-y-2 divide-line/15">
                {works.map((w) => (
                  <div key={w.id} className="flex items-center gap-4 p-3">
                    <Cover story={w} compact className="w-10 shrink-0 rounded border-2 border-line" />
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-extrabold">{w.title}</div><div className="font-mono text-[0.65rem] text-muted">{TYPE_LABEL[w.type]} · {w.chapters} ch</div></div>
                    <div className="flex items-center gap-1 font-mono text-xs font-bold"><Stars value={liveRating(ratings, w).avg} size={12} /> {liveRating(ratings, w).avg ? liveRating(ratings, w).avg.toFixed(1) : "—"}</div>
                    <div className="w-20 text-right font-mono text-[0.65rem] text-muted">updated {fmtAgoHours(w.updatedHours)}</div>
                  </div>
                ))}
                {!works.length && <Empty icon="chart" title="No published work yet" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
