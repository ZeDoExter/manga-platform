import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: { default: 'DooToon — ดูตูน แพลตฟอร์มมังงะและนิยายออนไลน์', template: '%s · DooToon' },
  description: 'ดูตูน แพลตฟอร์มมังงะและนิยายออนไลน์ อัปเดตตอนใหม่ทุกวัน ภาพคมชัด ไร้โฆษณากวนใจ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="dark">
      <body>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
