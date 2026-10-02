'use client';

import React from 'react';
import Link from 'next/link';
import { useApp, UserRole } from '@/lib/store';
import { BookOpen, Coins, ShieldCheck, Sparkles, User, UserCheck } from 'lucide-react';

export function Navbar() {
  const { role, setRole, totalCoins, setIsTopUpOpen } = useApp();

  const roles: { value: UserRole; label: string; badge: string }[] = [
    { value: 'guest', label: 'Guest', badge: 'bg-slate-700 text-slate-300' },
    { value: 'user', label: 'User', badge: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' },
    { value: 'uploader', label: 'Uploader', badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
    { value: 'admin', label: 'Admin', badge: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white shadow-lg shadow-rose-500/20 group-hover:scale-105 transition">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              MANGA<span className="text-rose-500">FLOW</span>
            </span>
            <span className="text-[9px] uppercase tracking-widest text-slate-500 -mt-1 font-semibold">
              Manga & Novel Platform
            </span>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <Link href="/" className="hover:text-white transition">Discover</Link>
          <Link href="/#manga" className="hover:text-white transition">Manga</Link>
          <Link href="/#novels" className="hover:text-white transition">Light Novels</Link>
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Live Role Switcher (for interactive testing of permissions & ads) */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => setRole(r.value)}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  role === r.value
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Coin Balance Pill (clickable -> opens topup) */}
          <button
            onClick={() => setIsTopUpOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition group"
            title="Click to top up coins"
          >
            <Coins className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span className="font-bold text-xs">🪙 {totalCoins}</span>
            <span className="hidden sm:inline-block text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded-md font-semibold text-amber-300">
              + Top Up
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
