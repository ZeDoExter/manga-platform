'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast, useStore } from '@/lib/store';
import { Home, BookOpen, Compass, Coins, User } from 'lucide-react';

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
      <Link href="/story/1" className={pathname.startsWith('/story') ? 'on' : ''}>
        <span className="ic">
          <BookOpen style={{ width: 17, height: 17 }} />
        </span>
        เรื่องเด่น
      </Link>
      <Link href="/read/1/1" className={pathname.startsWith('/read') ? 'on' : ''}>
        <span className="ic">
          <Compass style={{ width: 17, height: 17 }} />
        </span>
        อ่าน
      </Link>
      <button
        className="tab"
        onClick={() => toast(`เหรียญคงเหลือ <b>${coins}</b> · เติมผ่าน PromptPay QR (FR-M1/FR-PAY1)`)}
      >
        <span className="ic">
          <Coins style={{ width: 17, height: 17 }} />
        </span>
        เหรียญ
      </button>
      <button
        className="tab"
        onClick={() => toast('บัญชีผู้ใช้ · สิทธิ์และนโยบายโฆษณาแบ่งตามระดับสมาชิก (FR-X3)')}
      >
        <span className="ic">
          <User style={{ width: 17, height: 17 }} />
        </span>
        โปรไฟล์
      </button>
    </nav>
  );
}
