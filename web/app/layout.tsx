import type { Metadata } from 'next';
import { Suspense } from 'react';
import { StoreProvider } from '@/lib/store';
import TopBar from '@/components/TopBar';
import MobileTabs from '@/components/MobileTabs';
import Toaster from '@/components/Toaster';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'DooToon — ดูตูน แพลตฟอร์มมังงะและนิยายออนไลน์', template: '%s · DooToon' },
  description: 'ดูตูน แพลตฟอร์มมังงะและนิยายออนไลน์ อัปเดตตอนใหม่ทุกวัน ภาพคมชัด ไร้โฆษณากวนใจ',
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
