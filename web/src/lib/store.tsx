'use client';

import React, { createContext, useContext, useState } from 'react';
import { STORIES, Story, Chapter } from './data';

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
  const [following, setFollowing] = useState<string[]>(['the-legendary-hero', 'solo-leveling']);
  const [is18Plus, setIs18Plus] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true); // default logged in for demo
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>({
    'the-legendary-hero': {
      storyId: 'the-legendary-hero',
      storyTitle: 'The Legendary Hero is an Academy Honors Student',
      storyCover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      chapterId: 'lh-1',
      chapterIndex: 1,
      percentage: 85,
      updatedAt: '12 นาทีที่แล้ว',
    },
    'solo-leveling': {
      storyId: 'solo-leveling',
      storyTitle: 'Solo Leveling: Ragnarok',
      storyCover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      chapterId: 'sl-1',
      chapterIndex: 1,
      percentage: 50,
      updatedAt: '2 ชม.ก่อน',
    },
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    if (isBookmarked) {
      setFollowing((prev) => prev.filter((id) => id !== storyId));
      showToast('นำออกจากบุ๊กมาร์กแล้ว');
      return false;
    } else {
      setFollowing((prev) => [...prev, storyId]);
      showToast('บันทึกลงบุ๊กมาร์กแล้ว');
      return true;
    }
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
