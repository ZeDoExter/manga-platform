'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Chapter, Comment, INITIAL_COMMENTS, STORIES, Story } from './manga-data';

export type UserRole = 'guest' | 'user' | 'uploader' | 'admin';

export interface ReadingProgress {
  storyId: string;
  storyTitle: string;
  storyCover: string;
  chapterId: string;
  chapterTitle: string;
  pageIndex: number;
  totalElements: number;
  percentage: number;
  updatedAt: string;
}

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  purchasedCoins: number;
  bonusCoins: number;
  totalCoins: number;
  topUpCoins: (amount: number, bonus?: number) => void;
  unlockedChapters: string[];
  unlockChapter: (chapter: Chapter) => { success: boolean; error?: string };
  readingProgress: Record<string, ReadingProgress>; // key: storyId
  saveReadingProgress: (storyId: string, chapterId: string, pageIndex: number, total: number) => void;
  comments: Comment[];
  addComment: (storyId: string, chapterId: string, body: string, parentId?: string) => { success: boolean; error?: string };
  isTopUpOpen: boolean;
  setIsTopUpOpen: (open: boolean) => void;
  unlockTarget: { story: Story; chapter: Chapter } | null;
  setUnlockTarget: (target: { story: Story; chapter: Chapter } | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>('user');
  const [purchasedCoins, setPurchasedCoins] = useState<number>(100);
  const [bonusCoins, setBonusCoins] = useState<number>(20);
  const [unlockedChapters, setUnlockedChapters] = useState<string[]>(['sl-ch-1', 'tbate-ch-1', 'frieren-ch-1', 'orv-ch-1']);
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>({
    'solo-leveling-ragnarok': {
      storyId: 'solo-leveling-ragnarok',
      storyTitle: 'Solo Leveling: Ragnarok',
      storyCover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      chapterId: 'sl-ch-1',
      chapterTitle: 'Chapter 1: The Inheritor of Shadows',
      pageIndex: 3,
      totalElements: 4,
      percentage: 75,
      updatedAt: '10 mins ago',
    },
  });
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<{ story: Story; chapter: Chapter } | null>(null);

  const totalCoins = purchasedCoins + bonusCoins;

  const topUpCoins = (amount: number, bonus = 0) => {
    setPurchasedCoins((prev) => prev + amount);
    if (bonus > 0) {
      setBonusCoins((prev) => prev + bonus);
    }
  };

  const unlockChapter = (chapter: Chapter) => {
    if (role === 'guest') {
      return { success: false, error: 'Please sign in to unlock chapters with coins' };
    }
    if (unlockedChapters.includes(chapter.id) || chapter.priceCoins === 0) {
      return { success: true };
    }

    if (totalCoins < chapter.priceCoins) {
      return { success: false, error: 'Insufficient coin balance. Please top up.' };
    }

    // Spend bonus coins first, then purchased coins (FR-M2 / FR-E5)
    let needed = chapter.priceCoins;
    let newBonus = bonusCoins;
    let newPurchased = purchasedCoins;

    if (newBonus >= needed) {
      newBonus -= needed;
      needed = 0;
    } else {
      needed -= newBonus;
      newBonus = 0;
      newPurchased -= needed;
    }

    setBonusCoins(newBonus);
    setPurchasedCoins(newPurchased);
    setUnlockedChapters((prev) => [...prev, chapter.id]);

    return { success: true };
  };

  const saveReadingProgress = (storyId: string, chapterId: string, pageIndex: number, total: number) => {
    const story = STORIES.find((s) => s.id === storyId);
    const chapter = story?.chapters.find((c) => c.id === chapterId);
    if (!story || !chapter) return;

    const percentage = Math.min(100, Math.round(((pageIndex + 1) / Math.max(1, total)) * 100));

    setReadingProgress((prev) => ({
      ...prev,
      [storyId]: {
        storyId,
        storyTitle: story.title,
        storyCover: story.cover,
        chapterId,
        chapterTitle: chapter.title,
        pageIndex,
        totalElements: total,
        percentage,
        updatedAt: 'Just now',
      },
    }));
  };

  const addComment = (storyId: string, chapterId: string, body: string, parentId?: string) => {
    if (role === 'guest') {
      return { success: false, error: 'Guests cannot post comments. Please log in.' };
    }

    const story = STORIES.find((s) => s.id === storyId);
    const chapter = story?.chapters.find((c) => c.id === chapterId);

    // FR-CM12: Check if coin-locked chapter is unlocked
    if (chapter && chapter.priceCoins > 0 && !unlockedChapters.includes(chapterId) && role !== 'admin') {
      return { success: false, error: 'You must unlock this chapter before commenting.' };
    }

    // FR-CM7: Blocked words check
    const lower = body.toLowerCase();
    const blocked = ['spam', 'scam', 'phishing', 'spoiler-leak'];
    for (const word of blocked) {
      if (lower.includes(word)) {
        return { success: false, error: `Comment contains prohibited word: "${word}"` };
      }
    }

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      storyId,
      chapterId,
      chapterTitle: chapter ? chapter.title : 'Chapter',
      userId: `u-${role}`,
      authorName: role === 'admin' ? 'Platform Administrator' : 'You (Reader)',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${role}`,
      body,
      likeCount: 0,
      replyCount: 0,
      parentId,
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [newComment, ...prev]);
    return { success: true };
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        purchasedCoins,
        bonusCoins,
        totalCoins,
        topUpCoins,
        unlockedChapters,
        unlockChapter,
        readingProgress,
        saveReadingProgress,
        comments,
        addComment,
        isTopUpOpen,
        setIsTopUpOpen,
        unlockTarget,
        setUnlockTarget,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
