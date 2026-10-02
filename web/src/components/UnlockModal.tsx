'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { Lock, Coins, Check, AlertCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function UnlockModal() {
  const { unlockTarget, setUnlockTarget, totalCoins, unlockChapter, setIsTopUpOpen } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  if (!unlockTarget) return null;

  const { story, chapter } = unlockTarget;
  const hasEnough = totalCoins >= chapter.priceCoins;

  const handleUnlock = () => {
    setError(null);
    const result = unlockChapter(chapter);
    if (!result.success) {
      setError(result.error || 'Failed to unlock chapter');
      return;
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setUnlockTarget(null);
      router.push(`/read/${story.id}/${chapter.id}`);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100">
        <button
          onClick={() => setUnlockTarget(null)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-5">
          <div className="p-3.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl mb-3">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-1">Unlock Chapter</h3>
          <p className="text-xs text-slate-400 line-clamp-1">{story.title}</p>
          <span className="text-sm font-semibold text-slate-200 mt-0.5">{chapter.title}</span>
        </div>

        {/* Price & Balance Box */}
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/60 mb-5 space-y-2.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Chapter Price</span>
            <span className="font-bold text-amber-400 flex items-center gap-1">
              🪙 {chapter.priceCoins} Coins
            </span>
          </div>
          <div className="h-px bg-slate-700/60" />
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Your Coin Balance</span>
            <span className={`font-bold flex items-center gap-1 ${hasEnough ? 'text-emerald-400' : 'text-rose-400'}`}>
              🪙 {totalCoins} Coins
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {hasEnough ? (
          <button
            onClick={handleUnlock}
            disabled={isSuccess}
            className="w-full py-3 px-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isSuccess ? (
              <span className="flex items-center gap-1.5">
                <Check className="w-5 h-5 text-white" /> Unlocked! Redirecting...
              </span>
            ) : (
              `Unlock with 🪙 ${chapter.priceCoins} Coins`
            )}
          </button>
        ) : (
          <button
            onClick={() => {
              setUnlockTarget(null);
              setIsTopUpOpen(true);
            }}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Coins className="w-4 h-4" /> Top Up Coins First
          </button>
        )}
      </div>
    </div>
  );
}
