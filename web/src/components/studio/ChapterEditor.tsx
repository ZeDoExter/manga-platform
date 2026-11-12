"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PagePreset, StudioChapter, StudioPage, StudioStory } from "@/lib/types";
import { isVisual } from "@/lib/types";
import { presetPage } from "@/lib/manga";
import { chapterPrice } from "@/lib/economy";
import { cx, fmtNum, uid, words } from "@/lib/util";
import { useApp } from "@/lib/store";
import { Empty, Icon } from "../ui";
import { MangaPageSvg, type PageStyle } from "../MangaPage";
import { CreatorGate, PRESET_LABEL, PreviewOverlay, StatusChip } from "./common";
import { uploadAll, uploadArchive } from "@/lib/media-api";

export function ChapterEditor({ storyId, chapterId }: { storyId: string; chapterId: string }) {
  return (
    <CreatorGate>
      <Loader storyId={storyId} chapterId={chapterId} />
    </CreatorGate>
  );
}

function Loader({ storyId, chapterId }: { storyId: string; chapterId: string }) {
  const { state } = useApp();
  const story = state.studio.find((s) => s.id === storyId);
  const ch = story?.chapters.find((c) => c.id === chapterId);
  if (!story || !ch)
    return <div className="wrap py-20">{state.hydrated ? <Empty icon="search" title="Chapter not found" action={<Link href="/studio" className="btn">Back to Studio</Link>} /> : <div className="skeleton h-96" />}</div>;
  return <Editor key={state.hydrated ? "h" : "s"} story={story} ch={ch} />;
}

function Editor({ story, ch }: { story: StudioStory; ch: StudioChapter }) {
  const { act, toast, now, state } = useApp();
  const visual = isVisual(story.type);
  const [title, setTitle] = useState(ch.title);
  const [num, setNum] = useState(String(ch.number));
  const [text, setText] = useState(ch.text ?? "");
  const publishedCount = story.chapters.filter((c) => c.status === "published").length;
  const defaultPrice = chapterPrice(story.type, ch.number, Math.max(publishedCount, ch.number), ch.priceCoins);
  const paidDefault = story.type === "light-novel" || story.type === "web-novel" || story.type === "original" ? 20 : 30;
  const [price, setPrice] = useState(String(defaultPrice));
  const [saved, setSaved] = useState<number | null>(null);
  const [preview, setPreview] = useState<StudioChapter | null>(null);
  const [sel, setSel] = useState(0);
  const [sched, setSched] = useState(ch.scheduledFor ?? new Date(now + 86400000).toISOString().slice(0, 13) + ":00");
  const dirty = useRef(false);
  const latest = useRef(ch);
  latest.current = ch;
  const ta = useRef<HTMLTextAreaElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ active: boolean; pct: number; label: string } | null>(null);
  const pages = ch.pages ?? [];
  const merged = (patch: Partial<StudioChapter> = {}): StudioChapter => ({ ...latest.current, title: title.trim() || "Untitled", number: parseInt(num, 10) || latest.current.number, text: visual ? latest.current.text : text, priceCoins: Math.max(0, Math.min(1000, parseInt(price, 10) || 0)), updatedAt: Date.now(), ...patch });

  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => {
      act.upsertChapter(story.id, merged());
      setSaved(Date.now());
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, num, text, price]);

  const mark = () => (dirty.current = true);
  const nWords = words(text);
  const style: PageStyle = useMemo(() => ({ color: story.type !== "manga", palette: story.palette, strip: story.type !== "manga" }), [story.type, story.palette]);

  const setStatus = (status: StudioChapter["status"], scheduledFor?: string) => {
    act.upsertChapter(story.id, merged({ status, scheduledFor }));
    setSaved(Date.now());
    toast(status === "published" ? `Chapter ${ch.number} is live 🎉` : status === "scheduled" ? `Scheduled for ${scheduledFor?.replace("T", " ")} ✓` : "Moved back to drafts", status === "draft" ? "info" : "ok");
  };
  const save = () => {
    act.upsertChapter(story.id, merged());
    setSaved(Date.now());
    toast(ch.status === "published" ? "Changes saved ✓" : "Draft saved ✓");
  };

  const wrap = (l: string, r = l) => {
    const el = ta.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const picked = text.slice(s, e) || "text";
    setText(text.slice(0, s) + l + picked + r + text.slice(e));
    mark();
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + l.length, s + l.length + picked.length); });
  };
  const insert = (str: string) => {
    const el = ta.current;
    const s = el?.selectionStart ?? text.length;
    setText(text.slice(0, s) + str + text.slice(s));
    mark();
  };

  const setPages = (p: StudioPage[]) => {
    act.upsertChapter(story.id, merged({ pages: p }));
    setSaved(Date.now());
  };
  const addPreset = (preset: PagePreset) => {
    setPages([...pages, { id: uid("pg"), kind: "preset", preset }]);
    setSel(pages.length);
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= pages.length) return;
    const p = pages.slice();
    [p[i], p[j]] = [p[j], p[i]];
    setPages(p);
    setSel(j);
  };
  const upload = async (fl: FileList | null) => {
    if (!fl?.length) return;
    setBusy(true);
    const files = Array.from(fl);
    const archive = files.length === 1 && /\.(zip|rar)$/i.test(files[0].name) ? files[0] : null;
    if (archive) {
      setProgress({ active: true, pct: 0, label: "Uploading archive…" });
      try {
        const items = await uploadArchive(
          archive,
          state.accountId,
          story.id,
          ch.id,
          (pct) => {
            setProgress({
              active: true,
              pct: Math.min(95, pct),
              label: pct < 100 ? `Uploading (${pct}%)…` : "Extracting and processing pages…",
            });
          }
        );
        const added: StudioPage[] = [];
        for (const it of items) {
          if (it.result?.key) {
            added.push({ id: uid("pg"), kind: "upload", src: it.result.key });
          }
        }
        if (added.length) {
          setPages([...pages, ...added]);
          toast(`${added.length} pages added ✓`);
        } else {
          toast("No valid image pages found in archive", "warn");
        }
      } catch {
        toast("Upload could not be processed. Please try again.", "warn");
      } finally {
        setProgress(null);
        setBusy(false);
      }
      return;
    }
    const imgs = files.filter((f) => !/\.(zip|rar)$/i.test(f.name)).slice(0, 30);
    const added: StudioPage[] = [];
    let count = 0;
    setProgress({ active: true, pct: 0, label: `Uploading 0 / ${imgs.length}…` });
    await uploadAll(imgs, state.accountId, story.id, ch.id, 3, (f, res) => {
      count++;
      const pct = Math.round((count / imgs.length) * 100);
      setProgress({ active: true, pct, label: `Uploading (${count}/${imgs.length})…` });
      if (!(res instanceof Error) && res?.key) {
        added.push({ id: uid("pg"), kind: "upload", src: res.key });
      }
    });
    if (added.length) {
      setPages([...pages, ...added]);
      toast(`${added.length} pages added ✓`);
    }
    setProgress(null);
    setBusy(false);
  };
  const cur = pages[Math.min(sel, pages.length - 1)];
  const curSpec = cur && cur.kind === "preset" ? presetPage(cur.preset ?? "blank", `${story.id}:${cur.id}`, story.mood) : null;

  return (
    <div className="wrap py-6 md:py-10">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/studio/${story.id}`} className="btn btn-ghost btn-sm"><Icon name="left" size={13} /> {story.title}</Link>
        <StatusChip status={ch.status} />
        <span className="font-mono text-[0.68rem] text-muted">{saved ? `Saved ${new Date(saved).toLocaleTimeString()}` : dirty.current ? "Unsaved changes…" : "All changes saved"}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="btn btn-ghost btn-sm" onClick={save}><Icon name="check" size={13} /> {ch.status === "published" ? "Save changes" : "Save draft"}</button>
          <button className="btn btn-sm" onClick={() => setPreview(merged())}><Icon name="eye" size={13} /> Preview chapter</button>
          {ch.status === "published" ? <button className="btn btn-ghost btn-sm" onClick={() => setStatus("draft")}>Unpublish</button> : <button className="btn btn-accent btn-sm" onClick={() => setStatus("published")}><Icon name="zap" size={13} /> Publish now</button>}
        </div>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[90px_1fr]">
            <label><span className="label">No. <span className="text-accent font-extrabold">*</span></span><input className="field mt-1 text-center font-display text-lg" inputMode="numeric" value={num} onChange={(e) => { setNum(e.target.value.replace(/\D/g, "")); mark(); }} aria-label="Chapter number" /></label>
            <label><span className="label">Chapter title <span className="text-accent font-extrabold">*</span></span><input className="field mt-1 text-lg font-bold" value={title} onChange={(e) => { setTitle(e.target.value); mark(); }} maxLength={80} /></label>
          </div>

          {!visual ? (
            <div className="panel overflow-hidden">
              <div className="flex flex-wrap items-center gap-1.5 border-b-2 border-line bg-paper2 p-2">
                <button className="btn btn-ghost btn-sm" onClick={() => wrap("**")} aria-label="Bold"><b>B</b></button>
                <button className="btn btn-ghost btn-sm" onClick={() => wrap("*")} aria-label="Italic"><i>I</i></button>
                <button className="btn btn-ghost btn-sm" onClick={() => insert("\n\n---\n\n")}>⁂ Scene break</button>
                <button className="btn btn-ghost btn-sm" onClick={() => wrap("“", "”")}>“ ” Quote</button>
                <span className="ml-auto font-mono text-[0.68rem] text-muted">{fmtNum(nWords)} words · ~{Math.max(1, Math.round(nWords / 230))} min read · {text.length} chars</span>
              </div>
              <textarea ref={ta} value={text} onChange={(e) => { setText(e.target.value); mark(); }} className="min-h-[60vh] w-full resize-y bg-card p-5 font-serif text-[1.08rem] leading-[1.8] outline-none md:p-8" placeholder="Start writing… separate paragraphs with a blank line. Use *italic*, **bold** and --- for scene breaks." aria-label="Chapter text" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="panel p-3">
                {progress?.active && (
                  <div className="mb-3 rounded-md border-2 border-line bg-paper2 p-3">
                    <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                      <span className="font-display">{progress.label}</span>
                      <span className="font-mono text-accent">{progress.pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full border border-line bg-card">
                      <div
                        className="h-full bg-accent transition-all duration-200"
                        style={{ width: `${progress.pct}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="label">Artwork / Pages <span className="text-accent font-extrabold">*</span></span>
                  {(Object.keys(PRESET_LABEL) as PagePreset[]).map((p) => <button key={p} className="chip !px-3 !py-1.5" onClick={() => addPreset(p)}>+ {PRESET_LABEL[p]}</button>)}
                  <input ref={files} type="file" accept="image/*,.zip,.rar" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} aria-label="Upload manga pages or a zip/rar archive" />
                  <button className="btn btn-sm ml-auto" onClick={() => files.current?.click()} disabled={busy}><Icon name="upload" size={13} /> {busy ? "Processing…" : "Upload pages / zip"}</button>
                </div>
                {pages.length === 0 ? <Empty icon="image" title="No pages yet" text="Add placeholder frames or upload your own artwork (JPG/PNG)." /> : (
                  <div className="scroll-x flex gap-3 pb-2">
                    {pages.map((p, i) => (
                      <div key={p.id} className="w-28 shrink-0">
                        <button onClick={() => setSel(i)} aria-pressed={sel === i} className={cx("block w-full overflow-hidden rounded border-2 bg-white", sel === i ? "border-accent shadow-[3px_3px_0_var(--accent)]" : "border-line")} style={{ aspectRatio: "2/3" }}>
                          {p.kind === "upload" && p.src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.src} alt={`Page ${i + 1}`} className="h-full w-full object-cover" />
                          ) : (
                            <MangaPageSvg page={presetPage(p.preset ?? "blank", `${story.id}:${p.id}`, story.mood)} style={style} className="block h-full w-full" />
                          )}
                        </button>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="font-mono text-[0.62rem] font-bold">{i + 1}</span>
                          <div className="flex gap-0.5">
                            <button className="grid size-6 place-items-center rounded border border-line/40 hover:bg-paper2" onClick={() => move(i, -1)} aria-label="Move left"><Icon name="left" size={11} /></button>
                            <button className="grid size-6 place-items-center rounded border border-line/40 hover:bg-paper2" onClick={() => move(i, 1)} aria-label="Move right"><Icon name="right" size={11} /></button>
                            <button className="grid size-6 place-items-center rounded border border-line/40 hover:bg-paper2" onClick={() => { setPages(pages.filter((_, k) => k !== i)); setSel(0); }} aria-label="Delete page"><Icon name="trash" size={11} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {cur && (
                <div className="panel p-3">
                  <div className="label mb-2">Page {Math.min(sel, pages.length - 1) + 1} of {pages.length}</div>
                  <div className="mx-auto max-w-md overflow-hidden rounded border-2 border-line bg-white" style={{ aspectRatio: cur.kind === "upload" ? undefined : "2/3" }}>
                    {cur.kind === "upload" && cur.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cur.src} alt="" className="w-full" />
                    ) : curSpec ? (
                      <MangaPageSvg page={curSpec} style={style} className="block h-full w-full" />
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="scroll-y space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start">
          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <h3 className="h-display text-lg">Monetization</h3>
              <Icon name="coin" size={16} className="text-accent" />
            </div>
            <div className="mt-3 flex gap-2">
              <button className={cx("chip !px-3 !py-1.5", price === "0" && "chip-on")} onClick={() => { setPrice("0"); mark(); }}>Free</button>
              <button className={cx("chip !px-3 !py-1.5", price !== "0" && "chip-on")} onClick={() => { setPrice(String(paidDefault)); mark(); }}>Paid</button>
            </div>
            <label className="label mt-3 block" htmlFor="chapter-price">Price in coins</label>
            <div className="mt-1 flex items-center gap-2">
              <Icon name="coin" size={16} className="text-accent" />
              <input id="chapter-price" type="number" min={0} max={1000} step={5} className="field !py-1.5" value={price} onChange={(e) => { setPrice(e.target.value.replace(/[^\d]/g, "")); mark(); }} />
            </div>
            <p className="mt-2 text-[0.7rem] text-muted">First 3 chapters are free by default, and the latest chapter can also be free. Readers pay once and keep access.</p>
          </div>
          <div className="panel p-4">
            <h3 className="h-display text-lg">Release</h3>
            <div className="mt-3 space-y-2">
              <button className="btn btn-accent w-full" onClick={() => setStatus("published")} disabled={ch.status === "published"}><Icon name="zap" size={14} /> Publish now</button>
              <div className="rounded-md border-2 border-dashed border-line/40 p-2.5">
                <label className="label" htmlFor="sched">Or schedule</label>
                <input id="sched" type="datetime-local" className="field mt-1 !py-1.5 text-sm" value={sched} onChange={(e) => setSched(e.target.value)} />
                <button className="btn btn-sm mt-2 w-full" onClick={() => setStatus("scheduled", sched)}><Icon name="calendar" size={13} /> Schedule release</button>
              </div>
              {ch.status !== "draft" && <button className="btn btn-ghost btn-sm w-full" onClick={() => setStatus("draft")}>Move to drafts / unpublish</button>}
            </div>
            <p className="mt-3 text-[0.7rem] text-muted">Simulated: scheduled chapters don’t auto-publish in this demo; use “Publish now” to flip them live.</p>
          </div>
          <div className="panel p-4">
            <h3 className="h-display text-lg">Writing tips</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink2">
              {visual ? (<><li>Open with a splash or establishing page.</li><li>Alternate close-ups with wide shots for rhythm.</li><li>End on a page-turn cliffhanger.</li></>) : (<><li>Blank line = new paragraph.</li><li>Use <code>---</code> for a scene break.</li><li>Chapters of 600–1,500 words read best on mobile.</li></>)}
            </ul>
          </div>
        </aside>
      </div>
      {preview && <PreviewOverlay story={story} chapter={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
