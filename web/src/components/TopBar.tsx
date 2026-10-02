'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { useStore } from '@/lib/store';
import { Search, Coins, Bookmark, Play, BookOpen } from 'lucide-react';

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { coins, topUpCoins } = useStore();
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

          {/* Bookmarks shortcut for mobile */}
          <Link
            href="/bookmarks"
            className="btn btn-secondary btn-sm"
            style={{ padding: 8, borderRadius: '50%', width: 34, height: 34, display: 'flex' }}
            title="บุ๊กมาร์กของฉัน"
          >
            <Bookmark style={{ width: 15, height: 15, color: pathname === '/bookmarks' ? 'var(--primary)' : 'var(--text-muted)' }} />
          </Link>

          {/* Avatar */}
          <div className="user-avatar" title="บัญชีผู้ใช้">
            D
          </div>
        </div>
      </div>
    </header>
  );
}
