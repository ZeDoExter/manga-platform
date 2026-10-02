'use client';

import Link from 'next/link';
import { chapterKey } from '@/lib/data';
import type { Chapter, Story } from '@/lib/data';
import { toast, useStore } from '@/lib/store';

/** รายการตอน + ปลดล็อกด้วยเหรียญ (mock ของ FR-M3: debit + grant + earnings ใน TX เดียว) */
export default function ChapterList({ story, chapters }: { story: Story; chapters: Chapter[] }) {
  const { coins, has, buy } = useStore();

  const unlock = (ch: Chapter) => {
    const key = chapterKey(story.id, ch.n);
    if (has(key)) return;
    const ok = buy(key, ch.price);
    if (!ok) {
      toast('เหรียญไม่พอ — เติมก่อน (FR-M1)');
      return;
    }
    toast(`ปลดล็อกตอนที่ ${ch.n} · <b>−${ch.price}</b> เหรียญ · ลง ledger + แบ่งทีมวาด (FR-M3/M4) · คงเหลือ ${coins - ch.price}`);
  };

  return (
    <div id="chapters">
      {chapters.map((c) => {
        const owned = c.price === 0 || has(chapterKey(story.id, c.n));
        return (
          <div className="ch-row" key={c.n}>
            <div className="ch-num">{c.n}</div>
            <div>
              <b>{c.title}</b>
              <span className="sub">
                {c.kind} · 2 วันที่แล้ว{c.freeIn ? ` · ${c.freeIn}` : ''}
              </span>
            </div>
            <div className="right">
              {owned ? (
                <span className="lock owned">✓ เป็นเจ้าของ</span>
              ) : (
                <>
                  <span className="lock coin">◉ {c.price}</span>
                  <button className="btn btn-primary btn-sm" onClick={() => unlock(c)}>
                    ปลดล็อก
                  </button>
                </>
              )}
              <Link className="btn btn-ghost btn-sm" href={`/read/${story.id}/${c.n}`}>
                อ่าน
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
