"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import type { Mood, Motif, PagePreset, Story, StudioChapter, StudioStory } from "@/lib/types";
import { isVisual } from "@/lib/types";
import { defaultPages, studioContent } from "@/lib/content";
import { defaultChapterPrice } from "@/lib/economy";
import { cx, uid } from "@/lib/util";
import { useApp } from "@/lib/store";
import { MangaReader } from "../readers/MangaReader";
import { NovelReader } from "../readers/NovelReader";
import { Empty, Icon } from "../ui";

export const PALETTES: [string, string, string][] = [
  ["#0b1033", "#3a46c9", "#ffd27a"],
  ["#2a0a08", "#e2461f", "#ffc46b"],
  ["#13211f", "#3f7a6d", "#e9d9a6"],
  ["#09090f", "#00e5c7", "#ff2e88"],
  ["#f6e7cb", "#d4a017", "#3b2a1a"],
  ["#240b36", "#c31432", "#f9d29d"],
  ["#062a3a", "#1aa6b7", "#ffe6a3"],
  ["#1c1c1c", "#6fbf73", "#f4d35e"],
];
export const PRESET_LABEL: Record<PagePreset, string> = { action: "Action", dialogue: "Dialogue", establishing: "Establishing", closeup: "Close-ups", splash: "Splash", blank: "Blank frames" };

export function CreatorGate({ children }: { children: ReactNode }) {
  const { account } = useApp();
  if (account.role !== "creator")
    return (
      <div className="wrap py-20">
        <Empty
          icon="pen"
          title="The Studio is for Uploader accounts"
          text={`You're signed in as ${account.name} (${account.role}). Sign in with a creator account to create stories, write chapters, schedule releases and open the Analytics Lab.`}
          action={<Link href="/login" className="btn btn-accent">Sign in as creator</Link>}
        />
      </div>
    );
  return <>{children}</>;
}

export function fileToDataUrl(file: File, maxW = 640, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("read failed"));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const sc = Math.min(1, maxW / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * sc);
        c.height = Math.round(img.height * sc);
        c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = fr.result as string;
    };
    fr.readAsDataURL(file);
  });
}

export function newChapter(s: StudioStory, status: StudioChapter["status"] = "draft"): StudioChapter {
  const number = s.chapters.reduce((m, c) => Math.max(m, c.number), 0) + 1;
  const visual = isVisual(s.type);
  const published = s.chapters.filter((c) => c.status === "published").length;
  return {
    id: uid("ch"),
    number,
    title: `Chapter ${number}`,
    status,
    updatedAt: Date.now(),
    text: visual ? undefined : "",
    pages: visual ? defaultPages(4, uid("p")) : undefined,
    priceCoins: defaultChapterPrice(s.type, number, Math.max(published, number)),
  };
}

export function coverStory(s: StudioStory): Pick<Story, "id" | "title" | "alt" | "type" | "palette" | "motif" | "cover"> {
  return { id: s.id, title: s.title, alt: "", type: s.type, palette: s.palette, motif: s.motif, cover: s.coverImage };
}

export function StatusChip({ status }: { status: string }) {
  const m: Record<string, string> = {
    published: "!border-line !bg-mint !text-[#15120f]",
    scheduled: "!border-line !bg-accent2 !text-white",
    draft: "!border-line !bg-hl !text-[#15120f]",
    unpublished: "!border-line !bg-paper2",
  };
  return <span className={cx("chip", m[status])}>{status}</span>;
}

export function PreviewOverlay({ story, chapter, onClose }: { story: StudioStory; chapter: StudioChapter; onClose: () => void }) {
  const merged = useMemo(() => ({ ...story, chapters: story.chapters.map((c) => (c.id === chapter.id ? chapter : c)) }), [story, chapter]);
  const content = useMemo(() => studioContent(merged, chapter.id), [merged, chapter.id]);
  if (!content) return null;
  const rs = { id: story.id, title: story.title, type: story.type, mood: story.mood as Mood, palette: story.palette };
  const nav = { count: 1, numbers: [chapter.number], titleOf: () => chapter.title };
  if (content.kind === "manga") {
    const pages = content.pages.length ? content.pages : [{ key: "empty", spec: undefined }];
    return <MangaReader story={rs} chapter={chapter.number} title={chapter.title} nav={nav} content={{ ...content, pages }} preview onClose={onClose} z={210} />;
  }
  const paragraphs = content.paragraphs.length ? content.paragraphs : ["*This chapter is empty — write something in the editor, then preview again.*"];
  return <NovelReader story={rs} chapter={chapter.number} title={chapter.title} nav={nav} paragraphs={paragraphs} preview onClose={onClose} z={210} />;
}

export const MOTIF_PICKS: Motif[] = ["moon", "blade", "flame", "bell", "needle", "eye", "lighthouse", "wave", "cloud", "bowl", "note", "flower", "key", "gear", "wolf", "crane", "void", "eclipse", "bone", "train", "airship", "tower", "sun", "city"];

export function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label flex justify-between">
        <span>{label}{required && <span className="ml-1 text-accent font-extrabold">*</span>}</span>
        {hint && <span className="normal-case tracking-normal">{hint}</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function SimBanner({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border-2 border-dashed border-line/60 bg-hl/25 px-3 py-2 text-xs font-semibold">
      <Icon name="zap" size={14} className="mt-0.5 shrink-0" />
      <span>{children ?? "Simulation: publishing and analytics are mock features. Everything you create is saved in this browser only."}</span>
    </div>
  );
}
