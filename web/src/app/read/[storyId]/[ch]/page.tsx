'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { STORIES, Story, Chapter } from '@/lib/data';
import { useStore } from '@/lib/store';
import {
  ArrowLeft,
  ArrowUp,
  Coins,
  Check,
  Lock,
  Sliders,
  Info,
  MessageSquare,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Play,
} from 'lucide-react';

interface Props {
  params: Promise<{ storyId: string; ch: string }>;
}

export default function ReaderPage({ params }: Props) {
  const { storyId, ch } = use(params);
  const router = useRouter();
  const chNum = parseInt(ch, 10);

  const story = STORIES.find((s) => s.id === storyId);
  if (!story) notFound();

  const chapter = story.chapters.find((c) => c.orderIndex === chNum) || story.chapters[0];
  if (!chapter) notFound();

  const { coins, unlockedChapters, buyChapter, saveProgress } = useStore();

  // Controls auto-hide on scroll state
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Floating controls state (Bottom-right FAB)
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentsList, setCommentsList] = useState([
    { id: '1', user: 'นักอ่านเงา', text: 'ภาพสวย คมชัดมาก โหลดไวไม่มีสะดุดเลย', time: '10 นาทีที่แล้ว' },
    { id: '2', user: 'จอมยุทธ์นอนดึก', text: 'เนื้อเรื่องเข้มข้นขึ้นเรื่อยๆ รอตอนต่อไปไม่ไหวแล้ว', time: '1 ชม.ที่แล้ว' },
  ]);

  // Novel reader settings
  const [novelFS, setNovelFS] = useState(17);
  const [readerMode, setReaderMode] = useState<'scroll' | 'novel'>(story.type === 'novel' ? 'novel' : 'scroll');

  const isUnlocked = chapter.priceCoins === 0 || unlockedChapters.includes(chapter.id);

  const currentIndex = story.chapters.findIndex((c) => c.orderIndex === chNum);
  const prevChapter = currentIndex > 0 ? story.chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < story.chapters.length - 1 ? story.chapters[currentIndex + 1] : null;

  // Auto-hide controls on scroll down, show on scroll up
  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY <= 60) {
        setIsControlsVisible(true);
      } else if (currentY > lastScrollY.current + 8) {
        // Scrolling down -> hide controls
        setIsControlsVisible(false);
        setIsFabOpen(false);
      } else if (currentY < lastScrollY.current - 8) {
        // Scrolling up -> show controls back
        setIsControlsVisible(true);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Save progress (FR-L1)
  useEffect(() => {
    saveProgress(story.id, chapter.id, chapter.orderIndex, 75);
  }, [story.id, chapter.id]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsFabOpen(false);
  };

  const handleUnlock = () => {
    buyChapter(chapter.id, chapter.priceCoins);
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentsList((prev) => [
      { id: Date.now().toString(), user: 'คุณ (นักอ่าน)', text: commentText, time: 'เมื่อสักครู่' },
      ...prev,
    ]);
    setCommentText('');
  };

  // Locked Chapter Paywall (FR-R3, FR-M3)
  if (!isUnlocked) {
    return (
      <div style={{ padding: '80px 16px', minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center', padding: '36px 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255, 59, 92, 0.1)', color: 'var(--primary)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <Lock style={{ width: 26, height: 26 }} />
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--primary)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            ตอนที่ต้องปลดล็อก (FR-R3)
          </div>
          <h2 style={{ margin: '10px 0 6px', fontSize: 22, fontWeight: 800, color: '#fff' }}>
            {story.title}
          </h2>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
            {chapter.title}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.6, margin: '0 0 20px' }}>
            ตอนนี้ล็อกด้วยเหรียญ ตรวจสอบสิทธิ์ก่อนเสิร์ฟทุกครั้ง ปลดล็อกครั้งเดียวสามารถอ่านได้ถาวร (FR-X2)
          </p>

          <div style={{ background: 'var(--surface-elevated)', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>ราคาตอน</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: 'var(--coin)', fontSize: 17 }}>
              <Coins style={{ width: 17, height: 17 }} />
              <span>{chapter.priceCoins} เหรียญ</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" onClick={handleUnlock} style={{ width: '100%', padding: '12px 18px', fontSize: 14 }}>
              ปลดล็อกอ่านตอนนี้ (เหรียญคงเหลือ: {coins})
            </button>
            <Link className="btn btn-secondary" href={`/story/${story.id}`} style={{ width: '100%', padding: '11px 18px', fontSize: 13 }}>
              ย้อนกลับไปหน้ารายละเอียด
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pages = chapter.pages || [];

  return (
    <div className={`reader-shell ${zenMode ? 'zen-active' : ''}`}>
      {/* Top Reader Navigation Bar (auto-hides on scroll down, reveals on scroll up) */}
      {!zenMode && (
        <header
          className="reader-hud-top"
          style={{
            transform: isControlsVisible ? 'translateY(0)' : 'translateY(-100%)',
            opacity: isControlsVisible ? 1 : 0,
            pointerEvents: isControlsVisible ? 'auto' : 'none',
            transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
          }}
        >
          <Link className="reader-back-btn" href={`/story/${story.id}`}>
            <ArrowLeft style={{ width: 15, height: 15 }} />
            <span>กลับ</span>
          </Link>

          <div className="reader-title-box">
            <span className="reader-story-name">{story.title}</span>
            <span className="reader-chapter-name">{chapter.title}</span>
          </div>

          <div className="reader-mode-seg">
            <button
              className={`reader-mode-btn ${readerMode === 'scroll' ? 'active' : ''}`}
              onClick={() => setReaderMode('scroll')}
            >
              เลื่อนยาว
            </button>
            <button
              className={`reader-mode-btn ${readerMode === 'novel' ? 'active' : ''}`}
              onClick={() => setReaderMode('novel')}
            >
              นิยาย
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, paddingBottom: 100 }}>
        {readerMode === 'novel' ? (
          /* NOVEL TEXT VIEWER */
          <div className="novel-reading-wrap">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>ขนาดฟอนต์</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setNovelFS((s) => Math.max(14, s - 1))}
                  style={{ width: 28, height: 28, padding: 0 }}
                >
                  -
                </button>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{novelFS}px</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setNovelFS((s) => Math.min(26, s + 1))}
                  style={{ width: 28, height: 28, padding: 0 }}
                >
                  +
                </button>
              </div>
            </div>

            <h2 className="novel-headline">{chapter.title}</h2>
            <div style={{ fontSize: novelFS, lineHeight: 1.85 }}>
              {chapter.novelText ? (
                chapter.novelText.split('\n\n').map((p, idx) => (
                  <p key={idx} className="novel-paragraph">
                    {p}
                  </p>
                ))
              ) : (
                <p className="novel-paragraph">
                  สายลมหนาวพัดผ่านยอดสนโบราณจนกิ่งไม้สั่นไหวอย่างแผ่วเบา เขาเปิดตามองเพดานหินสูงตระหง่าน บาดแผลจากคมดาบเมื่อครั้งศึกที่หน้าด่านยังคงทิ้งรอยชาไว้ที่หัวไหล่ขวา แต่สิ่งที่เจ็บปวดยิ่งกว่าคือคำสั่งสุดท้ายของสำนัก
                </p>
              )}
            </div>
          </div>
        ) : (
          /* MANGA WEBTOON VIEWER */
          <div className="manga-scroll-viewport">
            {pages.map((imgUrl, i) => (
              <img
                key={i}
                src={imgUrl}
                alt={`หน้า ${i + 1}`}
                className="manga-image-page"
                loading="lazy"
              />
            ))}
          </div>
        )}

        {/* Footer Navigation */}
        <div style={{ maxWidth: 820, margin: '40px auto 0', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {prevChapter ? (
            <Link
              href={`/read/${story.id}/${prevChapter.orderIndex}`}
              className="btn btn-secondary"
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
              <span>ตอนก่อนหน้า</span>
            </Link>
          ) : (
            <div />
          )}

          {nextChapter ? (
            <Link
              href={`/read/${story.id}/${nextChapter.orderIndex}`}
              className="btn btn-primary"
            >
              <span>ตอนถัดไป</span>
              <ChevronRight style={{ width: 16, height: 16 }} />
            </Link>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>ตอนล่าสุดแล้ว</span>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* FLOATING ACTION CONTROL DOCK (FAB AT BOTTOM-RIGHT)                        */}
      {/* ========================================================================= */}
      <aside
        className="reader-fab-dock-pos"
        style={{
          transform: isControlsVisible && !zenMode ? 'translateY(0) scale(1)' : 'translateY(80px) scale(0.85)',
          opacity: isControlsVisible && !zenMode ? 1 : 0,
          pointerEvents: isControlsVisible && !zenMode ? 'auto' : 'none',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
        }}
      >
        {/* Speed Dial Menu expanding UPWARDS */}
        {isFabOpen && (
          <div className="fab-vertical-list">
            {/* 1. ขึ้นบนสุด */}
            <button onClick={scrollToTop} className="fab-action-item" title="ขึ้นบนสุด">
              <ArrowUp style={{ width: 17, height: 17 }} />
              <span className="fab-tooltip">ขึ้นบนสุด</span>
            </button>

            {/* 2. รายละเอียดตอน / เรื่อง */}
            <Link href={`/story/${story.id}`} className="fab-action-item" title="รายละเอียดเรื่อง">
              <Info style={{ width: 17, height: 17 }} />
              <span className="fab-tooltip">รายละเอียดตอน</span>
            </Link>

            {/* 3. คอมเมนต์ */}
            <button onClick={() => setIsCommentsOpen(!isCommentsOpen)} className="fab-action-item" title="คอมเมนต์">
              <MessageSquare style={{ width: 17, height: 17 }} />
              <span className="fab-tooltip">คอมเมนต์</span>
            </button>

            {/* 4. ปิดแถบอื่นๆ (Zen Mode) */}
            <button
              onClick={() => setZenMode(!zenMode)}
              className={`fab-action-item ${zenMode ? 'active' : ''}`}
              title="ปิดแถบอื่นๆ"
            >
              {zenMode ? <Eye style={{ width: 17, height: 17 }} /> : <EyeOff style={{ width: 17, height: 17 }} />}
              <span className="fab-tooltip">{zenMode ? 'แสดงแถบ' : 'ปิดแถบเมนู'}</span>
            </button>

            {/* 5. ตอนถัดไป */}
            {nextChapter ? (
              <Link href={`/read/${story.id}/${nextChapter.orderIndex}`} className="fab-action-item" title="ตอนถัดไป">
                <ChevronRight style={{ width: 17, height: 17 }} />
                <span className="fab-tooltip">ตอนถัดไป</span>
              </Link>
            ) : (
              <button disabled className="fab-action-item disabled" title="ไม่มีตอนถัดไป">
                <ChevronRight style={{ width: 17, height: 17 }} />
                <span className="fab-tooltip">ตอนล่าสุดแล้ว</span>
              </button>
            )}

            {/* 6. ตอนก่อนหน้า */}
            {prevChapter ? (
              <Link href={`/read/${story.id}/${prevChapter.orderIndex}`} className="fab-action-item" title="ตอนก่อนหน้า">
                <ChevronLeft style={{ width: 17, height: 17 }} />
                <span className="fab-tooltip">ตอนก่อนหน้า</span>
              </Link>
            ) : (
              <button disabled className="fab-action-item disabled" title="ไม่มีตอนก่อนหน้า">
                <ChevronLeft style={{ width: 17, height: 17 }} />
                <span className="fab-tooltip">ตอนแรกสุด</span>
              </button>
            )}
          </div>
        )}

        {/* Primary FAB Trigger Button */}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`fab-main-trigger ${isFabOpen ? 'open' : ''}`}
          aria-label="เมนูลัดการอ่าน"
          title="เมนูลัดการอ่าน"
        >
          {isFabOpen ? <X style={{ width: 22, height: 22 }} /> : <Sliders style={{ width: 21, height: 21 }} />}
        </button>
      </aside>

      {/* Chapter Comments Sliding Drawer */}
      {isCommentsOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setIsCommentsOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              height: '100%',
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare style={{ width: 18, height: 18, color: 'var(--primary)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>คอมเมนต์ ({chapter.title})</h3>
              </div>
              <button onClick={() => setIsCommentsOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {commentsList.map((c) => (
                <div key={c.id} style={{ padding: '12px 14px', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <b style={{ fontSize: 13, color: '#fff' }}>{c.user}</b>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{c.time}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {c.text}
                  </p>
                </div>
              ))}
            </div>

            <form onSubmit={handlePostComment} style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="เขียนคอมเมนต์แลกเปลี่ยนความคิดเห็น..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{ flex: 1, padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', border: '1px solid var(--border)', color: '#fff', fontSize: 13, outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary btn-sm">
                <Send style={{ width: 14, height: 14 }} /> ส่ง
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
