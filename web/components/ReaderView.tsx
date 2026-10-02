'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Chapter, Story } from '@/lib/data';
import { toast, useStore } from '@/lib/store';
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
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface Props {
  story: Story;
  chapter: Chapter;
  prev: number | null;
  next: number | null;
}

export default function ReaderView({ story, chapter, prev, next }: Props) {
  const { coins, has, buy, novelFS, setNovelFS, readerMode, setReaderMode } = useStore();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  // Floating controls state (Bottom-right FAB)
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  const key = `${story.id}#${chapter.n}`;
  const entitled = chapter.price === 0 || has(key);
  const isNovelView = story.type === 'นิยาย' || readerMode === 'novel';

  // Reading position auto-save with debounce (FR-L1, NFR-Perf-2)
  useEffect(() => {
    if (!entitled) return;
    clearTimeout(saveTimer.current ?? undefined);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(
          `manga-pos-${story.id}`,
          JSON.stringify({ ch: chapter.n, mode: readerMode, at: Date.now() }),
        );
        setSavedAt(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
      } catch {
        /* ignore */
      }
    }, 800);

    const flush = () => {
      try {
        localStorage.setItem(`manga-pos-${story.id}`, JSON.stringify({ ch: chapter.n, at: Date.now() }));
      } catch {
        /* ignore */
      }
    };

    window.addEventListener('beforeunload', flush);
    return () => {
      clearTimeout(saveTimer.current ?? undefined);
      window.removeEventListener('beforeunload', flush);
    };
  }, [story.id, chapter.n, readerMode, entitled]);

  const buyChapter = () => {
    const ok = buy(key, chapter.price);
    if (!ok) {
      toast('เหรียญไม่เพียงพอ — กรุณาเติมเหรียญก่อนทำรายการ');
      return;
    }
    toast(`ปลดล็อกสำเร็จ หัก ${chapter.price} เหรียญ (ACID Transaction)`);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsFabOpen(false);
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    toast(`ส่งคอมเมนต์สำเร็จ: "${commentText.slice(0, 30)}..."`);
    setCommentText('');
  };

  // Locked Chapter Paywall (FR-R3, FR-M3)
  if (!entitled) {
    return (
      <div style={{ padding: '80px 16px', minHeight: '80vh', display: 'grid', placeItems: 'center' }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center', padding: '36px 24px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)' }}>
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

          <div style={{ background: 'var(--surface-elevated)', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>ราคาตอน</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: 'var(--coin)', fontSize: 17 }}>
              <Coins style={{ width: 17, height: 17 }} />
              <span>{chapter.price} เหรียญ</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" onClick={buyChapter} style={{ width: '100%', padding: '12px 18px', fontSize: 14 }}>
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

  const pages = chapter.pages ?? [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=900&auto=format&fit=crop&q=80',
  ];

  return (
    <div className={`reader-shell ${zenMode ? 'zen-active' : ''}`}>
      {/* Top Reader Navigation Bar (hidden in Zen Mode) */}
      {!zenMode && (
        <header className="reader-hud-top">
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

      {/* Main Content Viewport */}
      <main style={{ flex: 1, paddingBottom: 100 }}>
        {isNovelView ? (
          /* NOVEL TEXT VIEWER */
          <div className="novel-reading-wrap">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>ขนาดฟอนต์</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setNovelFS(Math.max(14, novelFS - 1))}
                  style={{ width: 28, height: 28, padding: 0 }}
                >
                  -
                </button>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{novelFS}px</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setNovelFS(Math.min(26, novelFS + 1))}
                  style={{ width: 28, height: 28, padding: 0 }}
                >
                  +
                </button>
              </div>
            </div>

            <h2 className="novel-headline">{chapter.title}</h2>
            <div style={{ fontSize: novelFS, lineHeight: 1.8 }}>
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

        {/* Saved Note */}
        {!zenMode && (
          <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 12, marginTop: 24 }}>
            {savedAt ? `บันทึกตำแหน่งล่าสุดเมื่อ ${savedAt} • ` : ''}
            ซิงค์ประวัติข้ามอุปกรณ์อัตโนมัติ (FR-L1)
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* FLOATING ACTION CONTROL DOCK (FAB AT BOTTOM-RIGHT)                        */}
      {/* ========================================================================= */}
      <aside className="reader-fab-dock-pos">
        {/* Speed Dial Menu expanding UPWARDS */}
        {isFabOpen && (
          <div className="fab-vertical-list">
            {/* 1. เลื่อนขึ้นบนสุด */}
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
              onClick={() => {
                setZenMode(!zenMode);
                toast(zenMode ? 'แสดงแถบเมนูตามปกติ' : 'เปิดโหมดไร้สิ่งรบกวน (Zen Mode)');
              }}
              className={`fab-action-item ${zenMode ? 'active' : ''}`}
              title="ปิดแถบอื่นๆ"
            >
              {zenMode ? <Eye style={{ width: 17, height: 17 }} /> : <EyeOff style={{ width: 17, height: 17 }} />}
              <span className="fab-tooltip">{zenMode ? 'แสดงแถบ' : 'ปิดแถบเมนู'}</span>
            </button>

            {/* 5. ตอนถัดไป */}
            {next ? (
              <Link href={`/read/${story.id}/${next}`} className="fab-action-item" title="ตอนถัดไป">
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
            {prev ? (
              <Link href={`/read/${story.id}/${prev}`} className="fab-action-item" title="ตอนก่อนหน้า">
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
              borderLeft: '1px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare style={{ width: 18, height: 18, color: 'var(--primary)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>คอมเมนต์ ({chapter.title})</h3>
              </div>
              <button onClick={() => setIsCommentsOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '12px 14px', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <b style={{ fontSize: 13, color: '#fff' }}>นักอ่านมือทอง</b>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>10 นาทีที่แล้ว</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  ภาพคมชัดมาก โหลดไวไม่มีสะดุดเลย คุ้มค่าเหรียญมาก
                </p>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <b style={{ fontSize: 13, color: '#fff' }}>จอมยุทธ์นอนดึก</b>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>1 ชม.ที่แล้ว</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  เนื้อเรื่องเข้มข้นขึ้นเรื่อยๆ รอตอนต่อไปไม่ไหวแล้ว
                </p>
              </div>
            </div>

            <form onSubmit={handlePostComment} style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="เขียนคอมเมนต์พูดคุยเกี่ยวกับตอนนี้..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{ flex: 1, padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', border: '1px solid var(--line)', color: '#fff', fontSize: 13, outline: 'none' }}
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
