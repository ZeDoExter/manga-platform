"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TYPE_LABEL } from "@/lib/types";
import { chapterNumberFromKey } from "@/lib/economy";
import { useEconomy } from "@/lib/economy-store";
import { fmtAgo, fmtNum } from "@/lib/util";
import { useApp } from "@/lib/store";
import { Cover } from "../Cover";
import { Empty, Icon, Stat } from "../ui";
import { CreatorGate, PreviewOverlay, StatusChip, coverStory, newChapter } from "./common";
import type { StudioChapter, StudioStory } from "@/lib/types";

export function StudioDashboard() {
  return (
    <CreatorGate>
      <Inner />
    </CreatorGate>
  );
}

function Inner() {
  const { state, act, account, now, toast } = useApp();
  const { creatorEarnings, refreshCreatorEarnings } = useEconomy();
  const router = useRouter();
  const mine = state.studio.filter((s) => s.ownerId === account.id);
  const [preview, setPreview] = useState<{ s: StudioStory; c: StudioChapter } | null>(null);
  const chapters = mine.flatMap((s) => s.chapters.map((c) => ({ s, c })));
  const pub = chapters.filter((x) => x.c.status === "published").length;
  const drafts = chapters.filter((x) => x.c.status === "draft").length;
  const sched = chapters.filter((x) => x.c.status === "scheduled");

  useEffect(() => {
    void refreshCreatorEarnings();
  }, [refreshCreatorEarnings]);

  const write = (s: StudioStory) => {
    const c = newChapter(s);
    act.upsertChapter(s.id, c);
    toast(`Chapter ${c.number} created — happy writing ✍️`);
    router.push(`/studio/${s.id}/edit/${c.id}`);
  };
  const toggle = (s: StudioStory) => {
    if (s.status === "published") {
      act.updateStory(s.id, { status: "unpublished" });
      toast(`${s.title} unpublished (simulated)`, "info");
    } else {
      const has = s.chapters.some((c) => c.status === "published");
      const first = [...s.chapters].sort((a, b) => a.number - b.number)[0];
      if (!has && !first) return toast("Add a chapter first", "warn");
      if (!has && first) act.upsertChapter(s.id, { ...first, status: "published", updatedAt: Date.now() });
      act.updateStory(s.id, { status: "published" });
      toast(`${s.title} is live on DOOTOON 🎉`);
    }
  };

  return (
    <div className="wrap py-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label">// creator studio · {account.name}</div>
          <h1 className="h-display mt-1 text-4xl md:text-6xl">Studio <span className="align-top font-sans text-sm font-extrabold text-accent">制作室</span></h1>
        </div>
        <div className="flex gap-2"><Link href="/studio/new" className="btn btn-accent !px-5 !py-3"><Icon name="plus" size={16} /> New story</Link><Link href={`/u/${account.id}`} className="btn btn-ghost">Public profile</Link></div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Stories" value={mine.length} sub="in your studio" />
        <Stat label="Published chapters" value={pub} sub={`across ${mine.length} stories`} />
        <Stat label="Drafts" value={drafts} sub="waiting for you" />
        <Stat label="Scheduled" value={sched.length} sub="going live soon" />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <section>
          <h2 className="h-display mb-4 text-2xl">Your stories</h2>
          {mine.length === 0 ? (
            <Empty icon="pen" title="Your first story starts here" text="Create a manga or novel, add a cover, write a chapter, preview it and publish." action={<Link href="/studio/new" className="btn">Create a story</Link>} />
          ) : (
            <ul className="space-y-4">
              {mine.map((s) => {
                const p = s.chapters.filter((c) => c.status === "published").length;
                return (
                  <li key={s.id} className="panel flex gap-4 p-3 sm:p-4">
                    <Link href={`/studio/${s.id}`} className="block w-24 shrink-0 sm:w-32"><Cover story={coverStory(s)} compact className="rounded border-2 border-line" /></Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><StatusChip status={s.status} /><span className="chip">{TYPE_LABEL[s.type]}</span>{s.mirror && <span className="chip">live catalogue</span>}</div>
                      <Link href={`/studio/${s.id}`} className="h-display mt-1.5 block truncate text-xl hover:underline sm:text-2xl">{s.title}</Link>
                      <div className="mt-1 font-mono text-xs text-muted">{s.chapters.length} chapters · {p} published · {s.chapters.filter((c) => c.status === "draft").length} drafts · edited {fmtAgo(Math.max(...s.chapters.map((c) => c.updatedAt), s.createdAt), now)}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={`/studio/${s.id}`} className="btn btn-sm">Manage</Link>
                        <button className="btn btn-sm btn-ghost" onClick={() => write(s)}><Icon name="edit" size={12} /> New chapter</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => toggle(s)}>{s.status === "published" ? "Unpublish" : "Publish"}</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-6">
          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <h3 className="h-display text-lg">Coin earnings</h3>
              <span className="chip">Stripe test</span>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="h-display text-4xl">{fmtNum(creatorEarnings?.total_coins ?? 0)}</span>
              <span className="pb-1 font-mono text-xs text-muted">coins</span>
            </div>
            <p className="mt-1 text-xs text-muted">100% of purchased coins from your chapters. Bonus coins never count as revenue.</p>
            <ul className="mt-3 space-y-2">
              {(creatorEarnings?.entries ?? []).slice(0, 5).map((e) => {
                const n = chapterNumberFromKey(e.story_id, e.chapter_id);
                const title = state.studio.find((s) => s.id === e.story_id)?.title ?? e.story_id;
                return (
                  <li key={e.id} className="flex items-center gap-2 rounded-md border-2 border-line/20 p-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-line bg-hl text-[#15120f]"><Icon name="coin" size={12} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-extrabold">{title}{n ? ` - Ch. ${n}` : ""}</div>
                      <div className="font-mono text-[0.62rem] text-muted">{new Date(e.created_at).toLocaleDateString()}</div>
                    </div>
                    <span className="font-mono text-xs font-extrabold text-mint">+{e.coins_earned}</span>
                  </li>
                );
              })}
              {creatorEarnings && !creatorEarnings.entries.length && <p className="text-sm text-muted">No sales yet. Publish a paid chapter and share it.</p>}
            </ul>
            <Link href="/wallet" className="btn btn-ghost btn-sm mt-3 w-full">Open wallet</Link>
          </div>
          <div className="panel p-4">
            <h3 className="h-display text-lg">Release queue</h3>
            <ul className="mt-3 space-y-2">
              {chapters.filter((x) => x.c.status !== "published").sort((a, b) => b.c.updatedAt - a.c.updatedAt).slice(0, 6).map(({ s, c }) => (
                <li key={c.id} className="flex items-center gap-2 rounded-md border-2 border-line/20 p-2">
                  <StatusChip status={c.status} />
                  <div className="min-w-0 flex-1"><div className="truncate text-xs font-extrabold">{s.title} · Ch. {c.number}</div><div className="font-mono text-[0.62rem] text-muted">{c.status === "scheduled" ? c.scheduledFor?.replace("T", " ") : `edited ${fmtAgo(c.updatedAt, now)}`}</div></div>
                  <button className="btn btn-ghost btn-sm btn-icon" aria-label="Preview" onClick={() => setPreview({ s, c })}><Icon name="eye" size={13} /></button>
                  <Link href={`/studio/${s.id}/edit/${c.id}`} className="btn btn-sm btn-icon" aria-label="Edit"><Icon name="edit" size={13} /></Link>
                </li>
              ))}
              {chapters.every((x) => x.c.status === "published") && <p className="text-sm text-muted">Nothing queued. Start a new chapter!</p>}
            </ul>
          </div>
          <div className="panel p-4">
            <h3 className="h-display text-lg">Publishing workflow</h3>
            <ol className="mt-3 space-y-3">
              {[["Create", "Metadata, genres, tags & cover"], ["Write / upload", "Novel text or manga pages"], ["Preview", "See it exactly as readers will"], ["Publish or schedule", "Go live now or pick a slot"], ["Earn", "Coin sales land in your Wallet"]].map(([t, d], i) => (
                <li key={t} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-line bg-ink font-mono text-xs font-bold text-paper">{i + 1}</span><div><div className="text-sm font-extrabold">{t}</div><div className="text-xs text-muted">{d}</div></div></li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
      {preview && <PreviewOverlay story={preview.s} chapter={preview.c} onClose={() => setPreview(null)} />}
    </div>
  );
}
