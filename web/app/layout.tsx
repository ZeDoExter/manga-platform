import type { Metadata } from 'next';
import { Suspense } from 'react';
import { StoreProvider } from '@/lib/store';
import TopBar from '@/components/TopBar';
import MobileTabs from '@/components/MobileTabs';
import Toaster from '@/components/Toaster';
import './globals.css';
import './duketoon.css';

export const metadata: Metadata = {
  title: { default: 'มังงะฮับ — อ่านมังงะและนิยาย', template: '%s · มังงะฮับ' },
  description: 'แพลตฟอร์มอ่านมังงะและนิยายภาษาไทย ปลดล็อกตอนด้วยเหรียญ ทีมวาดได้ส่วนแบ่งทุกการซื้อ (FR-SEO1)',
};

// ตั้งธีมก่อน paint กันจอกระพริบ (default dark-first แบบ Mihon)
const themeInit = `(function(){try{var t=localStorage.getItem('manga-theme')||'dark';document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" data-theme="dark">
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <StoreProvider>
          <Suspense>
            <TopBar />
          </Suspense>
          <main className="wrap">{children}</main>
          <MobileTabs />
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
