'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { useStore } from '@/lib/store';
import { Search, Coins, Bookmark, Play, ShieldAlert } from 'lucide-react';

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { coins, topUpCoins, is18Plus, toggle18Plus } = useStore();
  const timer = useRef<number | null>(null);

  const onSearch = (v: string) => {
    clearTimeout(timer.current ?? undefined);
    timer.current = window.setTimeout(() => {
      const q = v.trim();
      router.push(q ? `/?q=${encodeURIComponent(q)}` : '/');
    }, 300);
  };

  return (
    <header className="dootoon-nav">
      <div className="nav-inner">
        {/* Brand */}
        <Link className="brand" href="/">
          <div className="brand-icon">
            <Play style={{ width: 16, height: 16, fill: '#fff', marginLeft: 2 }} />
          </div>
          <div className="brand-name">
            DOO<span>TOON</span>
            <span className="brand-tag">ดูตูน</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="nav-links">
          <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
            หน้าแรก
          </Link>
          <Link href="/?type=manga" className={`nav-link ${pathname === '/?type=manga' ? 'active' : ''}`}>
            มังงะ
          </Link>
          <Link href="/?type=novel" className={`nav-link ${pathname === '/?type=novel' ? 'active' : ''}`}>
            นิยาย
          </Link>
          <Link href="/bookmarks" className={`nav-link ${pathname === '/bookmarks' ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Bookmark style={{ width: 14, height: 14 }} />
            <span>บุ๊กมาร์ก</span>
          </Link>
        </nav>

        {/* Search Input */}
        <div className="nav-search">
          <Search className="search-icon-pos" style={{ width: 15, height: 15 }} />
          <input
            key={searchParams.get('q') ?? ''}
            defaultValue={searchParams.get('q') ?? ''}
            placeholder="ค้นหาชื่อเรื่อง นักเขียน หรือหมวดหมู่..."
            onChange={(e) => onSearch(e.target.value)}
            className="search-field"
            aria-label="ค้นหา"
          />
        </div>

        {/* Right Section */}
        <div className="nav-right">
          {/* Coin Pill */}
          <button
            className="coin-chip"
            onClick={() => topUpCoins(100)}
            title="กดเพื่อเติมเหรียญ (จำลองระบบ)"
          >
            <Coins style={{ width: 15, height: 15 }} />
            <span>{coins}</span>
            <span className="coin-add-label">+ เติม</span>
          </button>

          {/* 18+ Mature Content Toggle (FR-G1) */}
          <button
            onClick={() => toggle18Plus()}
            className="toggle-18-btn"
            title={is18Plus ? 'ปิดโหมดเนื้อหา 18+ (FR-G1)' : 'เปิดโหมดเนื้อหา 18+ (ต้องเข้าสู่ระบบและยืนยันอายุ)'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 99,
              background: is18Plus ? 'rgba(255, 59, 92, 0.16)' : 'var(--surface)',
              border: `1px solid ${is18Plus ? 'rgba(255, 59, 92, 0.5)' : 'var(--border)'}`,
              color: is18Plus ? 'var(--primary)' : 'var(--text-faint)',
              fontSize: 11.5,
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ letterSpacing: 0.5 }}>18+</span>
            {/* Toggle switch track */}
            <div
              style={{
                width: 28,
                height: 16,
                borderRadius: 99,
                background: is18Plus ? 'var(--primary)' : '#262c3d',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 2,
                  left: is18Plus ? 14 : 2,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}
              />
            </div>
          </button>

          {/* Avatar Profile Link */}
          <Link
            href="/profile"
            className="user-avatar"
            title="โปรไฟล์และการตั้งค่า"
            style={{
              display: 'grid',
              placeItems: 'center',
              textDecoration: 'none',
              boxShadow: pathname === '/profile' ? '0 0 0 2px var(--primary)' : 'none',
            }}
          >
            D
          </Link>
        </div>
      </div>
    </header>
  );
}
