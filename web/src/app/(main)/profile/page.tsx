'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import {
  User,
  Coins,
  BookOpen,
  Shield,
  Sliders,
  LogOut,
  Trash2,
  CheckCircle2,
  PenTool,
  Lock,
  Plus,
  ArrowLeft,
  Smartphone,
  Sparkles,
} from 'lucide-react';

export default function ProfilePage() {
  const { coins, topUpCoins, showToast } = useStore();

  const [displayName, setDisplayName] = useState('DooToon Reader');
  const [defaultMode, setDefaultMode] = useState<'webtoon' | 'paged'>('webtoon');
  const [autoSync, setAutoSync] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);

  const purchasedCoins = Math.max(0, coins - 20);
  const bonusCoins = Math.min(20, coins);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingName(false);
    showToast('อัปเดตชื่อผู้ใช้เรียบร้อย');
  };

  return (
    <div className="wrap" style={{ paddingTop: 20, paddingBottom: 80, maxWidth: 860 }}>
      {/* Back button */}
      <div style={{ marginBottom: 14 }}>
        <Link
          href="/"
          className="btn btn-ghost btn-sm"
          style={{ padding: '6px 12px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          <span>กลับหน้าแรก</span>
        </Link>
      </div>

      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>โปรไฟล์และการตั้งค่า</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          จัดการบัญชีผู้ใช้ กระเป๋าเหรียญ และปรับแต่งประสบการณ์การอ่านตามความชอบ
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* ========================================================================= */}
        {/* CARD 1: USER ACCOUNT PROFILE                                              */}
        {/* ========================================================================= */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), #6366f1)',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: 24,
                  color: '#fff',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  flexShrink: 0,
                }}
              >
                D
              </div>

              <div>
                {isEditingName ? (
                  <form onSubmit={handleSaveName} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#fff',
                        fontSize: 14,
                        outline: 'none',
                      }}
                      autoFocus
                    />
                    <button type="submit" className="btn btn-primary btn-sm">บันทึก</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsEditingName(false)}>ยกเลิก</button>
                  </form>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{displayName}</h2>
                    <button
                      onClick={() => setIsEditingName(true)}
                      style={{ fontSize: 11.5, color: 'var(--primary)', fontWeight: 600 }}
                    >
                      แก้ไข
                    </button>
                  </div>
                )}
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>reader@dootoon.com</span>
                  <span className="badge badge-free" style={{ fontSize: 9.5, padding: '1px 5px' }}>
                    <CheckCircle2 style={{ width: 10, height: 10 }} /> ยืนยันแล้ว
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                  UID: DOO-8820491 • สมาชิกทั่วไป (User)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-rank-n" style={{ padding: '6px 12px', fontSize: 11.5 }}>
                สถานะบัญชีปกติ
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 2: COIN WALLET & REVENUE ECONOMY (FR-M2)                             */}
        {/* ========================================================================= */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Coins style={{ width: 18, height: 18, color: 'var(--coin)' }} />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>กระเป๋าเหรียญ (FR-M2)</h2>
            </div>
            <button
              onClick={() => topUpCoins(100)}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              <span>เติม 100 เหรียญ</span>
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              background: 'var(--surface-elevated)',
              padding: 16,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>เหรียญคงเหลือทั้งหมด</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--coin)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Coins style={{ width: 22, height: 22 }} />
                <span>{coins}</span>
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>เหรียญเติม (Purchased)</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 4 }}>
                {purchasedCoins} เหรียญ
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>นับเป็นรายได้ให้ทีมผู้สร้างเมื่อใช้ซื้อตอน</span>
            </div>

            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>เหรียญโบนัส (Bonus)</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>
                {bonusCoins} เหรียญ
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>ใช้ปลดล็อกอ่านได้ ไม่นับเป็นรายได้ผู้สร้าง (FR-E5)</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 3: READING PREFERENCES (FR-R1, FR-R2, FR-L1)                         */}
        {/* ========================================================================= */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Sliders style={{ width: 18, height: 18, color: 'var(--primary)' }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>ตั้งค่าการอ่าน (Reading Preferences)</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Setting: Default View Mode */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <div>
                <b style={{ fontSize: 13.5, color: '#fff', display: 'block' }}>โหมดการอ่านมังงะเริ่มต้น</b>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>เลือกรูปแบบการแสดงผลตอนเปิดอ่านการ์ตูน</span>
              </div>
              <div style={{ display: 'flex', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3, gap: 2 }}>
                <button
                  onClick={() => setDefaultMode('webtoon')}
                  className={`btn-sm ${defaultMode === 'webtoon' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', fontSize: 12 }}
                >
                  เลื่อนยาว
                </button>
                <button
                  onClick={() => setDefaultMode('paged')}
                  className={`btn-sm ${defaultMode === 'paged' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', fontSize: 12 }}
                >
                  ทีละหน้า
                </button>
              </div>
            </div>

            {/* Setting: Auto-Sync Progress */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <div>
                <b style={{ fontSize: 13.5, color: '#fff', display: 'block' }}>ซิงค์ตำแหน่งการอ่านอัตโนมัติ (FR-L1)</b>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>บันทึกหน้าที่อ่านค้างไว้เพื่ออ่านต่อบนอุปกรณ์อื่นได้ทันที</span>
              </div>
              <button
                onClick={() => {
                  setAutoSync(!autoSync);
                  showToast(autoSync ? 'ปิดการซิงค์ตำแหน่งแล้ว' : 'เปิดการซิงค์ตำแหน่งอัตโนมัติแล้ว');
                }}
                className={`btn btn-sm ${autoSync ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minWidth: 64 }}
              >
                {autoSync ? 'เปิด' : 'ปิด'}
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 4: CREATOR PORTAL APPLICATION (FR-A3)                                */}
        {/* ========================================================================= */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <PenTool style={{ width: 18, height: 18, color: '#a78bfa' }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>สำหรับนักเขียนและนักวาด (Creator Portal)</h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
            สนใจเปิดช่องทางเผยแพร่ผลงานมังงะหรือนิยายของคุณบน DooToon? ส่งคำขอเป็น Creator / Uploader เพื่อรับสิทธิ์อัปโหลดผลงาน กำหนดราคา และรับส่วนแบ่งรายได้ตามสัดส่วนทีม (FR-C3/FR-M4)
          </p>
          <button
            onClick={() => showToast('ส่งคำขอสมัครเป็น Creator เรียบร้อยแล้ว (รอ Admin ตรวจสอบตาม FR-A3)')}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Sparkles style={{ width: 15, height: 15, color: '#a78bfa' }} />
            <span>สมัครเป็น Creator / Uploader</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* CARD 5: SECURITY & PRIVACY (NFR-Sec-1, NFR-Privacy-1)                      */}
        {/* ========================================================================= */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Shield style={{ width: 18, height: 18, color: 'var(--success)' }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>ความปลอดภัยและข้อมูลส่วนบุคคล</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fff' }}>
                <Smartphone style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
                <span>อุปกรณ์ที่เข้าสู่ระบบอยู่: 1 เครื่อง (เซสชันปัจจุบัน)</span>
              </div>
              <span className="badge badge-free">กำลังใช้งาน</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
              <button
                onClick={() => showToast('ออกจากระบบเรียบร้อย')}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <LogOut style={{ width: 14, height: 14 }} />
                <span>ออกจากระบบ</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('คุณต้องการขอลบบัญชีผู้ใช้ตามสิทธิ์ PDPA ใช่หรือไม่?')) {
                    showToast('ส่งคำขอลบบัญชีตามสิทธิ์ PDPA เรียบร้อย (NFR-Privacy-1)');
                  }
                }}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 style={{ width: 13, height: 13 }} />
                <span>ขอลบบัญชี (PDPA)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
