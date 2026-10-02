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
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  UserCheck,
} from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export default function StoryPage({ params }: Props) {
  const { id } = use(params);
  const story = STORIES.find((s) => s.id === id);
  if (!story) notFound();

  const { following, toggleBookmark, unlockedChapters, buyChapter, showToast } = useStore();
  const isBookmarked = following.includes(story.id);

  const [isFollowingUploader, setIsFollowingUploader] = useState(false);

  const handleUnlock = (chapter: Chapter) => {
    buyChapter(chapter.id, chapter.priceCoins);
  };

  const handleFollowUploader = () => {
    const next = !isFollowingUploader;
    setIsFollowingUploader(next);
    showToast(next ? `ติดตามทีมแปล ${story.uploader.name} แล้ว` : `เลิกติดตามทีมแปล ${story.uploader.name} แล้ว`);
  };

  const latestChapter = story.chapters[story.chapters.length - 1];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 90 }}>
      {/* Top Breadcrumb Navigation */}
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

      {/* ========================================================================= */}
      {/* CINEMATIC HERO SECTION (INSPIRED BY DUKETOON & KOREAN MANHWA HUBS)       */}
      {/* ========================================================================= */}
      <div className="wrap">
        <div
          style={{
            position: 'relative',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            padding: '32px 28px',
            marginTop: 4,
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Ambient Blurred Artwork Glow */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${story.banner})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(36px) brightness(0.24)',
              transform: 'scale(1.12)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(15, 18, 26, 0.4) 0%, rgba(15, 18, 26, 0.96) 95%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'row',
              gap: 28,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            {/* Massive Poster Art with Glowing Aura */}
            <div style={{ flexShrink: 0, position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, rgba(255, 59, 92, 0.35), rgba(99, 102, 241, 0.25))',
                  filter: 'blur(12px)',
                  opacity: 0.8,
                  zIndex: 0,
                }}
              />
              <img
                src={story.cover}
                alt={story.title}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: 190,
                  height: 270,
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.7)',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  display: 'block',
                }}
              />
            </div>

            {/* Story Information Body */}
            <div style={{ flex: 1, minWidth: 280 }}>
              {/* Badges Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <span className="badge badge-rank-1">
                  <Flame style={{ width: 11, height: 11 }} /> มาแรง #1
                </span>
                <span className="badge badge-free">
                  {story.status}
                </span>
                <span className="badge badge-rank-n">{story.type}</span>
                <span className="badge badge-coin">
                  <Star style={{ width: 10, height: 10, fill: 'currentColor' }} />
                  <span>{story.rating}</span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                  <Eye style={{ width: 13, height: 13 }} />
                  <span>{story.views} ยอดอ่าน</span>
                </span>
              </div>

              {/* Main Title & Thai Subtitle */}
              <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#fff', lineHeight: 1.2, letterSpacing: -0.5, marginBottom: 4 }}>
                {story.title}
              </h1>
              {story.thaiTitle && (
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', marginBottom: 12 }}>
                  {story.thaiTitle}
                </div>
              )}

              {/* Authors & Artists byline */}
              <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 20, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>ผู้แต่ง: <b style={{ color: '#fff' }}>{story.author}</b></div>
                <div>ภาพประกอบ: <b style={{ color: '#fff' }}>{story.artist}</b></div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-faint)' }}>
                  <Calendar style={{ width: 12, height: 12 }} />
                  <span>อัปเดตทุกวันเสาร์</span>
                </div>
              </div>

              {/* Synopsis */}
              <p style={{ fontSize: 13.5, color: '#c3c9d6', lineHeight: 1.7, marginBottom: 20, maxWidth: 700 }}>
                {story.desc}
              </p>

              {/* Action Buttons (Read Ch 1 / Latest Ch / Bookmark / Tip) */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link className="btn btn-primary" href={`/read/${story.id}/1`}>
                  <Play style={{ width: 15, height: 15, fill: '#fff' }} />
                  <span>เริ่มอ่านตอนที่ 1 (ฟรี)</span>
                </Link>

                {latestChapter && (
                  <Link className="btn btn-secondary" href={`/read/${story.id}/${latestChapter.orderIndex}`}>
                    <BookOpen style={{ width: 15, height: 15 }} />
                    <span>ตอนล่าสุด (ตอนที่ {latestChapter.orderIndex})</span>
                  </Link>
                )}

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
                      <BookmarkCheck style={{ width: 15, height: 15 }} />
                      <span>บุ๊กมาร์กแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Bookmark style={{ width: 15, height: 15 }} />
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
                  onClick={() => showToast('ส่งเหรียญทิปให้ผู้สร้างผลงานเรียบร้อยแล้ว (FR-E2)')}
                >
                  <Heart style={{ width: 14, height: 14, fill: 'currentColor' }} />
                  <span>ทิป</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* UPLOADER / TRANSLATION STUDIO PROFILE CARD ("คนลงเป็นโปรไฟล์เท่ๆ")        */}
        {/* ========================================================================= */}
        <div
          style={{
            marginTop: 20,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          {/* Uploader Profile Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img
              src={story.uploader.avatar}
              alt={story.uploader.name}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid rgba(255, 255, 255, 0.15)',
              }}
            />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>
                  {story.uploader.name}
                </h3>
                {story.uploader.verified && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38bdf8',
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 99,
                    }}
                  >
                    <CheckCircle2 style={{ width: 11, height: 11 }} />
                    <span>ทีมแปลทางการ</span>
                  </span>
                )}
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {story.uploader.handle} • {story.uploader.followers} ผู้ติดตาม • {story.uploader.worksCount} ผลงานที่ลง
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>
                {story.uploader.bio}
              </p>
            </div>
          </div>

          {/* Follow Uploader Action */}
          <div>
            <button
              onClick={handleFollowUploader}
              className={`btn btn-sm ${isFollowingUploader ? 'btn-secondary' : 'btn-primary'}`}
              style={{ padding: '8px 18px', fontSize: 12.5 }}
            >
              {isFollowingUploader ? (
                <>
                  <UserCheck style={{ width: 14, height: 14 }} />
                  <span>กำลังติดตาม</span>
                </>
              ) : (
                <>
                  <Sparkles style={{ width: 14, height: 14 }} />
                  <span>+ ติดตามทีมแปล</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Creator Team Split Badge (FR-C3, FR-M4) */}
        <div
          style={{
            marginTop: 16,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff' }}>
              <Users style={{ width: 14, height: 14, color: 'var(--primary)' }} />
              <span>ส่วนแบ่งรายได้ทีมผู้สร้าง (FR-C3 / FR-M4)</span>
            </span>
            <span style={{ color: 'var(--coin)' }}>รวม 100%</span>
          </div>

          <div style={{ display: 'flex', height: 6, borderRadius: 99, overflow: 'hidden', background: 'var(--surface-elevated)' }}>
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

          <div style={{ display: 'flex', gap: 18, marginTop: 8, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            {story.creatorSplits.map((sp, idx) => (
              <span key={idx}>
                {sp.name} ({sp.role}): <b style={{ color: '#fff' }}>{sp.percentage}%</b>
              </span>
            ))}
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

        {/* Chapters Table */}
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
                {/* Left: Number & Title */}
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
                      อัปเดตเมื่อ {c.releaseDate}
                    </span>
                  </div>
                </div>

                {/* Right: Unlock Status / Button */}
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

        {/* Legal Disclaimer */}
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
