'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast, useStore } from '@/lib/store';
import { Search, Coins, Sun, Moon, Play } from 'lucide-react';

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { coins } = useStore();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
      setTheme(current);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('manga-theme', next);
    } catch {
      /* ignore */
    }
  };

  const onSearch = (v: string) => {
    clearTimeout(timer.current ?? undefined);
    timer.current = window.setTimeout(() => {
      router.push(v.trim() ? `/?q=${encodeURIComponent(v.trim())}` : '/');
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

        {/* Desktop Links */}
        <nav className="nav-links">
          <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
            หน้าแรก
          </Link>
          <Link href="/?q=มังงะ" className={`nav-link ${pathname === '/?q=มังงะ' ? 'active' : ''}`}>
            มังงะ
          </Link>
          <Link href="/?q=นิยาย" className={`nav-link ${pathname === '/?q=นิยาย' ? 'active' : ''}`}>
            นิยาย
          </Link>
          <Link href="/story/1" className={`nav-link ${pathname.startsWith('/story') ? 'active' : ''}`}>
            เรื่องยอดนิยม
          </Link>
        </nav>

        {/* Search Field */}
        <div className="nav-search">
          <Search className="search-icon-pos" style={{ width: 15, height: 15 }} />
          <input
            key={searchParams.get('q') ?? ''}
            defaultValue={searchParams.get('q') ?? ''}
            placeholder="ค้นหาชื่อเรื่อง หมวดหมู่ หรือนักเขียน..."
            onChange={(e) => onSearch(e.target.value)}
            className="search-field"
            aria-label="ค้นหา"
          />
        </div>

        {/* Right Section */}
        <div className="nav-right">
          <button
            className="coin-chip"
            onClick={() => toast(`เหรียญคงเหลือ: ${coins} เหรียญ (ระบบบันทึกธุรกรรมแบบแยกเหรียญเติมและโบนัสตาม FR-M2)`)}
            title="กระเป๋าเหรียญ"
          >
            <Coins style={{ width: 15, height: 15 }} />
            <span>{coins}</span>
            <span className="coin-add-label">+ เติม</span>
          </button>

          <button
            onClick={toggleTheme}
            className="icon-btn"
            title="สลับโหมดมืด/สว่าง"
            aria-label="สลับธีม"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--text)',
            }}
          >
            {theme === 'dark' ? (
              <Sun style={{ width: 16, height: 16 }} />
            ) : (
              <Moon style={{ width: 16, height: 16 }} />
            )}
          </button>

          <div className="user-avatar" title="บัญชีผู้ใช้">
            D
          </div>
        </div>
      </div>
    </header>
  );
}
