import { Suspense } from 'react';
import { TopBar } from '@/components/TopBar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<div className="h-16 border-b border-white/5" />}>
        <TopBar />
      </Suspense>
      <main>{children}</main>
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface)', padding: '36px 16px', marginTop: 60, textAlign: 'center' }}>
        <div className="wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <b style={{ color: '#fff', fontSize: 16, letterSpacing: -0.3 }}>
            DOOTOON <span style={{ color: 'var(--primary)', fontWeight: 400 }}>ดูตูน</span>
          </b>
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)', maxWidth: 460 }}>
            แพลตฟอร์มมังงะและนิยายออนไลน์ • สถาปัตยกรรม Microservices บน Azure AKS & Cloudflare R2
          </p>
        </div>
      </footer>
    </>
  );
}
