'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { STORIES } from './data';
import {
  DEMO_USER, clearGuestProgress, debounce, fetchContinue, fetchFollows,
  loadGuestProgress, mergeGuest, saveGuestProgress, saveProgressRemote, setFollow,
} from './library-api';

export interface ReadingProgress {
  storyId: string;
  storyTitle: string;
  storyCover: string;
  chapterId: string;
  chapterIndex: number;
  percentage: number;
  updatedAt: string;
}

interface StoreContextType {
  coins: number;
  topUpCoins: (amount: number) => void;
  unlockedChapters: string[];
  buyChapter: (chapterId: string, price: number) => boolean;
  following: string[];
  toggleBookmark: (storyId: string) => boolean;
  readingProgress: Record<string, ReadingProgress>;
  saveProgress: (storyId: string, chapterId: string, chapterIndex: number, percentage: number) => void;
  is18Plus: boolean;
  isLoggedIn: boolean;
  toggle18Plus: () => boolean;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoins] = useState<number>(120);
  const [unlockedChapters, setUnlockedChapters] = useState<string[]>(['lh-1', 'lh-2', 'sl-1', 'fr-1', 'tb-1', 'orv-1', 'dc-1', 'me-1']);
  const [following, setFollowing] = useState<string[]>([]);
  const [is18Plus, setIs18Plus] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true); // default logged in for demo
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const userID = DEMO_USER;

  // Debounced remote progress saver (5s trailing edge).
  const saverRef = useRef(debounce((storyId: string, chapterId: string, contentType: 'manga' | 'novel', position: number) => {
    void saveProgressRemote(userID, storyId, chapterId, contentType, position).catch(() => {
      // Best-effort: local state already updated, remote retries on next save.
    });
  }, 5000));

  // Hydrate follows + continue-reading on mount; merge guest progress once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const guest = loadGuestProgress();
        const items = Object.entries(guest).map(([storyID, g]) => ({
          story_id: storyID, chapter_id: g.chapter_id, content_type: g.content_type,
          position: g.position, updated_at: g.updated_at,
        }));
        if (items.length > 0) {
          await mergeGuest(userID, items);
          clearGuestProgress(); // only after success
        }
        const [follows, rows] = await Promise.all([fetchFollows(userID), fetchContinue(userID)]);
        if (cancelled) return;
        setFollowing(follows);
        const hydrated: Record<string, ReadingProgress> = {};
        for (const r of rows) {
          const story = STORIES.find((s) => s.id === r.story_id);
          if (!story) continue; // takedown-tombstoned story: skip, don't error
          hydrated[r.story_id] = {
            storyId: r.story_id, storyTitle: story.title, storyCover: story.cover,
            chapterId: r.chapter_id, chapterIndex: 0,
            percentage: r.content_type === 'novel' ? r.position / 100 : 0,
            updatedAt: new Date(r.updated_at).toLocaleString(),
          };
        }
        setReadingProgress(hydrated);
      } catch {
        // Library offline: keep local-only mode.
      }
    })();
    const flush = () => saverRef.current.flush();
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flush);
    };
  }, [userID]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const topUpCoins = (amount: number) => {
    setCoins((prev) => prev + amount);
    showToast(`เติมสำเร็จ +${amount} เหรียญ`);
  };

  const buyChapter = (chapterId: string, price: number): boolean => {
    if (unlockedChapters.includes(chapterId) || price === 0) {
      return true;
    }
    if (coins < price) {
      showToast('เหรียญไม่เพียงพอ กรุณาเติมเหรียญก่อน');
      return false;
    }
    setCoins((prev) => prev - price);
    setUnlockedChapters((prev) => [...prev, chapterId]);
    showToast(`ปลดล็อกสำเร็จ หัก ${price} เหรียญ`);
    return true;
  };

  const toggleBookmark = (storyId: string): boolean => {
    const isBookmarked = following.includes(storyId);
    const next = !isBookmarked;
    // Optimistic local update; remote is idempotent PUT/DELETE.
    setFollowing((prev) => next ? [...prev, storyId] : prev.filter((id) => id !== storyId));
    showToast(next ? 'บันทึกลงบุ๊กมาร์กแล้ว' : 'นำออกจากบุ๊กมาร์กแล้ว');
    void setFollow(userID, storyId, next).catch(() => {
      // Roll back on failure.
      setFollowing((prev) => next ? prev.filter((id) => id !== storyId) : [...prev, storyId]);
    });
    return next;
  };

  const toggle18Plus = (): boolean => {
    if (!isLoggedIn) {
      showToast('กรุณาเข้าสู่ระบบเพื่อยืนยันอายุและเปิดโหมด 18+ (FR-G1)');
      return false;
    }
    const next = !is18Plus;
    setIs18Plus(next);
    showToast(next ? 'เปิดใช้งานโหมด 18+ เรียบร้อยแล้ว (FR-G1)' : 'ปิดโหมด 18+ เรียบร้อยแล้ว');
    return next;
  };

  const saveProgress = (storyId: string, chapterId: string, chapterIndex: number, percentage: number) => {
    const story = STORIES.find((s) => s.id === storyId);
    if (!story) return;

    setReadingProgress((prev) => ({
      ...prev,
      [storyId]: {
        storyId,
        storyTitle: story.title,
        storyCover: story.cover,
        chapterId,
        chapterIndex,
        percentage,
        updatedAt: 'เมื่อสักครู่',
      },
    }));

    // Guests buffer locally for later merge; logged-in users debounce to remote.
    if (!isLoggedIn) {
      saveGuestProgress(storyId, {
        story_id: storyId, chapter_id: chapterId, content_type: 'manga',
        position: chapterIndex, updated_at: new Date().toISOString(),
      });
      return;
    }
    saverRef.current.fire(storyId, chapterId, 'manga', chapterIndex);
  };

  return (
    <StoreContext.Provider
      value={{
        coins,
        topUpCoins,
        unlockedChapters,
        buyChapter,
        following,
        toggleBookmark,
        readingProgress,
        saveProgress,
        is18Plus,
        isLoggedIn,
        toggle18Plus,
        toastMessage,
        showToast,
      }}
    >
      {children}
      {/* Toast Notification Container */}
      <div className={`dootoon-toast ${toastMessage ? 'show' : ''}`}>
        {toastMessage}
      </div>
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
}
