'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast, useStore } from '@/lib/store';
import { Home, Bookmark, Compass, Coins, User } from 'lucide-react';

export default function MobileTabs() {
  const pathname = usePathname();
  const { coins } = useStore();

  return (
    <nav className="mtabs">
      <Link href="/" className={pathname === '/' ? 'on' : ''}>
        <span className="ic">
          <Home style={{ width: 17, height: 17 }} />
        </span>
        หน้าแรก
      </Link>
      <Link href="/bookmarks" className={pathname === '/bookmarks' ? 'on' : ''}>
        <span className="ic">
          <Bookmark style={{ width: 17, height: 17 }} />
        </span>
        บุ๊กมาร์ก
      </Link>
      <Link href="/read/1/1" className={pathname.startsWith('/read') ? 'on' : ''}>
        <span className="ic">
          <Compass style={{ width: 17, height: 17 }} />
        </span>
        อ่าน
      </Link>
      <button
        className="tab"
        onClick={() => toast(`เหรียญคงเหลือ ${coins} เหรียญ`)}
      >
        <span className="ic">
          <Coins style={{ width: 17, height: 17 }} />
        </span>
        เหรียญ
      </button>
      <button
        className="tab"
        onClick={() => toast('บัญชีผู้ใช้ • สิทธิ์และนโยบายแบ่งตามระดับสมาชิก')}
      >
        <span className="ic">
          <User style={{ width: 17, height: 17 }} />
        </span>
        ฉัน
      </button>
    </nav>
  );
}
