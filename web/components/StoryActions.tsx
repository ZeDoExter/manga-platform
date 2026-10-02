'use client';

import Link from 'next/link';
import { toast, useStore } from '@/lib/store';
import { resumeChapter } from '@/lib/data';
import type { Story } from '@/lib/data';

/** ปุ่มอ่านต่อ/ติดตาม/ทิปบนหน้าเรื่อง (FR-L2/FR-E2) */
export default function StoryActions({ story }: { story: Story }) {
  const { following, toggleFollow } = useStore();
  const isFollowing = following.includes(story.id);
  const resume = resumeChapter(story);

  return (
    <div className="action-row">
      <Link className="btn btn-primary" href={`/read/${story.id}/${resume}`}>
        อ่านต่อตอนที่ {resume}
      </Link>
      <button
        className="btn btn-ghost"
        onClick={() => {
          toggleFollow(story.id);
          if (!isFollowing) toast('ติดตามแล้ว — มีตอนใหม่จะแจ้งเตือนทางอีเมล/LINE (FR-N1a)');
        }}
      >
        {isFollowing ? '✓ ติดตามแล้ว' : '+ ติดตาม'} (FR-L2)
      </button>
      <button
        className="btn btn-coin"
        onClick={() => toast('ทิปให้นักวาดโดยตรง แยกจากค่าปลดล็อก (FR-E2)')}
      >
        ♥ ทิป
      </button>
    </div>
  );
}
