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
import { resolveImageUrl } from "@/lib/content";
import * as fflate from "fflate";

function extractPageNumber(str?: string): number | null {
  if (!str) return null;
  const clean = str.split("/").pop() || str;
  const m = clean.match(/(\d+)(?:\.[a-z0-9]+)?$/i) || clean.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

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
  const merged = (patch: Partial<StudioChapter> = {}): StudioChapter => ({ ...latest.current, title: title.trim() || `Chapter ${num || latest.current.number}`, number: parseInt(num, 10) || latest.current.number, text: visual ? latest.current.text : text, priceCoins: Math.max(0, Math.min(1000, parseInt(price, 10) || 0)), updatedAt: Date.now(), ...patch });

  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => {
      act.upsertChapter(story.id, merged());
      setSaved(Date.now());
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, num, text, price]);

  // Warn user if they attempt to leave or refresh while uploading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [busy]);
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
  const sortPagesByName = () => {
    const sorted = [...pages].sort((a, b) => {
      const numA = extractPageNumber(a.label);
      const numB = extractPageNumber(b.label);
      if (numA !== null && numB !== null) {
        return numA - numB;
      }
      const na = a.label || a.src?.split("/").pop() || "";
      const nb = b.label || b.src?.split("/").pop() || "";
      return na.localeCompare(nb, undefined, { numeric: true, sensitivity: "base" });
    });
    setPages(sorted);
    toast("Pages sorted naturally (1, 2, 3…) ✓");
  };
  const upload = async (fl: FileList | null) => {
    if (!fl?.length) return;
    setBusy(true);
    const files = Array.from(fl);
    const archive = files.length === 1 && /\.zip$/i.test(files[0].name) ? files[0] : null;
    if (archive) {
      setProgress({ active: true, pct: 0, label: "Scanning archive…" });
      try {
        const buf = new Uint8Array(await archive.arrayBuffer());
        const { promise: unzipPromise, resolve: resolveUnzip, reject: rejectUnzip } = Promise.withResolvers<Record<string, Uint8Array>>();
        fflate.unzip(buf, (err, data) => (err ? rejectUnzip(err) : resolveUnzip(data)));
        const unzipped = await unzipPromise;

        const imageEntries = Object.entries(unzipped)
          .filter(([name]) => !name.endsWith("/") && !name.startsWith("__MACOSX") && /\.(jpe?g|png|webp|gif)$/i.test(name))
          .sort(([a], [b]) => {
            const na = a.split("/").pop() || a;
            const nb = b.split("/").pop() || b;
            const numA = extractPageNumber(na);
            const numB = extractPageNumber(nb);
            if (numA !== null && numB !== null) {
              return numA - numB;
            }
            return na.localeCompare(nb, undefined, { numeric: true, sensitivity: "base" });
          });

        if (imageEntries.length > 0) {
          const extractedFiles = imageEntries.map(([name, data]) => {
            const cleanName = name.split("/").pop() || name;
            const mime = /\.png$/i.test(cleanName) ? "image/png" : /\.webp$/i.test(cleanName) ? "image/webp" : "image/jpeg";
            const bytesCopy = new Uint8Array(data.length);
            bytesCopy.set(data);
            return new File([bytesCopy], cleanName, { type: mime });
          });

          let count = 0;
          setProgress({ active: true, pct: 0, label: `Uploading (0 / ${extractedFiles.length})…` });

          const results = await uploadAll(extractedFiles, state.accountId, story.id, ch.id, 6, (f, res) => {
            count++;
            const pct = Math.round((count / extractedFiles.length) * 100);
            setProgress({ active: true, pct, label: `Uploading (${count} / ${extractedFiles.length})…` });
          });

          const added: StudioPage[] = [];
          for (let i = 0; i < extractedFiles.length; i++) {
            const res = results[i];
            if (res && !(res instanceof Error) && res.key) {
              added.push({ id: uid("pg"), kind: "upload", src: res.key, label: extractedFiles[i].name });
            }
          }

          const failed = results.filter((r): r is Error => r instanceof Error);
          if (added.length) {
            if (pages.length > 0 && confirm(`Replace existing ${pages.length} pages with ${added.length} pages from ${archive.name}?`)) {
              setPages(added);
              setSel(0);
            } else {
              setPages([...pages, ...added]);
            }
            toast(`${added.length} pages loaded in order (1 to ${added.length}) ✓`);
          }
          if (failed.length) toast(`${failed.length} page${failed.length === 1 ? "" : "s"} failed: ${failed[0].message}`, "warn");
          if (!added.length && !failed.length) toast("No images found in that archive", "warn");
        } else {
          // Fallback to server batch if fflate didn't find images
          const items = await uploadArchive(archive, state.accountId, story.id, ch.id, (pct) => {
            setProgress({ active: true, pct: Math.min(95, pct), label: `Uploading (${pct}%)…` });
          });
          const added: StudioPage[] = [];
          for (const it of items) {
            if (it.result?.key) added.push({ id: uid("pg"), kind: "upload", src: it.result.key });
          }
          const failed = items.filter((it) => !it.result?.key);
          if (added.length) {
            setPages([...pages, ...added]);
            toast(`${added.length} pages added ✓`);
          }
          if (failed.length) toast(`${failed.length} page${failed.length === 1 ? "" : "s"} failed${failed[0].error ? `: ${failed[0].error}` : ""}`, "warn");
        }
      } catch {
        toast("Upload could not be processed. Please try again.", "warn");
      } finally {
        setProgress(null);
        setBusy(false);
      }
      return;
    }
    const imgs = files
      .filter((f) => !/\.zip$/i.test(f.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

    let count = 0;
    setProgress({ active: true, pct: 0, label: `Uploading (0 / ${imgs.length})…` });
    const results = await uploadAll(imgs, state.accountId, story.id, ch.id, 6, (f, res) => {
      count++;
      const pct = Math.round((count / imgs.length) * 100);
      setProgress({ active: true, pct, label: `Uploading (${count} / ${imgs.length})…` });
    });

    const added: StudioPage[] = [];
    for (let i = 0; i < imgs.length; i++) {
      const res = results[i];
      if (res && !(res instanceof Error) && res.key) {
        added.push({ id: uid("pg"), kind: "upload", src: res.key, label: imgs[i].name });
      }
    }
    if (added.length) {
      setPages([...pages, ...added]);
      toast(`${added.length} pages added in order ✓`);
    }
    const failed = results.filter((r): r is Error => r instanceof Error);
    if (failed.length) toast(`${failed.length} page${failed.length === 1 ? "" : "s"} failed: ${failed[0].message}`, "warn");
    if (!added.length && !failed.length && imgs.length) toast("No pages were added", "warn");
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
            <label><span className="label">Chapter title <span className="normal-case tracking-normal text-muted font-normal">(optional)</span></span><input className="field mt-1 text-lg font-bold" value={title} onChange={(e) => { setTitle(e.target.value); mark(); }} maxLength={80} placeholder={`Chapter ${num || ch.number}`} /></label>
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
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-line/10 pb-3">
                  <div>
                    <span className="label">Pages / Artwork <span className="text-accent font-extrabold">*</span></span>
                    <div className="text-xs font-bold text-muted">{pages.length} {pages.length === 1 ? "page" : "pages"} in this chapter</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input ref={files} type="file" accept="image/*,.zip" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} aria-label="Upload manga pages or a zip archive" />
                    <button className="btn btn-accent btn-sm" onClick={() => files.current?.click()} disabled={busy}>
                      <Icon name="upload" size={13} /> {busy ? "Uploading…" : "Upload pages / ZIP"}
                    </button>
                    <span className="font-mono text-[0.68rem] text-muted">(ZIP สูงสุด 100MB · รูปเดี่ยว ≤ 10MB)</span>
                    {pages.length > 1 && (
                      <button className="btn btn-ghost btn-sm text-xs font-bold" onClick={sortPagesByName} title="Sort pages by filename (1, 2, 3…)">
                        <Icon name="sliders" size={12} /> Sort 1–{pages.length}
                      </button>
                    )}
                    {pages.length > 0 && (
                      <button className="btn btn-ghost btn-sm text-xs !text-muted hover:!text-accent" onClick={() => { if (confirm("Clear all pages in this chapter?")) { setPages([]); setSel(0); } }}>
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                {pages.length === 0 ? (
                  <Empty
                    icon="image"
                    title="No pages uploaded yet"
                    text="เลือกไฟล์ .ZIP หรือภาพ JPG/PNG/WebP (ระบบเรียงหน้า 1, 2, 3... ให้อัตโนมัติ)"
                    action={
                      <div className="mt-2 flex flex-col items-center gap-1.5">
                        <button className="btn btn-accent" onClick={() => files.current?.click()} disabled={busy}>
                          <Icon name="upload" size={14} /> Upload ZIP or images
                        </button>
                        <span className="font-mono text-[0.68rem] text-muted">ZIP สูงสุด 100MB · รูปเดี่ยว ≤ 10MB · ไม่เกิน 100 หน้า</span>
                      </div>
                    }
                  />
                ) : (
                  <div className="max-h-[62vh] overflow-y-auto p-1">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {pages.map((p, i) => (
                        <div key={p.id} className="group relative flex flex-col rounded-md border-2 border-line bg-card p-1.5 shadow-[2px_2px_0_var(--shadow)] transition-all hover:border-accent">
                          <button
                            onClick={() => setSel(i)}
                            aria-pressed={sel === i}
                            className={cx(
                              "relative block w-full overflow-hidden rounded border bg-white",
                              sel === i ? "border-accent ring-2 ring-accent" : "border-line/30"
                            )}
                            style={{ aspectRatio: "2/3" }}
                          >
                            {p.src ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={resolveImageUrl(p.src)}
                                alt={`Page ${i + 1}`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <MangaPageSvg page={presetPage(p.preset ?? "blank", `${story.id}:${p.id}`, story.mood)} style={style} className="block h-full w-full" />
                            )}
                            <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[0.62rem] font-bold text-white">
                              #{i + 1}
                            </span>
                          </button>
                          <div className="mt-1.5 flex items-center justify-between px-0.5">
                            <span className="font-mono text-[0.65rem] font-bold text-muted truncate max-w-[65px]" title={p.label || `Page ${i + 1}`}>
                              {p.label ? p.label.replace(/\.[^/.]+$/, "") : `Page ${i + 1}`}
                            </span>
                            <div className="flex gap-1">
                              <button
                                className="grid size-5 place-items-center rounded border border-line/30 bg-paper hover:bg-paper2 disabled:opacity-30"
                                onClick={() => move(i, -1)}
                                disabled={i === 0}
                                title="Move earlier"
                              >
                                <Icon name="left" size={10} />
                              </button>
                              <button
                                className="grid size-5 place-items-center rounded border border-line/30 bg-paper hover:bg-paper2 disabled:opacity-30"
                                onClick={() => move(i, 1)}
                                disabled={i === pages.length - 1}
                                title="Move later"
                              >
                                <Icon name="right" size={10} />
                              </button>
                              <button
                                className="grid size-5 place-items-center rounded border border-line/30 bg-paper text-accent hover:bg-paper2"
                                onClick={() => { setPages(pages.filter((_, k) => k !== i)); setSel(Math.max(0, sel - 1)); }}
                                title="Delete page"
                              >
                                <Icon name="trash" size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {cur && (
                <div className="panel p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="label">Preview: Page {Math.min(sel, pages.length - 1) + 1} of {pages.length}</div>
                    <span className="font-mono text-xs text-muted">Click any page above to view</span>
                  </div>
                  <div className="mx-auto max-w-xl overflow-hidden rounded-md border-2 border-line bg-white shadow-[4px_4px_0_var(--shadow)]">
                    {cur.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveImageUrl(cur.src)} alt={`Page ${sel + 1}`} className="w-full object-contain" />
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
