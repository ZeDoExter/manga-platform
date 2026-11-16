"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColorMode, Mood, Motif, StoryType, StudioStory } from "@/lib/types";
import { COLOR_LABEL, TYPE_LABEL, isVisual } from "@/lib/types";
import { ALL_GENRES, MOODS, TYPES } from "@/data/stories";
import { defaultPages } from "@/lib/content";
import { cx, uid } from "@/lib/util";
import { useApp } from "@/lib/store";
import { uploadCover } from "@/lib/media-api";
import { Cover } from "../Cover";
import { Icon } from "../ui";
import { CreatorGate, Field, MOTIF_PICKS, PALETTES, fileToDataUrl } from "./common";

const STEPS = ["Basics", "Genres & tags", "Cover art", "Review"];

export function NewStory() {
  return (
    <CreatorGate>
      <Wizard />
    </CreatorGate>
  );
}

function Wizard() {
  const { act, account, toast } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<StoryType>("manga");
  const [colorMode, setColorMode] = useState<ColorMode>("color");
  const [tagline, setTagline] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagIn, setTagIn] = useState("");
  const [mood, setMood] = useState<Mood>("calm");
  const [palette, setPalette] = useState(PALETTES[0]);
  const [motif, setMotif] = useState<Motif>("moon");
  const [image, setImage] = useState<string | undefined>();
  const [draftId] = useState(() => uid("story"));
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const valid0 = title.trim().length >= 3 && synopsis.trim().length >= 20;
  const valid1 = genres.length >= 1;
  const can = step === 0 ? valid0 : step === 1 ? valid1 : true;
  const tog = <T,>(a: T[], v: T, max = 99) => (a.includes(v) ? a.filter((x) => x !== v) : a.length < max ? [...a, v] : a);

  const create = (publish: boolean) => {
    const id = draftId;
    const visual = isVisual(type);
    const ch = {
      id: uid("ch"),
      number: 1,
      title: "Chapter 1",
      status: publish ? ("published" as const) : ("draft" as const),
      updatedAt: Date.now(),
      text: visual ? undefined : "The first line of every story is a promise.\n\nWrite yours here — then preview it exactly as readers will see it.",
      pages: visual ? defaultPages(4, uid("p")) : undefined,
    };
    const st: StudioStory = { id, ownerId: account.id, title: title.trim(), type, colorMode, synopsis: synopsis.trim(), tagline: tagline.trim(), genres, tags, palette, motif, mood, coverImage: image, status: publish ? "published" : "draft", chapters: [ch], createdAt: Date.now() };
    act.createStory(st);
    toast(publish ? `“${st.title}” published! Find it in Discover 🎉` : `Draft saved — “${st.title}” is in your Studio ✓`);
    router.push(publish ? `/studio/${id}` : `/studio/${id}/edit/${ch.id}`);
  };

  const preview = { id: "preview", title: title || "Untitled story", alt: "", type, palette, motif, cover: image };

  return (
    <div className="wrap py-8 md:py-12">
      <div className="label">// creator studio</div>
      <h1 className="h-display mt-1 text-4xl md:text-5xl">Create a new story</h1>
      <ol className="mt-6 flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button onClick={() => (i <= step || (i === 1 && valid0) || (i >= 2 && valid0 && valid1)) && setStep(i)} className={cx("flex items-center gap-2 rounded-md border-2 px-3 py-1.5 text-sm font-bold", i === step ? "border-line bg-ink text-paper shadow-[3px_3px_0_var(--accent)]" : i < step ? "border-line bg-mint text-[#15120f]" : "border-line/30 text-muted")} aria-current={i === step}>
              <span className="grid size-5 place-items-center rounded-full border-2 border-current text-[0.65rem]">{i < step ? "✓" : i + 1}</span>{s}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="panel space-y-6 p-5 md:p-6">
          {step === 0 && (
            <>
              <Field label="Title" hint={`${title.length}/60`} required><input className="field text-lg font-bold" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="e.g. The Lanternkeeper’s Apprentice" autoFocus /></Field>
              <div>
                <span className="label">Format <span className="text-accent font-extrabold">*</span></span>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {TYPES.map((t) => <button key={t} onClick={() => setType(t)} aria-pressed={type === t} className={cx("rounded-md border-2 border-line p-3 text-left transition-all", type === t ? "bg-ink text-paper shadow-[3px_3px_0_var(--accent)]" : "bg-card hover:-translate-y-0.5")}><div className="text-sm font-extrabold">{TYPE_LABEL[t]}</div><div className="font-mono text-[0.62rem] opacity-70">{isVisual(t) ? "pages / panels" : "text editor"}</div></button>)}
                </div>
              </div>
              {isVisual(type) && (
                <div>
                  <span className="label">Artwork</span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(["color", "mono"] as const).map((m) => <button key={m} onClick={() => setColorMode(m)} aria-pressed={colorMode === m} className={cx("rounded-md border-2 border-line p-3 text-left transition-all", colorMode === m ? "bg-ink text-paper shadow-[3px_3px_0_var(--accent)]" : "bg-card hover:-translate-y-0.5")}><div className="text-sm font-extrabold">{COLOR_LABEL[m]}</div><div className="font-mono text-[0.62rem] opacity-70">{m === "color" ? "full color pages" : "black & white"}</div></button>)}
                  </div>
                </div>
              )}
              <Field label="Tagline" hint="one line that sells it"><input className="field" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={90} placeholder="She maps the places that were never built." /></Field>
              <Field label="Synopsis" hint={`${synopsis.length}/500 · min 20`} required><textarea className="field min-h-32" value={synopsis} onChange={(e) => setSynopsis(e.target.value)} maxLength={500} placeholder="Introduce your world, your hook, and the question readers can’t put down…" /></Field>
              {!valid0 && <p className="text-xs font-semibold text-accent">Add a title (3+ chars) and a synopsis (20+ chars) to continue.</p>}
            </>
          )}
          {step === 1 && (
            <>
              <div><span className="label">Genres <span className="text-accent font-extrabold">*</span> <span className="normal-case">(pick up to 4)</span></span><div className="mt-2 flex flex-wrap gap-1.5">{ALL_GENRES.map((g) => <button key={g} className={cx("chip !px-3 !py-1.5", genres.includes(g) && "chip-on")} aria-pressed={genres.includes(g)} onClick={() => setGenres(tog(genres, g, 4))}>{g}</button>)}</div></div>
              <div>
                <span className="label">Tags</span>
                <div className="mt-2 flex gap-2"><input className="field" placeholder="Type a tag and press Enter" value={tagIn} onChange={(e) => setTagIn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = tagIn.trim(); if (t && tags.length < 8 && !tags.includes(t)) setTags([...tags, t]); setTagIn(""); } }} /><button className="btn" onClick={() => { const t = tagIn.trim(); if (t && tags.length < 8 && !tags.includes(t)) setTags([...tags, t]); setTagIn(""); }}>Add</button></div>
                <div className="mt-2 flex flex-wrap gap-1.5">{tags.map((t) => <button key={t} className="chip chip-on" onClick={() => setTags(tags.filter((x) => x !== t))}>#{t} ✕</button>)}{!tags.length && <span className="text-xs text-muted">Up to 8 tags — e.g. “slow burn”, “found family”.</span>}</div>
              </div>
              <div><span className="label">Mood · drives the reader’s atmosphere</span><div className="mt-2 flex flex-wrap gap-1.5">{MOODS.map((m) => <button key={m} className={cx("chip !px-3 !py-1.5", mood === m && "chip-on")} aria-pressed={mood === m} onClick={() => setMood(m)}>{m}</button>)}</div></div>
              {!valid1 && <p className="text-xs font-semibold text-accent">Pick at least one genre.</p>}
            </>
          )}
          {step === 2 && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <input ref={file} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setBusy(true); try { setImage(await uploadCover(f, account.id, draftId)); toast("Cover uploaded ✓"); } catch { try { setImage(await fileToDataUrl(f, 640)); toast("Cover saved on this device only (upload failed)", "warn"); } catch { toast("Couldn’t read that image", "warn"); } } setBusy(false); }} aria-label="Upload cover artwork" />
                <button className="btn" onClick={() => file.current?.click()} disabled={busy}><Icon name="upload" size={14} /> {busy ? "Processing…" : "Upload artwork"}</button>
                {image && <button className="btn btn-ghost" onClick={() => setImage(undefined)}>Remove & use generated</button>}
                <span className="text-xs text-muted">or design a generated cover below</span>
              </div>
              <div><span className="label">Palette</span><div className="mt-2 flex flex-wrap gap-2">{PALETTES.map((p, i) => <button key={i} onClick={() => setPalette(p)} aria-label={`Palette ${i + 1}`} aria-pressed={palette === p} className={cx("flex h-10 w-16 overflow-hidden rounded-md border-2 border-line", palette === p && "ring-2 ring-accent ring-offset-2 ring-offset-card")}>{p.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</button>)}</div></div>
              <div><span className="label">Motif</span><div className="mt-2 flex flex-wrap gap-1.5">{MOTIF_PICKS.map((m) => <button key={m} className={cx("chip", motif === m && "chip-on")} onClick={() => setMotif(m)} aria-pressed={motif === m}>{m}</button>)}</div></div>
            </>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="h-display text-2xl">Ready to create “{title}”</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[["Format", TYPE_LABEL[type]], ["Genres", genres.join(", ")], ["Tags", tags.map((t) => "#" + t).join(" ") || "—"], ["Mood", mood], ["Tagline", tagline || "—"], ["Cover", image ? "Uploaded artwork" : `Generated · ${motif}`]].map(([k, v]) => <div key={k} className="rounded-md border-2 border-line/30 p-3"><dt className="label">{k}</dt><dd className="mt-0.5 text-sm font-bold">{v}</dd></div>)}
              </dl>
              <p className="text-sm text-ink2">We’ll create <b>Chapter 1</b> for you with {isVisual(type) ? "four placeholder manga pages" : "a starter paragraph"}. Save it as a draft to keep working, or publish it right away.</p>
              <div className="flex flex-wrap gap-3">
                <button className="btn !px-5 !py-3" onClick={() => create(false)}><Icon name="edit" size={15} /> Save draft & start writing</button>
                <button className="btn btn-accent !px-5 !py-3" onClick={() => create(true)}><Icon name="zap" size={15} /> Create & publish Chapter 1</button>
              </div>
            </div>
          )}

          <div className="flex justify-between border-t-2 border-dashed border-line/30 pt-5">
            <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><Icon name="left" size={14} /> Back</button>
            {step < 3 && <button className="btn" disabled={!can} onClick={() => setStep(step + 1)}>Continue <Icon name="right" size={14} /></button>}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="label mb-2">Live preview</div>
          <div className="mx-auto max-w-[260px] rounded-md border-2 border-line shadow-[6px_6px_0_var(--shadow)]"><Cover story={preview} className="rounded-[4px]" /></div>
          <div className="mt-4 text-center"><div className="chip chip-on">{TYPE_LABEL[type]}</div><div className="mt-2 flex flex-wrap justify-center gap-1">{genres.map((g) => <span key={g} className="chip">{g}</span>)}</div><p className="mt-3 text-sm italic text-ink2">{tagline || "Your tagline appears here."}</p></div>
        </aside>
      </div>
    </div>
  );
}
