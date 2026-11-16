"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Account, Story } from "@/lib/types";
import { ACCOUNT_MAP, READERS } from "@/data/accounts";
import { readerLevel } from "@/lib/content";
import { cx, fmtAgo, fmtNum } from "@/lib/util";
import { useApp } from "@/lib/store";
import { Avatar, AVATAR_STYLES, Empty, Icon, Modal, ProgressBar, Sparkline, Stars, Tabs } from "../ui";
import { Cover } from "../Cover";
import { ALL_GENRES } from "@/data/stories";

type Tab = "shelves" | "bookmarks" | "reviews" | "badges" | "social";

const ACCENTS = ["#ff4a22", "#3340ff", "#12b58b", "#ffb13b", "#ff4fa3", "#8a5cff"];

export function ReaderProfile({ account, isMe }: { account: Account; isMe: boolean }) {
  const { dataFor, act, getStory, now, state } = useApp();
  const d = dataFor(account.id);
  const [tab, setTab] = useState<Tab>("shelves");
  const [edit, setEdit] = useState(false);
  const viewerFollowing = state.data[state.accountId]?.following ?? [];

  const stories = useMemo(() => Array.from(new Set([...d.library, ...Object.keys(d.progress)])).map(getStory).filter((s): s is Story => !!s), [d.library, d.progress, getStory]);
  const chapters = Object.values(d.progress).reduce((a, p) => a + p.chapter, 0);
  const finished = stories.filter((s) => d.progress[s.id] && d.progress[s.id].chapter >= s.chapters).length;
  const accent = d.profile.accent;
  const lv = readerLevel(chapters);
  const toNext = lv.need - lv.into;
  const WEEKS = 16;
  const heat = useMemo(() => {
    const day = 86400000;
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const start = today.getTime() - (WEEKS * 7 - 1) * day;
    const counts = new Array(WEEKS * 7).fill(0);
    for (const h of d.history) {
      const i = Math.floor((h.at - start) / day);
      if (i >= 0 && i < counts.length) counts[i] += 1;
    }
    return { counts, max: Math.max(1, ...counts) };
  }, [d.history, now]);
  const weekly = useMemo(() => {
    const out: number[] = [];
    for (let w = 0; w < WEEKS; w++) out.push(heat.counts.slice(w * 7, w * 7 + 7).reduce((a, v) => a + v, 0));
    return out;
  }, [heat, WEEKS]);
  const genreCount = useMemo(() => {
    const m: Record<string, number> = {};
    stories.forEach((s) => s.genres.forEach((g) => (m[g] = (m[g] ?? 0) + 1)));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [stories]);

  const badges = [
    { icon: "book", name: "First Chapter", desc: "Read your first chapter", v: Math.min(1, chapters), g: 1 },
    { icon: "library", name: "Marathoner", desc: "Read 1,000 chapters", v: chapters, g: 1000 },
    { icon: "flame", name: "Month of Flames", desc: "30-day reading streak", v: d.streak, g: 30 },
    { icon: "compass", name: "Genre Explorer", desc: "Read across 8 genres", v: new Set(stories.flatMap((s) => s.genres)).size, g: 8 },
    { icon: "check", name: "Completionist", desc: "Finish 2 stories", v: finished, g: 2 },
    { icon: "star", name: "Critic", desc: "Write 3 reviews", v: d.reviews.length, g: 3 },
    { icon: "grid", name: "Curator", desc: "Create 3 collections", v: d.collections.length, g: 3 },
    { icon: "bookmark", name: "Bookmark Hoarder", desc: "Save 5 bookmarks", v: d.bookmarks.length, g: 5 },
    { icon: "user", name: "Social Reader", desc: "Follow 5 creators", v: d.following.length, g: 5 },
  ];
  const unlocked = badges.filter((b) => b.v >= b.g).length;
  const followersList = READERS.filter((r) => r.id !== account.id).slice(0, 7);

  return (
    <div style={{ ["--pa" as string]: accent }}>
      {/* identity strip: name, level dial, bio, xp bar */}
      <section className="relative isolate overflow-hidden border-b-2 border-line bg-[#0b0a14] text-white">
        <div className="absolute inset-0 -z-10 opacity-60" style={{ background: `radial-gradient(ellipse at 15% 20%, ${accent}66, transparent 55%), radial-gradient(ellipse at 90% 80%, ${account.colors[1]}33, transparent 50%)` }} />
        <div className="tone-lg absolute inset-0 -z-10 opacity-40" style={{ ["--tone" as string]: "rgba(255,255,255,.1)" }} />
        <div className="wrap grid grid-cols-1 items-center gap-8 py-10 md:grid-cols-[auto_minmax(0,1fr)_auto] md:py-14">
          <div className="relative mx-auto">
            <Avatar account={account} style={isMe ? d.profile.avatar : undefined} size={132} ring />
            <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
              <span className="flex items-center gap-1 whitespace-nowrap rounded-full border-2 border-white bg-black px-3 py-1 font-mono text-[0.65rem] font-bold"><Icon name="flame" size={13} className="text-accent" /> {d.streak}</span>
              <span className="grid size-9 place-items-center rounded-full border-2 border-line bg-hl font-display text-base text-[#15120f]" title={`Level ${lv.level} · ${lv.title}`}>{lv.level}</span>
            </div>
          </div>
          <div className="text-center md:text-left">
            <div className="label !text-white/60">Reader · @{account.id} · {account.location} · since {account.joined}</div>
            <h1 className="h-display mt-1 text-4xl md:text-6xl">{d.profile.name}</h1>
            <p className="mx-auto mt-3 max-w-2xl text-white/80 md:mx-0">{d.profile.bio || account.bio}</p>
            <div className="mx-auto mt-4 max-w-xl md:mx-0">
              <div className="flex items-baseline justify-between font-mono text-[0.68rem] font-bold">
                <span className="uppercase tracking-wider text-hl">Level {lv.level} · {lv.title}</span>
                <span className="text-white/70">{fmtNum(toNext)} pages to {lv.level + 1}</span>
              </div>
              <ProgressBar value={lv.pct} className="mt-1.5 !border-white/40 !bg-white/10" color="var(--hl)" />
            </div>
            {d.profile.genres.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-1.5 md:justify-start">
                {d.profile.genres.map((g) => <Link key={g} href={`/discover?genre=${encodeURIComponent(g)}`} className="chip !border-white/50 !bg-white/10 !text-white hover:!bg-hl hover:!text-[#15120f]">{g}</Link>)}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            {isMe ? (
              <button className="btn btn-accent" onClick={() => setEdit(true)}><Icon name="edit" size={14} /> Customize profile</button>
            ) : (
              <button className={cx("btn", viewerFollowing.includes(account.id) && "btn-ghost")} onClick={() => act.toggleFollow(account.id)}><Icon name={viewerFollowing.includes(account.id) ? "check" : "plus"} size={14} /> {viewerFollowing.includes(account.id) ? "Following" : "Follow reader"}</button>
            )}
            <div className="flex gap-4 font-mono text-xs text-white/70">
              <button onClick={() => setTab("social")}><b className="text-white">{fmtNum(account.followers)}</b> followers</button>
              <button onClick={() => setTab("social")}><b className="text-white">{d.following.length + account.following}</b> following</button>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap py-8">
        <div className="panel p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Icon name="flame" size={18} className="text-accent" />
              <h2 className="h-display text-xl">{d.streak}-day streak</h2>
            </div>
          </div>
          <div className="mt-4 grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
            <div className="min-w-0">
              <div className="scroll-x pb-1">
                <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]" role="img" aria-label={`${d.streak} day reading streak, last ${WEEKS} weeks`}>
                  {heat.counts.map((v, i) => (
                    <span key={i} title={v ? `${v} session${v > 1 ? "s" : ""}` : "no reading"} className="size-3.5 rounded-[3px] border border-line/20" style={{ background: v ? accent : "var(--paper2)", opacity: v ? 0.3 + (v / heat.max) * 0.7 : 1 }} />
                  ))}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[0.65rem] text-muted">
                <span>last {WEEKS} weeks</span>
                <span>Less <span className="mx-1 inline-flex gap-[3px] align-middle">{[0.3, 0.55, 0.8, 1].map((o) => <span key={o} className="inline-block size-3 rounded-[3px] border border-line/20" style={{ background: accent, opacity: o }} />)}</span> More</span>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-3 lg:border-l-2 lg:border-line/10 lg:pl-6">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="label">Chapters read</div>
                  <Icon name="book" size={16} className="text-muted" />
                </div>
                <div className="h-display mt-1 text-center text-3xl sm:text-left">{fmtNum(chapters)}</div>
                <div className="mt-2"><Sparkline data={weekly} width={160} height={30} color={accent} /></div>
              </div>
              <button onClick={() => setTab("badges")} className="group text-left">
                <div className="flex items-center justify-between gap-2">
                  <div className="label">Achievements</div>
                  <Icon name="zap" size={16} className="text-muted" />
                </div>
                <div className="mt-1 flex items-center justify-center gap-2.5 sm:justify-start">
                  <span className="h-display text-3xl">{unlocked}</span>
                  <svg width="40" height="40" viewBox="0 0 44 44" role="img" aria-label={`${unlocked} of ${badges.length} achievements`}>
                    <circle cx="22" cy="22" r="18" fill="none" stroke="var(--paper2)" strokeWidth="6" />
                    <circle cx="22" cy="22" r="18" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(unlocked / badges.length) * 113} 113`} transform="rotate(-90 22 22)" />
                  </svg>
                </div>
                <div className="mt-1 font-mono text-[0.65rem] text-muted group-hover:text-accent">view all →</div>
              </button>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="label">Genre DNA</div>
                  <Icon name="compass" size={16} className="text-muted" />
                </div>
                <ul className="mt-2 space-y-1.5">
                  {genreCount.slice(0, 4).map(([g, n]) => (
                    <li key={g} className="flex items-center gap-2 text-xs font-bold"><span className="w-16 truncate">{g}</span><div className="h-2.5 flex-1 overflow-hidden rounded-full border border-line/40 bg-paper2"><div className="h-full rounded-full" style={{ width: `${(n / (genreCount[0]?.[1] ?? 1)) * 100}%`, background: accent }} /></div><span className="w-4 text-right font-mono text-[0.65rem]">{n}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <Tabs className="mt-8" value={tab} onChange={setTab} tabs={[
          { id: "shelves", label: "Shelves", icon: "library" },
          { id: "bookmarks", label: "Bookmarks", icon: "bookmark", count: d.bookmarks.length },
          { id: "reviews", label: "Reviews", icon: "star", count: d.reviews.length },
          { id: "badges", label: "Achievements", icon: "zap", count: unlocked },
          { id: "social", label: "Following", icon: "user" },
        ]} />

        <div className="mt-6">

          {tab === "shelves" && (
            <div className="space-y-10">
              <div>
                <h3 className="h-display mb-4 text-xl">Currently reading</h3>
                {stories.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {stories.filter((s) => d.progress[s.id]).slice(0, 8).map((s) => {
                      const p = d.progress[s.id];
                      return (
                        <Link key={s.id} href={`/read/${s.id}/${p.chapter}`} className="panel-flat panel-hover flex items-center gap-3 p-2.5">
                          <Cover story={s} compact className="w-14 shrink-0 rounded border-2 border-line" />
                          <div className="min-w-0 flex-1"><div className="truncate text-sm font-extrabold">{s.title}</div><div className="font-mono text-[0.68rem] text-muted">Ch. {p.chapter} of {s.chapters} · {fmtAgo(p.at, now)}</div><ProgressBar value={s.chapters > 0 ? Math.min(1, p.chapter / s.chapters) : 0} className="mt-2" color={accent} /></div>
                        </Link>
                      );
                    })}
                  </div>
                ) : <Empty icon="book" title="Nothing in progress" />}
              </div>
              <div>
                <h3 className="h-display mb-4 text-xl">Collections</h3>
                {d.collections.length ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {d.collections.map((c) => {
                      const covers = c.storyIds.map((id) => getStory(id)).filter((s): s is Story => !!s).slice(0, 3);
                      const T = ["translate(-95%,-50%) rotate(-10deg) scale(.85)", "translate(-50%,-50%) rotate(0deg) scale(1)", "translate(-5%,-50%) rotate(10deg) scale(.85)"];
                      return (
                        <div key={c.id} className="panel group p-4">
                          <div className="relative mx-auto aspect-[3/2] max-w-[260px]">
                            {covers.map((s, i) => (
                              <Link key={s.id} href={`/story/${s.id}`} aria-label={s.title} className="absolute left-1/2 top-1/2 block w-[36%] transition-transform duration-300 group-hover:scale-[1.02]" style={{ transform: T[i] ?? T[1], zIndex: i === 1 ? 20 : 10 }}>
                                <Cover story={s} compact className="rounded border-2 border-line shadow-[4px_4px_0_var(--shadow)]" />
                              </Link>
                            ))}
                          </div>
                          <div className="mt-2 flex items-center justify-center gap-2"><span className="text-xl">{c.emoji}</span><span className="h-display text-lg">{c.name}</span></div>
                          <div className="mt-1 text-center font-mono text-[0.68rem] text-muted">{c.storyIds.length} stories</div>
                        </div>
                      );
                    })}
                  </div>
                ) : <Empty icon="grid" title="No collections yet" />}
                {isMe && <Link href="/library" className="btn btn-ghost btn-sm mt-4">Manage in Smart Library <Icon name="arrow" size={13} /></Link>}
              </div>
            </div>
          )}

          {tab === "bookmarks" && (d.bookmarks.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {d.bookmarks.map((b) => { const s = getStory(b.storyId); if (!s) return null; return (
                <li key={b.id} className="panel-flat flex items-center gap-3 p-3"><Cover story={s} compact className="w-12 shrink-0 rounded border-2 border-line" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-extrabold">{s.title}</div><div className="truncate text-xs italic text-ink2">{b.label}</div><div className="font-mono text-[0.65rem] text-muted">Ch. {b.chapter} · {Math.round(b.pct * 100)}%</div></div><Link href={`/read/${s.id}/${b.chapter}`} className="btn btn-sm">Open</Link></li>
              ); })}
            </ul>
          ) : <Empty icon="bookmark" title="No bookmarks" />)}

          {tab === "reviews" && (d.reviews.length ? (
            <ul className="grid gap-4 md:grid-cols-2">
              {d.reviews.map((r) => { const s = getStory(r.storyId); if (!s) return null; return (
                <li key={r.id} className="panel p-4"><div className="flex items-center gap-3"><Cover story={s} compact className="w-10 rounded border-2 border-line" /><div><Link href={`/story/${s.id}`} className="text-sm font-extrabold hover:underline">{s.title}</Link><div className="flex items-center gap-1.5"><Stars value={r.rating} size={13} />{r.editedAt != null && <span className="font-mono text-[0.65rem] text-muted">· edited</span>}</div></div><span className="ml-auto font-mono text-[0.65rem] text-muted">{fmtAgo(r.at, now)}</span></div><p className="mt-3 text-sm leading-relaxed text-ink2">{r.text}</p></li>
              ); })}
            </ul>
          ) : <Empty icon="star" title="No reviews yet" text="Reviews written on story pages appear here." />)}

          {tab === "badges" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {badges.map((b) => {
                const ok = b.v >= b.g;
                return (
                  <div key={b.name} className={cx("panel-flat p-4 transition-all", ok ? "shadow-[4px_4px_0_var(--shadow)]" : "opacity-70")}>
                    <div className="flex items-center gap-3">
                      <span className={cx("grid size-14 place-items-center rounded-full border-2 border-line", ok ? "text-white" : "bg-paper2")} style={ok ? { background: accent } : undefined}><Icon name={b.icon} size={24} /></span>
                      <div><div className="h-display text-base">{b.name}</div><div className="text-xs text-muted">{b.desc}</div></div>
                    </div>
                    <ProgressBar value={Math.min(1, b.v / b.g)} className="mt-3" color={accent} />
                    <div className="mt-1 flex justify-between font-mono text-[0.65rem]"><span>{Math.min(b.v, b.g).toLocaleString()} / {b.g.toLocaleString()}</span><span className="font-bold">{ok ? "UNLOCKED" : "locked"}</span></div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "social" && (
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="h-display mb-3 text-lg">Following ({d.following.length})</h3>
                <ul className="space-y-2">
                  {d.following.map((id) => { const a = ACCOUNT_MAP[id]; if (!a) return null; return (
                    <li key={id} className="panel-flat flex items-center gap-3 p-2.5"><Avatar account={a} size={40} /><div className="min-w-0 flex-1"><Link href={`/u/${a.id}`} className="block truncate text-sm font-extrabold hover:underline">{a.name}</Link><div className="font-mono text-[0.65rem] text-muted">{a.role === "creator" ? "Creator" : "Reader"} · {fmtNum(a.followers)} followers</div></div>{isMe && <button className="btn btn-ghost btn-sm" onClick={() => act.toggleFollow(id)}>Unfollow</button>}</li>
                  ); })}
                  {d.following.length === 0 && <Empty icon="user" title="Not following anyone" />}
                </ul>
              </div>
              <div>
                <h3 className="h-display mb-3 text-lg">Followers ({fmtNum(account.followers)})</h3>
                <ul className="space-y-2">
                  {followersList.map((a) => (
                    <li key={a.id} className="panel-flat flex items-center gap-3 p-2.5"><Avatar account={a} size={40} /><div className="min-w-0 flex-1"><Link href={`/u/${a.id}`} className="block truncate text-sm font-extrabold hover:underline">{a.name}</Link><div className="truncate text-xs text-muted">{a.tagline}</div></div><button className={cx("btn btn-sm", viewerFollowing.includes(a.id) && "btn-ghost")} onClick={() => act.toggleFollow(a.id)}>{viewerFollowing.includes(a.id) ? "Following" : "Follow"}</button></li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

      </div>

      {isMe && <EditModal open={edit} onClose={() => setEdit(false)} />}
    </div>
  );
}

function EditModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, act, account, toast } = useApp();
  const [name, setName] = useState(me.profile.name);
  const [bio, setBio] = useState(me.profile.bio);
  const [accent, setAccent] = useState(me.profile.accent);
  const [avatar, setAvatar] = useState(me.profile.avatar);
  const [genres, setGenres] = useState<string[]>(me.profile.genres);
  return (
    <Modal open={open} onClose={onClose} title="Customize your profile">
      <div className="space-y-4">
        <div className="flex items-center gap-4"><Avatar account={{ ...account, image: undefined }} style={avatar} size={64} /><div className="flex flex-wrap gap-2">{AVATAR_STYLES.map((_, i) => <button key={i} onClick={() => setAvatar(i)} aria-pressed={avatar === i} aria-label={`Avatar style ${i + 1}`} className={cx("rounded-full", avatar === i && "ring-2 ring-accent ring-offset-2 ring-offset-card")}><Avatar account={{ ...account, image: undefined }} style={i} size={36} /></button>)}</div></div>
        <label className="block"><span className="label">Display name</span><input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} /></label>
        <label className="block"><span className="label">Bio</span><textarea className="field mt-1 min-h-24" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={240} /></label>
        <div><span className="label">Accent color</span><div className="mt-1 flex gap-2">{ACCENTS.map((c) => <button key={c} onClick={() => setAccent(c)} aria-label={`Accent ${c}`} aria-pressed={accent === c} className={cx("size-9 rounded-full border-2 border-line", accent === c && "ring-2 ring-line ring-offset-2 ring-offset-card")} style={{ background: c }} />)}</div></div>
        <div><span className="label">Favorite genres</span><div className="mt-1 flex flex-wrap gap-1.5">{ALL_GENRES.map((g) => <button key={g} className={cx("chip", genres.includes(g) && "chip-on")} onClick={() => setGenres((x) => (x.includes(g) ? x.filter((y) => y !== g) : x.length < 6 ? [...x, g] : x))}>{g}</button>)}</div></div>
        <button className="btn w-full" onClick={() => { act.updateProfile({ name: name.trim() || me.profile.name, bio, accent, avatar, genres }); toast("Profile updated ✓"); onClose(); }}>Save profile</button>
      </div>
    </Modal>
  );
}
