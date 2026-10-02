'use client';

import Link from 'next/link';
import { toast, useStore } from '@/lib/store';
import { resumeChapter } from '@/lib/data';
import type { Story } from '@/lib/data';
import { Play, Bookmark, BookmarkCheck, Heart } from 'lucide-react';

export default function StoryActions({ story }: { story: Story }) {
  const { following, toggleFollow } = useStore();
  const isFollowing = following.includes(story.id);
  const resume = resumeChapter(story);

  return (
    <div className="action-row" style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
      <Link className="btn btn-primary" href={`/read/${story.id}/${resume}`}>
        <Play style={{ width: 14, height: 14, fill: '#fff' }} />
        <span>อ่านต่อตอนที่ {resume}</span>
      </Link>

      <button
        className="btn btn-secondary"
        onClick={() => {
          toggleFollow(story.id);
          toast(
            isFollowing
              ? `นำ "${story.title}" ออกจากบุ๊กมาร์กแล้ว`
              : `เพิ่ม "${story.title}" ในบุ๊กมาร์กแล้ว (FR-L2)`,
          );
        }}
        style={{
          background: isFollowing ? 'rgba(255, 59, 92, 0.15)' : 'var(--surface-elevated)',
          color: isFollowing ? 'var(--primary)' : 'var(--text)',
          borderColor: isFollowing ? 'var(--primary)' : 'var(--line)',
        }}
      >
        {isFollowing ? (
          <>
            <BookmarkCheck style={{ width: 14, height: 14 }} />
            <span>บุ๊กมาร์กแล้ว</span>
          </>
        ) : (
          <>
            <Bookmark style={{ width: 14, height: 14 }} />
            <span>บุ๊กมาร์ก</span>
          </>
        )}
      </button>

      <button
        className="btn"
        style={{
          background: 'rgba(245, 166, 35, 0.12)',
          color: 'var(--coin)',
          border: '1px solid rgba(245, 166, 35, 0.35)',
        }}
        onClick={() => toast('ส่งเหรียญทิปให้ผู้สร้างผลงานโดยตรง (FR-E2)')}
      >
        <Heart style={{ width: 14, height: 14, fill: 'currentColor' }} />
        <span>ทิป</span>
      </button>
    </div>
  );
}
