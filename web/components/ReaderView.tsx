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
      toast('เหรียญไม่เพียงพอ — กรุณาเติมเหรียญผ่านระบบก่อนทำรายการ (FR-PAY1)');
      return;
    }
    toast(`ปลดล็อกสำเร็จ หัก ${chapter.price} เหรียญ (ระบบบันทึกธุรกรรมแบบ ACID / FR-M3)`);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsFabOpen(false);
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    toast(`โพสต์คอมเมนต์สำเร็จ: "${commentText.slice(0, 30)}..."`);
    setCommentText('');
  };

  // Locked Chapter Paywall (FR-R3, FR-M3)
  if (!entitled) {
    return (
      <div className="page-col" style={{ padding: '60px 16px', minHeight: '80vh', display: 'grid', placeItems: 'center' }}>
        <div className="paywall" style={{ maxWidth: 440, width: '100%', textAlign: 'center', padding: '36px 24px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(229,72,77,0.1)', color: 'var(--hanko)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <Lock style={{ width: 26, height: 26 }} />
          </div>
          <div className="eyebrow" style={{ color: 'var(--hanko)', letterSpacing: 1.2 }}>ตอนพิเศษที่ต้องปลดล็อก (FR-R3)</div>
          <h2 style={{ fontFamily: 'var(--font-d)', margin: '10px 0 8px', fontSize: 22 }}>
            {story.title}
          </h2>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
            {chapter.title}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6, margin: '0 0 20px' }}>
            ตอนนี้ล็อกด้วยเหรียญ ตรวจสิทธิ์การเข้าถึงก่อนเสิร์ฟทุกครั้ง ปลดล็อกครั้งเดียวสามารถอ่านได้ถาวร (FR-X2)
          </p>

          <div style={{ background: 'var(--surface2)', padding: '14px 18px', borderRadius: 'var(--r-md)', border: '1px solid var(--line2)', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>ราคาตอน</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--coin)', fontSize: 17 }}>
              <Coins style={{ width: 17, height: 17 }} />
              <span>{chapter.price} เหรียญ</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" onClick={buyChapter} style={{ width: '100%', padding: '12px 18px', fontSize: 14, fontWeight: 700 }}>
              ปลดล็อกอ่านตอนนี้ (เหรียญคงเหลือ: {coins})
            </button>
            <Link className="btn btn-ghost" href={`/story/${story.id}`} style={{ width: '100%', padding: '10px 18px', fontSize: 13 }}>
              ย้อนกลับไปหน้ารายละเอียดเรื่อง
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
    <div className={`reader-container ${zenMode ? 'zen-active' : ''}`}>
      {/* Top Reader Navigation Bar (hidden when Zen Mode is active) */}
      {!zenMode && (
        <header className="reader-bar">
          <div className="reader-bar-in">
            <Link className="icon-btn" href={`/story/${story.id}`} aria-label="กลับไปหน้ารายละเอียด">
              <ArrowLeft style={{ width: 17, height: 17 }} />
            </Link>
            <div style={{ minWidth: 0 }}>
              <b
                style={{
                  fontSize: 13.5,
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {story.title} · {chapter.title}
              </b>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                ตรวจสอบสิทธิ์เรียบร้อย (FR-R3) · เสิร์ฟผ่าน Signed Link (FR-R4)
              </span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="seg">
                <button className={readerMode === 'scroll' ? 'on' : ''} onClick={() => setReaderMode('scroll')}>
                  เลื่อนยาว
                </button>
                <button className={readerMode === 'paged' ? 'on' : ''} onClick={() => setReaderMode('paged')}>
                  ทีละหน้า
                </button>
                <button className={readerMode === 'novel' ? 'on' : ''} onClick={() => setReaderMode('novel')}>
                  นิยาย
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Reading Flow */}
      <main className="page-col" style={{ paddingTop: zenMode ? 16 : 24, paddingBottom: 100 }}>
        {/* Banner Ad for users */}
        {!zenMode && (
          <div className="ad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Sparkles style={{ width: 15, height: 15, color: 'var(--coin)' }} />
            <span>โฆษณาด้านบนสำหรับสมาชิกระดับทั่วไป (ผู้ใช้ VIP และ Admin ไม่มีโฆษณา / FR-X3)</span>
          </div>
        )}

        {/* Content Body */}
        {isNovelView ? (
          /* NOVEL TEXT VIEWER */
          <>
            <div className="novel-ctl" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', marginBottom: 20 }}>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>ขนาดฟอนต์</span>
              <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setNovelFS(Math.max(14, novelFS - 1))} aria-label="ลดฟอนต์">
                −
              </button>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{novelFS}px</span>
              <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setNovelFS(Math.min(26, novelFS + 1))} aria-label="เพิ่มฟอนต์">
                +
              </button>
              <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--faint)' }}>บันทึกตำแหน่งอัตโนมัติ (FR-L1)</span>
            </div>
            <article className="novel" style={{ fontSize: novelFS, lineHeight: 1.8, padding: '24px 20px', background: 'var(--surface)', border: '1px solid var(--line2)', borderRadius: 'var(--r-md)' }}>
              <h2 style={{ fontFamily: 'var(--font-d)', marginTop: 0, fontSize: 22 }}>
                {chapter.title}
              </h2>
              <div style={{ whiteSpace: 'pre-line' }}>
                {chapter.novelText ?? `สายลมหนาวพัดผ่านยอดสนโบราณจนกิ่งไม้สั่นไหวอย่างแผ่วเบา

เขาเปิดตามองเพดานหินสูงตระหง่าน บาดแผลจากคมดาบเมื่อครั้งศึกที่หน้าด่านยังคงทิ้งรอยชาไว้ที่หัวไหล่ขวา แต่สิ่งที่เจ็บปวดยิ่งกว่าคือคำสั่งสุดท้ายของสำนัก

"เจ้าต้องมีชีวิตอยู่ต่อไป" เสียงอันแผ่วเบาของอาจารย์ดั่งยังก้องอยู่ในม่านหมอก

ข้างนอกเสียงระฆังประจำวิหารดังเหง่งหง่างสามครา บ่งบอกว่าผู้ตรวจการของราชสำนักได้เดินทางมาถึงเชิงผาแล้ว เขาคว้าด้ามดาบสีดำสนิทที่วางข้างตัวขึ้นมา สัมผัสเย็นเยียบของเหล็กกล้าตอกย้ำว่าการเดินทางบทใหม่ได้เริ่มต้นขึ้นแล้ว`}
              </div>
            </article>
          </>
        ) : (
          /* MANGA WEBTOON IMAGE VIEWER */
          <div className="manga-pages-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            {pages.map((imgUrl, i) => (
              <div key={i} className="manga-page-item" style={{ position: 'relative', width: '100%', maxWidth: 760, overflow: 'hidden', borderRadius: 'var(--r-sm)', background: 'var(--surface)' }}>
                <img
                  src={imgUrl}
                  alt={`หน้า ${i + 1}`}
                  style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
                  loading="lazy"
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    background: 'rgba(0,0,0,0.65)',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 10.5,
                    padding: '2px 8px',
                    borderRadius: 99,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  หน้า {i + 1} / {pages.length}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Saved Progress Note */}
        {!zenMode && (
          <p className="saved-note" style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 12, marginTop: 24 }}>
            {savedAt ? `บันทึกตำแหน่งล่าสุดแล้ว (${savedAt}) · ` : ''}
            ซิงค์ประวัติข้ามอุปกรณ์อัตโนมัติ (FR-L1)
          </p>
        )}
      </main>

      {/* Floating Action Control Dock at Bottom-Right */}
      <aside className="reader-fab-container">
        {/* Expanded Speed Dial Menu (opens upwards) */}
        {isFabOpen && (
          <div className="reader-fab-dock">
            {/* 1. เลื่อนขึ้นบนสุด */}
            <button onClick={scrollToTop} className="fab-action" title="เลื่อนขึ้นบนสุด">
              <ArrowUp style={{ width: 17, height: 17 }} />
              <span className="fab-tip">ขึ้นบนสุด</span>
            </button>

            {/* 2. รายละเอียดตอน / เรื่อง */}
            <Link href={`/story/${story.id}`} className="fab-action" title="รายละเอียดเรื่อง">
              <Info style={{ width: 17, height: 17 }} />
              <span className="fab-tip">รายละเอียด</span>
            </Link>

            {/* 3. คอมเมนต์ */}
            <button onClick={() => setIsCommentsOpen(!isCommentsOpen)} className="fab-action" title="เปิดคอมเมนต์">
              <MessageSquare style={{ width: 17, height: 17 }} />
              <span className="fab-tip">คอมเมนต์</span>
            </button>

            {/* 4. ปิดแถบอื่นๆ (Zen Mode) */}
            <button
              onClick={() => {
                setZenMode(!zenMode);
                toast(zenMode ? 'แสดงแถบเมนูตามปกติ' : 'เปิดโหมดไร้สิ่งรบกวน (Zen Mode)');
              }}
              className={`fab-action ${zenMode ? 'active' : ''}`}
              title="ปิดแถบอื่นๆ"
            >
              {zenMode ? <Eye style={{ width: 17, height: 17 }} /> : <EyeOff style={{ width: 17, height: 17 }} />}
              <span className="fab-tip">{zenMode ? 'แสดงแถบ' : 'ปิดแถบ'}</span>
            </button>

            {/* 5. ตอนถัดไป */}
            {next ? (
              <Link href={`/read/${story.id}/${next}`} className="fab-action" title="อ่านตอนถัดไป">
                <ChevronRight style={{ width: 17, height: 17 }} />
                <span className="fab-tip">ตอนถัดไป</span>
              </Link>
            ) : (
              <button disabled className="fab-action disabled" title="ไม่มีตอนถัดไป">
                <ChevronRight style={{ width: 17, height: 17, opacity: 0.3 }} />
                <span className="fab-tip">ตอนล่าสุด</span>
              </button>
            )}

            {/* 6. ตอนก่อนหน้า */}
            {prev ? (
              <Link href={`/read/${story.id}/${prev}`} className="fab-action" title="ย้อนไปตอนเก่า">
                <ChevronLeft style={{ width: 17, height: 17 }} />
                <span className="fab-tip">ตอนก่อน</span>
              </Link>
            ) : (
              <button disabled className="fab-action disabled" title="ไม่มีตอนก่อนหน้า">
                <ChevronLeft style={{ width: 17, height: 17, opacity: 0.3 }} />
                <span className="fab-tip">ตอนแรก</span>
              </button>
            )}
          </div>
        )}

        {/* Primary FAB Trigger Button */}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`reader-fab-btn ${isFabOpen ? 'open' : ''}`}
          aria-label="ตั้งค่าและเมนูลัดการอ่าน"
          title="เมนูลัดการอ่าน"
        >
          {isFabOpen ? <X style={{ width: 22, height: 22 }} /> : <Sliders style={{ width: 21, height: 21 }} />}
        </button>
      </aside>

      {/* Chapter Comments Sliding Modal / Drawer */}
      {isCommentsOpen && (
        <div className="drawer-overlay" onClick={() => setIsCommentsOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare style={{ width: 18, height: 18, color: 'var(--hanko)' }} />
                <h3 style={{ margin: 0, fontSize: 16 }}>คอมเมนต์ ({chapter.title})</h3>
              </div>
              <button className="icon-btn" onClick={() => setIsCommentsOpen(false)} aria-label="ปิด">
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="comment-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <b style={{ fontSize: 13 }}>นักอ่านเงา</b>
                  <span style={{ fontSize: 11, color: 'var(--faint)' }}>15 นาทีที่แล้ว</span>
                </div>
                <p style={{ fontSize: 13, margin: 0, color: 'var(--text)' }}>
                  ภาพคมชัดมาก! ฉากดวลดาบวาดมุมกล้องออกมาได้ดีสุดๆ คุ้มค่าเหรียญมาก
                </p>
              </div>

              <div className="comment-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <b style={{ fontSize: 13 }}>จอมยุทธ์นอนดึก</b>
                  <span style={{ fontSize: 11, color: 'var(--faint)' }}>1 ชม.ที่แล้ว</span>
                </div>
                <p style={{ fontSize: 13, margin: 0, color: 'var(--text)' }}>
                  อาจารย์ตายจริงไหมเนี่ย คาใจมาก รอตอนต่อไปไม่ไหวแล้ว
                </p>
              </div>
            </div>

            <form onSubmit={handlePostComment} className="drawer-footer">
              <input
                type="text"
                placeholder="เขียนคอมเมนต์แลกเปลี่ยนความคิดเห็น..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="drawer-input"
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Send style={{ width: 14, height: 14 }} /> ส่ง
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
