"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudioChapter } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/types";
import { ALL_GENRES, MOODS } from "@/data/stories";
import { cx, fmtAgo, fmtNum } from "@/lib/util";
import { useApp } from "@/lib/store";
import { Cover } from "../Cover";
import { Empty, Icon, ProgressBar, Stat, Tabs } from "../ui";
import { AnalyticsLab } from "./AnalyticsLab";
import { CreatorGate, Field, MOTIF_PICKS, PALETTES, PreviewOverlay, SimBanner, StatusChip, coverStory, fileToDataUrl, newChapter } from "./common";

type Tab = "overview" | "chapters" | "analytics" | "settings";

export function StoryManager({ id }: { id: string }) {
  return (
    <CreatorGate>
      <Inner id={id} />
    </CreatorGate>
  );
}

function Inner({ id }: { id: string }) {
  const { state, act, toast, now } = useApp();
  const router = useRouter();
  const story = state.studio.find((s) => s.id === id);
  const [tab, setTab] = useState<Tab>("overview");
  const [preview, setPreview] = useState<StudioChapter | null>(null);
  const [schedFor, setSchedFor] = useState<string | null>(null);
  const [schedVal, setSchedVal] = useState("");
  const [tagIn, setTagIn] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const chapters = useMemo(() => (story ? [...story.chapters].sort((a, b) => b.number - a.number) : []), [story]);
  if (!story) {
    return <div className="wrap py-20">{state.hydrated ? <Empty icon="search" title="Story not found" text="It may have been deleted." action={<Link href="/studio" className="btn">Back to Studio</Link>} /> : <div className="skeleton h-64" />}</div>;
  }
  const pub = chapters.filter((c) => c.status === "published");
  const checks = [
    ["Cover art", !!story.coverImage || story.palette.length === 3],
    ["Synopsis (80+ characters)", story.synopsis.length >= 80],
    ["Two or more genres", story.genres.length >= 2],
    ["At least 3 tags", story.tags.length >= 3],
    ["At least one chapter", chapters.length >= 1],
    ["A published chapter", pub.length >= 1],
  ] as const;
  const score = checks.filter((c) => c[1]).length / checks.length;

  const togglePublish = () => {
    if (story.status === "published") {
      act.updateStory(story.id, { status: "unpublished" });
      toast("Story unpublished (simulated) — hidden from new readers", "info");
      return;
    }
    if (!pub.length) {
      const first = [...chapters].sort((a, b) => a.number - b.number)[0];
      if (!first) return toast("Add a chapter first", "warn");
      act.upsertChapter(story.id, { ...first, status: "published", updatedAt: Date.now() });
    }
    act.updateStory(story.id, { status: "published" });
    toast(`“${story.title}” is live on DOOTOON 🎉`);
  };
  const setCh = (c: StudioChapter, status: StudioChapter["status"], scheduledFor?: string) => {
    act.upsertChapter(story.id, { ...c, status, scheduledFor, updatedAt: Date.now() });
    toast(status === "published" ? `Chapter ${c.number} published ✓` : status === "scheduled" ? `Chapter ${c.number} scheduled for ${scheduledFor?.replace("T", " ")}` : `Chapter ${c.number} moved to drafts`, status === "draft" ? "info" : "ok");
  };
  const addCh = () => {
    const c = newChapter(story);
    act.upsertChapter(story.id, c);
    router.push(`/studio/${story.id}/edit/${c.id}`);
  };
  const addTag = () => {
    const t = tagIn.trim();
    if (t && story.tags.length < 8 && !story.tags.includes(t)) act.updateStory(story.id, { tags: [...story.tags, t] });
    setTagIn("");
  };
  const tog = (arr: string[], v: string, max: number) => (arr.includes(v) ? arr.filter((x) => x !== v) : arr.length < max ? [...arr, v] : arr);

  return (
    <div className="wrap py-8 md:py-12">
      <Link href="/studio" className="inline-flex items-center gap-1 font-mono text-xs font-bold text-muted hover:text-ink"><Icon name="left" size={13} /> Studio</Link>
      <div className="mt-3 flex flex-wrap items-start gap-5">
        <div className="w-28 shrink-0 rounded-md border-2 border-line shadow-[5px_5px_0_var(--shadow)] sm:w-36"><Cover story={coverStory(story)} compact className="rounded-[4px]" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><StatusChip status={story.status} /><span className="chip">{TYPE_LABEL[story.type]}</span>{story.mirror && <span className="chip" title="This story also exists in the public catalogue">live catalogue</span>}</div>
          <h1 className="h-display mt-2 text-3xl md:text-5xl">{story.title}</h1>
          <p className="mt-1 text-sm italic text-ink2">{story.tagline || "No tagline yet"}</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button className="btn btn-accent" onClick={togglePublish}><Icon name={story.status === "published" ? "lock" : "zap"} size={14} /> {story.status === "published" ? "Unpublish story" : "Publish story"}</button>
            <button className="btn" onClick={addCh}><Icon name="plus" size={14} /> New chapter</button>
            {story.status === "published" && <Link href={`/story/${story.id}`} className="btn btn-ghost">View live page <Icon name="out" size={13} /></Link>}
          </div>
        </div>
      </div>
      <div className="mt-5"><SimBanner /></div>

      <Tabs className="mt-8" value={tab} onChange={setTab} tabs={[
        { id: "overview", label: "Overview", icon: "grid" },
        { id: "chapters", label: "Chapters", icon: "list", count: chapters.length },
        { id: "analytics", label: "Analytics Lab", icon: "chart" },
        { id: "settings", label: "Settings", icon: "sliders" },
      ]} />

      <div className="mt-6">
        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Published" value={pub.length} sub="chapters" />
                <Stat label="Drafts" value={chapters.filter((c) => c.status === "draft").length} />
                <Stat label="Scheduled" value={chapters.filter((c) => c.status === "scheduled").length} />
                <Stat label="Total reads" value={fmtNum(chapters.reduce((a, c) => a + (c.reads ?? 0), 0))} sub="simulated" />
              </div>
              <div className="panel p-4">
                <h3 className="h-display text-lg">Latest chapters</h3>
                <ul className="mt-3 divide-y-2 divide-line/10">
                  {chapters.slice(0, 4).map((c) => <li key={c.id} className="flex items-center gap-3 py-2.5"><StatusChip status={c.status} /><div className="min-w-0 flex-1 truncate text-sm font-extrabold">Ch. {c.number} — {c.title}</div><span className="font-mono text-[0.65rem] text-muted">{fmtAgo(c.updatedAt, now)}</span><Link href={`/studio/${story.id}/edit/${c.id}`} className="btn btn-sm btn-ghost">Edit</Link></li>)}
                  {!chapters.length && <p className="py-3 text-sm text-muted">No chapters yet.</p>}
                </ul>
              </div>
            </div>
            <div className="panel p-4">
              <div className="flex items-center justify-between"><h3 className="h-display text-lg">Publish readiness</h3><span className="chip chip-on">{Math.round(score * 100)}%</span></div>
              <ProgressBar value={score} className="mt-3" color="var(--mint)" />
              <ul className="mt-4 space-y-2">{checks.map(([l, ok]) => <li key={l} className="flex items-center gap-2 text-sm font-bold"><span className={cx("grid size-5 place-items-center rounded-full border-2 border-line", ok ? "bg-mint text-[#15120f]" : "bg-paper2")}>{ok && <Icon name="check" size={11} />}</span><span className={ok ? "" : "text-muted"}>{l}</span></li>)}</ul>
            </div>
          </div>
        )}

        {tab === "chapters" && (
          <div>
            <div className="mb-4 flex justify-between"><div className="text-sm text-muted">{chapters.length} chapters · edit, preview, schedule or publish each one.</div><button className="btn btn-sm" onClick={addCh}><Icon name="plus" size={13} /> New chapter</button></div>
            {chapters.length === 0 ? <Empty icon="edit" title="No chapters yet" text="Create the first one and start writing." action={<button className="btn" onClick={addCh}>Create chapter 1</button>} /> : (
              <ul className="panel-flat divide-y-2 divide-line/15">
                {chapters.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 p-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md border-2 border-line bg-ink font-display text-sm text-paper">{c.number}</span>
                    <div className="min-w-0 flex-1 basis-48"><div className="truncate text-sm font-extrabold">{c.title}</div><div className="flex flex-wrap items-center gap-2 font-mono text-[0.65rem] text-muted"><StatusChip status={c.status} />{c.status === "scheduled" ? <span>goes live {c.scheduledFor?.replace("T", " ")}</span> : <span>edited {fmtAgo(c.updatedAt, now)}</span>}{c.reads ? <span>· {fmtNum(c.reads)} reads</span> : null}</div></div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link href={`/studio/${story.id}/edit/${c.id}`} className="btn btn-sm"><Icon name="edit" size={12} /> Edit</Link>
                      <button className="btn btn-sm btn-ghost" onClick={() => setPreview(c)}><Icon name="eye" size={12} /> Preview</button>
                      {c.status === "published" ? <button className="btn btn-sm btn-ghost" onClick={() => setCh(c, "draft")}>Unpublish</button> : <button className="btn btn-sm btn-ghost" onClick={() => setCh(c, "published")}>Publish</button>}
                      <button className="btn btn-sm btn-ghost" onClick={() => { setSchedFor(schedFor === c.id ? null : c.id); setSchedVal(c.scheduledFor ?? new Date(now + 86400000).toISOString().slice(0, 13) + ":00"); }}><Icon name="calendar" size={12} /> Schedule</button>
                      <button className="btn btn-sm btn-ghost btn-icon" aria-label={`Delete chapter ${c.number}`} onClick={() => window.confirm(`Delete chapter ${c.number}?`) && act.deleteChapter(story.id, c.id)}><Icon name="trash" size={12} /></button>
                    </div>
                    {schedFor === c.id && (
                      <div className="anim-fade-up flex w-full flex-wrap items-center gap-2 rounded-md border-2 border-dashed border-line/50 bg-paper2 p-2.5">
                        <input type="datetime-local" className="field !w-auto !py-1.5 text-sm" value={schedVal} onChange={(e) => setSchedVal(e.target.value)} aria-label="Release date and time" />
                        <button className="btn btn-sm" onClick={() => { if (!schedVal) return; setCh(c, "scheduled", schedVal); setSchedFor(null); }}>Confirm schedule</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setSchedFor(null)}>Cancel</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "analytics" && <AnalyticsLab story={story} />}

        {tab === "settings" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="panel space-y-4 p-5">
              <h3 className="h-display text-lg">Metadata</h3>
              <Field label="Title"><input className="field" value={story.title} onChange={(e) => act.updateStory(story.id, { title: e.target.value })} maxLength={60} /></Field>
              <Field label="Tagline"><input className="field" value={story.tagline} onChange={(e) => act.updateStory(story.id, { tagline: e.target.value })} maxLength={90} /></Field>
              <Field label="Synopsis" hint={`${story.synopsis.length}/500`}><textarea className="field min-h-28" value={story.synopsis} onChange={(e) => act.updateStory(story.id, { synopsis: e.target.value })} maxLength={500} /></Field>
              <div><span className="label">Genres (max 4)</span><div className="mt-1.5 flex flex-wrap gap-1.5">{ALL_GENRES.map((g) => <button key={g} className={cx("chip", story.genres.includes(g) && "chip-on")} onClick={() => act.updateStory(story.id, { genres: tog(story.genres, g, 4) })}>{g}</button>)}</div></div>
              <div><span className="label">Tags</span><div className="mt-1.5 flex gap-2"><input className="field" value={tagIn} onChange={(e) => setTagIn(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Add a tag" /><button className="btn" onClick={addTag}>Add</button></div><div className="mt-2 flex flex-wrap gap-1.5">{story.tags.map((t) => <button key={t} className="chip chip-on" onClick={() => act.updateStory(story.id, { tags: story.tags.filter((x) => x !== t) })}>#{t} ✕</button>)}</div></div>
              <div><span className="label">Reader mood</span><div className="mt-1.5 flex flex-wrap gap-1.5">{MOODS.map((m) => <button key={m} className={cx("chip", story.mood === m && "chip-on")} onClick={() => act.updateStory(story.id, { mood: m })}>{m}</button>)}</div></div>
            </div>
            <div className="space-y-6">
              <div className="panel space-y-4 p-5">
                <h3 className="h-display text-lg">Cover art</h3>
                <div className="flex items-start gap-4">
                  <div className="w-32 shrink-0 rounded-md border-2 border-line"><Cover story={coverStory(story)} className="rounded-[4px]" /></div>
                  <div className="space-y-3">
                    <input ref={file} type="file" accept="image/*" className="hidden" aria-label="Upload cover" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { act.updateStory(story.id, { coverImage: await fileToDataUrl(f, 640) }); toast("Cover updated ✓"); } catch { toast("Couldn’t read that image", "warn"); } }} />
                    <button className="btn btn-sm" onClick={() => file.current?.click()}><Icon name="upload" size={13} /> Upload artwork</button>
                    {story.coverImage && <button className="btn btn-sm btn-ghost" onClick={() => act.updateStory(story.id, { coverImage: undefined })}>Use generated cover</button>}
                    <div className="flex flex-wrap gap-1.5">{PALETTES.map((p, i) => <button key={i} aria-label={`Palette ${i + 1}`} onClick={() => act.updateStory(story.id, { palette: p })} className={cx("flex h-7 w-11 overflow-hidden rounded border-2 border-line", story.palette === p && "ring-2 ring-accent")}>{p.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</button>)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">{MOTIF_PICKS.slice(0, 16).map((m) => <button key={m} className={cx("chip", story.motif === m && "chip-on")} onClick={() => act.updateStory(story.id, { motif: m })}>{m}</button>)}</div>
              </div>
              <div className="panel border-accent p-5">
                <h3 className="h-display text-lg text-accent">Danger zone</h3>
                <p className="mt-1 text-sm text-muted">Deleting removes this story and all its chapters from your browser storage.</p>
                <button className="btn btn-ghost mt-3 !text-accent" onClick={() => { if (window.confirm(`Delete “${story.title}” permanently?`)) { act.deleteStory(story.id); router.push("/studio"); } }}><Icon name="trash" size={14} /> Delete story</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {preview && <PreviewOverlay story={story} chapter={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
