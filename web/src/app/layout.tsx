import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/store';
import { Navbar } from '@/components/Navbar';
import { TopUpModal } from '@/components/TopUpModal';
import { UnlockModal } from '@/components/UnlockModal';

export const metadata: Metadata = {
  title: 'MangaFlow — Manga & Novel Reading Platform',
  description: 'Fast, beautiful manga and light novel reading platform with coin economy and creator revenue share.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-rose-500/30 selection:text-rose-200">
        <AppProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-900 bg-slate-950/60 py-8 px-4 text-center text-xs text-slate-400">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-300">MangaFlow Platform</span>
                <span>•</span>
                <span>Go Microservices on AKS & Cloudflare R2</span>
              </div>
              <p className="text-slate-400">
                Course Project • Functional Testing & Architecture Showcase
              </p>
            </div>
          </footer>
          <TopUpModal />
          <UnlockModal />
        </AppProvider>
      </body>
    </html>
  );
}
