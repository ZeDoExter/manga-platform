'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast, useStore } from '@/lib/store';
import { Search, Coins, Sun, Moon, BookOpen, Compass, Flame } from 'lucide-react';

function getTheme(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { coins } = useStore();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setTheme(getTheme());
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
    }, 350);
  };

  return (
    <header className="topbar">
      <div className="topbar-in">
        {/* Brand */}
        <Link className="logo" href="/">
          <span className="logo-mark">
            <BookOpen style={{ width: 17, height: 17 }} />
          </span>
          <span>
            DUKETOON<small>MANGA & NOVEL PLATFORM</small>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="nav-desktop">
          <Link href="/" className={pathname === '/' ? 'on' : ''}>
            หน้าแรก
          </Link>
          <Link href="/?q=มังงะ" className={pathname === '/?q=มังงะ' ? 'on' : ''}>
            มังงะ
          </Link>
          <Link href="/?q=นิยาย" className={pathname === '/?q=นิยาย' ? 'on' : ''}>
            นิยาย
          </Link>
          <Link href="/story/1" className={pathname.startsWith('/story') ? 'on' : ''}>
            เรื่องยอดนิยม
          </Link>
        </nav>

        {/* Search */}
        <div className="search">
          <label className="search-box">
            <Search style={{ width: 15, height: 15, opacity: 0.6, flexShrink: 0 }} />
            <input
              key={searchParams.get('q') ?? ''}
              defaultValue={searchParams.get('q') ?? ''}
              placeholder="ค้นหาชื่อเรื่อง หมวดหมู่ หรือนักเขียน..."
              onChange={(e) => onSearch(e.target.value)}
              aria-label="ค้นหา"
            />
          </label>
        </div>

        {/* Coin Balance Pill */}
        <button
          className="coin-pill"
          title="กระเป๋าเหรียญคงเหลือ"
          onClick={() => toast(`คงเหลือ ${coins} เหรียญ (ระบบแยกเหรียญเติมและเหรียญโบนัสตาม FR-M2)`)}
        >
          <Coins style={{ width: 15, height: 15, color: 'var(--coin)' }} />
          <span>{coins}</span>
        </button>

        {/* Theme Toggle */}
        <button
          className="icon-btn"
          onClick={toggleTheme}
          title="สลับโหมดมืด/สว่าง"
          aria-label="สลับธีม"
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--line)',
            borderRadius: '50%',
            width: 34,
            height: 34,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            color: 'var(--text)',
          }}
        >
          {theme === 'dark' ? (
            <Sun style={{ width: 16, height: 16 }} />
          ) : (
            <Moon style={{ width: 16, height: 16 }} />
          )}
        </button>

        {/* User Avatar */}
        <div className="avatar">N</div>
      </div>
    </header>
  );
}
