"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Mood, StoryType } from "@/lib/types";
import { Icon, Modal } from "../ui";

export interface ReaderStory {
  id: string;
  title: string;
  type: StoryType;
  mood: Mood;
  palette: [string, string, string];
}
export interface ChapterNav {
  count: number;
  numbers?: number[];
  titleOf: (n: number) => string;
}
export interface ReaderProps {
  story: ReaderStory;
  chapter: number;
  title: string;
  nav: ChapterNav;
  preview?: boolean;
  onClose?: () => void;
  z?: number;
}

export function useFullscreen() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const h = () => setOn(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  const toggle = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);
  return { on, toggle };
}

export function neighbors(nav: ChapterNav, chapter: number): { prev?: number; next?: number } {
  if (nav.numbers) {
    const s = [...nav.numbers].sort((a, b) => a - b);
    const i = s.indexOf(chapter);
    return { prev: s[i - 1], next: s[i + 1] };
  }
  return { prev: chapter > 1 ? chapter - 1 : undefined, next: chapter < nav.count ? chapter + 1 : undefined };
}

export function ChapterPicker({ open, onClose, nav, chapter, storyId, preview }: { open: boolean; onClose: () => void; nav: ChapterNav; chapter: number; storyId: string; preview?: boolean }) {
  const [jump, setJump] = useState("");
  const list = nav.numbers ? [...nav.numbers].sort((a, b) => b - a) : (() => {
    const lo = Math.max(1, chapter - 20);
    const hi = Math.min(nav.count, chapter + 20);
    return Array.from({ length: hi - lo + 1 }, (_, i) => hi - i);
  })();
  const go = () => {
    const n = parseInt(jump, 10);
    if (n >= 1 && n <= nav.count) window.location.assign(`/read/${storyId}/${n}`);
  };
  return (
    <Modal open={open} onClose={onClose} title="Chapters">
      {!preview && !nav.numbers && (
        <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); go(); }}>
          <input className="field" inputMode="numeric" placeholder={`Jump to chapter (1–${nav.count})`} value={jump} onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))} aria-label="Chapter number" />
          <button className="btn" type="submit">Go</button>
        </form>
      )}
      <ul className="scroll-y max-h-[50vh] space-y-1 pr-1">
        {list.map((n) => {
          const cur = n === chapter;
          const inner = (
            <>
              <span className="grid size-9 shrink-0 place-items-center rounded border-2 border-line font-display text-xs">{n}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{nav.titleOf(n)}</span>
              {cur && <span className="chip chip-on">reading</span>}
            </>
          );
          return (
            <li key={n}>
              {preview ? (
                <div className="flex items-center gap-3 rounded-md border-2 border-transparent p-1.5">{inner}</div>
              ) : (
                <Link href={`/read/${storyId}/${n}`} onClick={onClose} className={`flex items-center gap-3 rounded-md border-2 p-1.5 hover:bg-paper2 ${cur ? "border-line bg-paper2" : "border-transparent"}`}>{inner}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
