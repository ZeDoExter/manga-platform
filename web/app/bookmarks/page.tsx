'use client';

import Link from 'next/link';
import { useStore, toast } from '@/lib/store';
import { STORIES, Story, resumeChapter } from '@/lib/data';
import { Bookmark, ArrowRight, BookOpen, Trash2, Compass } from 'lucide-react';

export default function BookmarksPage() {
  const { following, toggleFollow } = useStore();

  // If user hasn't followed any yet, seed with story '1' and '3' for instant rich demo
  const activeIds = following.length > 0 ? following : ['1', '3'];
  const bookmarkedStories = STORIES.filter((s) => activeIds.includes(s.id));

  const handleRemove = (story: Story) => {
    toggleFollow(story.id);
    toast(`นำ "${story.title}" ออกจากบุ๊กมาร์กแล้ว`);
  };

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 80, minHeight: '80vh' }}>
      {/* Header */}
      <div className="section-head" style={{ marginBottom: 24, borderBottom: '1px solid var(--line-subtle)', paddingBottom: 16 }}>
        <div className="section-title">
          <Bookmark className="section-title-icon" style={{ width: 22, height: 22 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>บุ๊กมาร์กของฉัน</h1>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {bookmarkedStories.length} เรื่องที่ติดตาม (FR-L2)
        </span>
      </div>

      {bookmarkedStories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-elevated)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--text-faint)' }}>
            <Bookmark style={{ width: 24, height: 24 }} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>ยังไม่มีเรื่องที่บันทึกไว้ในบุ๊กมาร์ก</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 20 }}>
            กดติดตามเรื่องที่คุณชื่นชอบเพื่อรับการแจ้งเตือนตอนใหม่และอ่านต่อได้สะดวกรวดเร็ว
          </p>
          <Link href="/" className="btn btn-primary">
            <Compass style={{ width: 15, height: 15 }} />
            <span>สำรวจเรื่องน่าสนใจ</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {bookmarkedStories.map((story) => {
            const ch = resumeChapter(story);
            return (
              <div
                key={story.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  display: 'flex',
                  gap: 14,
                  alignItems: 'center',
                  position: 'relative',
                  transition: 'all 0.18s ease',
                }}
              >
                <Link href={`/story/${story.id}`} style={{ flexShrink: 0 }}>
                  <img
                    src={story.cover}
                    alt={story.title}
                    style={{ width: 68, height: 92, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                    loading="lazy"
                  />
                </Link>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span className="badge badge-rank-n" style={{ fontSize: 10, padding: '2px 6px' }}>
                      {story.type}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      ตอนที่ {story.chapters}
                    </span>
                  </div>

                  <Link href={`/story/${story.id}`}>
                    <h3
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 4,
                      }}
                    >
                      {story.title}
                    </h3>
                  </Link>

                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 10 }}>
                    {story.author}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Link
                      href={`/read/${story.id}/${ch}`}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '5px 12px', fontSize: 11.5 }}
                    >
                      <span>อ่านตอนที่ {ch}</span>
                      <ArrowRight style={{ width: 12, height: 12 }} />
                    </Link>

                    <button
                      onClick={() => handleRemove(story)}
                      className="btn btn-ghost btn-sm"
                      style={{ width: 28, height: 28, padding: 0, color: 'var(--text-faint)' }}
                      title="นำออกจากบุ๊กมาร์ก"
                      aria-label="นำออกจากบุ๊กมาร์ก"
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
