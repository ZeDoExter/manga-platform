'use client';

// Client store (mock). ฝั่งจริง: wallet/ledger อยู่ใน `commerce` (ACID+idempotent, FR-M3/NFR-Money-1),
// สิทธิ์อยู่ใน `entitlement` (FR-R3), ตำแหน่งอ่าน sync ผ่าน `library` (FR-L1).
// ตรงนี้ persist แค่ใน localStorage เพื่อ demo flow แบบไม่ต้องมี backend.

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type ReaderMode = 'paged' | 'scroll' | 'novel';

interface Persist {
  coins: number;
  owned: string[];
  following: string[];
  novelFS: number;
  readerMode: ReaderMode;
}

const DEFAULTS: Persist = { coins: 120, owned: [], following: [], novelFS: 17, readerMode: 'paged' };
const LS_KEY = 'manga-store-v1';

function load(): Persist {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function toast(html: string) {
  window.dispatchEvent(new CustomEvent<string>('manga-toast', { detail: html }));
}

interface Store extends Persist {
  has: (key: string) => boolean;
  /** ซื้อตอน: หักเหรียญ + ให้สิทธิ์ (mock ของ TX เดียวใน FR-M3). คืน false ถ้าเหรียญไม่พอ */
  buy: (key: string, price: number) => boolean;
  toggleFollow: (id: string) => void;
  setNovelFS: (n: number) => void;
  setReaderMode: (m: ReaderMode) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Persist>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setS(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(s));
      } catch {
        /* private mode — ข้าม */
      }
    }
  }, [s, ready]);

  const store: Store = {
    ...s,
    has: (key) => s.owned.includes(key),
    buy: (key, price) => {
      if (s.owned.includes(key)) return true;
      if (s.coins < price) return false;
      setS((p) => ({ ...p, coins: p.coins - price, owned: [...p.owned, key] }));
      return true;
    },
    toggleFollow: (id) =>
      setS((p) => ({
        ...p,
        following: p.following.includes(id) ? p.following.filter((f) => f !== id) : [...p.following, id],
      })),
    setNovelFS: (novelFS) => setS((p) => ({ ...p, novelFS: Math.max(14, Math.min(24, novelFS)) })),
    setReaderMode: (readerMode) => setS((p) => ({ ...p, readerMode })),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
