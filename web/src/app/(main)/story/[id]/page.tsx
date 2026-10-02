'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { STORIES, Story, Chapter } from '@/lib/data';
import { useStore } from '@/lib/store';
import {
  ArrowLeft,
  Flame,
  Star,
  Eye,
  BookOpen,
  Users,
  Coins,
  ShieldAlert,
  Play,
  Bookmark,
  BookmarkCheck,
  Heart,
  Check,
  Lock,
} from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export default function StoryPage({ params }: Props) {
  const { id } = use(params);
  const story = STORIES.find((s) => s.id === id);
  if (!story) notFound();

  const { following, toggleBookmark, unlockedChapters, buyChapter, coins } = useStore();
  const isBookmarked = following.includes(story.id);

  const handleUnlock = (chapter: Chapter) => {
    buyChapter(chapter.id, chapter.priceCoins);
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      {/* Back button */}
      <div className="wrap" style={{ paddingTop: 18, paddingBottom: 10 }}>
        <Link
          href="/"
          className="btn btn-ghost btn-sm"
          style={{ padding: '6px 12px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          <span>กลับหน้าแรก</span>
        </Link>
      </div>

      {/* Hero Header Banner */}
      <div className="wrap">
        <div
          style={{
            position: 'relative',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            padding: '28px 24px',
            marginTop: 4,
          }}
        >
          {/* Subtle background glow */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${story.banner})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(30px) brightness(0.2)',
              transform: 'scale(1.1)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(15, 18, 26, 0.4) 0%, rgba(15, 18, 26, 0.95) 100%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'row',
              gap: 24,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            {/* High-res Cover Art */}
            <div style={{ flexShrink: 0 }}>
              <img
                src={story.cover}
                alt={story.title}
                style={{
                  width: 160,
                  height: 220,
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
                  border: '1px solid var(--border)',
                  display: 'block',
                }}
              />
            </div>

            {/* Story Metadata Body */}
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <span className="badge badge-rank-1">
                  <Flame style={{ width: 11, height: 11 }} /> มาแรง
                </span>
                <span className="badge badge-rank-n">{story.type}</span>
                <span className="badge badge-rank-n">{story.status}</span>
                <span className="badge badge-coin">
                  <Star style={{ width: 10, height: 10, fill: 'currentColor' }} />
                  {story.rating}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                  <Eye style={{ width: 12, height: 12 }} />
                  {story.views} ยอดอ่าน
                </span>
              </div>

              <h1 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: 8 }}>
                {story.title}
              </h1>

              <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 16, marginBottom: 12 }}>
                <span>ผู้แต่ง: <b style={{ color: 'var(--text)' }}>{story.author}</b></span>
                <span>ผู้วาด: <b style={{ color: 'var(--text)' }}>{story.artist}</b></span>
              </div>

              <p style={{ fontSize: 13.5, color: '#c3c9d6', lineHeight: 1.65, marginBottom: 18, maxWidth: 680 }}>
                {story.desc}
              </p>

              {/* Action Buttons (Read / Bookmark / Tip) */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link className="btn btn-primary" href={`/read/${story.id}/1`}>
                  <Play style={{ width: 14, height: 14, fill: '#fff' }} />
                  <span>เริ่มอ่านตอนที่ 1</span>
                </Link>

                <button
                  className="btn btn-secondary"
                  onClick={() => toggleBookmark(story.id)}
                  style={{
                    background: isBookmarked ? 'rgba(255, 59, 92, 0.15)' : 'var(--surface-elevated)',
                    color: isBookmarked ? 'var(--primary)' : 'var(--text)',
                    borderColor: isBookmarked ? 'var(--primary)' : 'var(--border)',
                  }}
                >
                  {isBookmarked ? (
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
                  onClick={() => alert(`ส่งเหรียญทิปให้ทีมผู้สร้าง (${story.author} / ${story.artist}) เรียบร้อยแล้ว (FR-E2)`)}
                >
                  <Heart style={{ width: 14, height: 14, fill: 'currentColor' }} />
                  <span>ทิปผู้สร้าง</span>
                </button>
              </div>

              {/* Creator Team Split Badge (FR-C3, FR-M4) */}
              <div
                style={{
                  marginTop: 20,
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  maxWidth: 520,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff' }}>
                    <Users style={{ width: 14, height: 14, color: 'var(--primary)' }} />
                    <span>ส่วนแบ่งรายได้ทีมผู้สร้าง (FR-C3)</span>
                  </span>
                  <span style={{ color: 'var(--coin)' }}>รวม 100%</span>
                </div>

                <div style={{ display: 'flex', height: 6, borderRadius: 99, overflow: 'hidden', background: 'var(--surface)' }}>
                  {story.creatorSplits.map((sp, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: `${sp.percentage}%`,
                        background: idx === 0 ? 'var(--primary)' : 'var(--coin)',
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {story.creatorSplits.map((sp, idx) => (
                    <span key={idx}>
                      {sp.name} ({sp.role}): <b style={{ color: '#fff' }}>{sp.percentage}%</b>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div style={{ display: 'flex', gap: 6, marginTop: 32, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-elevated)',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <BookOpen style={{ width: 15, height: 15, color: 'var(--primary)' }} />
            <span>ตอนทั้งหมด ({story.chapters.length})</span>
          </button>
        </div>

        {/* Chapters List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {story.chapters.map((c) => {
            const isUnlocked = c.priceCoins === 0 || unlockedChapters.includes(c.id);

            return (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  gap: 14,
                }}
              >
                {/* Left */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 800,
                      fontSize: 13,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {c.orderIndex}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <b
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: '#fff',
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.title}
                    </b>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      อัปเดต {c.releaseDate}
                    </span>
                  </div>
                </div>

                {/* Right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {isUnlocked ? (
                    <span className="badge badge-free">
                      <Check style={{ width: 11, height: 11 }} /> ปลดแล้ว
                    </span>
                  ) : (
                    <>
                      <span className="badge badge-coin">
                        <Coins style={{ width: 11, height: 11 }} /> {c.priceCoins}
                      </span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleUnlock(c)}
                        style={{ fontSize: 11.5, padding: '5px 10px' }}
                      >
                        ปลดล็อก
                      </button>
                    </>
                  )}

                  <Link
                    className="btn btn-primary btn-sm"
                    href={`/read/${story.id}/${c.orderIndex}`}
                    style={{ fontSize: 11.5, padding: '5px 12px' }}
                  >
                    <Play style={{ width: 11, height: 11, fill: '#fff' }} />
                    <span>อ่าน</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert style={{ width: 16, height: 16, color: 'var(--text-faint)', flexShrink: 0 }} />
          <span>
            ผลงานนี้อัปโหลดพร้อมคำรับรองสิทธิ์ (FR-U3) • หากมีการแจ้งละเมิด ระบบจะระงับการเข้าถึงและคืนเหรียญให้ผู้ซื้ออัตโนมัติ (FR-M6)
          </span>
        </div>
      </div>
    </div>
  );
}
