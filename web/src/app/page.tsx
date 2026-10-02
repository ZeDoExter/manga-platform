'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/lib/store';
import { STORIES, Story, Chapter } from '@/lib/manga-data';
import { BookOpen, Sparkles, Star, Eye, Play, Lock, CheckCircle2, ChevronRight, Flame } from 'lucide-react';

export default function HomePage() {
  const { readingProgress, unlockedChapters, setUnlockTarget } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'manga' | 'novel'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  const featured = STORIES[0]; // Solo Leveling

  const allTags = ['All', 'Action', 'Fantasy', 'Novel', 'Slice of Life', 'Apocalypse'];

  const filteredStories = STORIES.filter((s) => {
    if (filterType !== 'all' && s.type !== filterType) return false;
    if (selectedTag !== 'All' && !s.tags.includes(selectedTag)) return false;
    return true;
  });

  const continueItems = Object.values(readingProgress);

  const handleChapterClick = (story: Story, chapter: Chapter) => {
    if (chapter.priceCoins === 0 || unlockedChapters.includes(chapter.id)) {
      window.location.href = `/read/${story.id}/${chapter.id}`;
    } else {
      setUnlockTarget({ story, chapter });
    }
  };

  return (
    <div className="min-h-screen pb-16">
      {/* 1. Cinematic Hero Section */}
      <section className="relative w-full h-[460px] md:h-[520px] overflow-hidden">
        {/* Background Image with Gradient Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 filter brightness-50"
          style={{ backgroundImage: `url(${featured.banner})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />

        <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 flex flex-col justify-end pb-12">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-lg shadow-rose-500/30">
                <Flame className="w-3.5 h-3.5" /> #1 Trending Now
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700">
                {featured.type.toUpperCase()}
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
                <Star className="w-3.5 h-3.5 fill-amber-400" /> {featured.rating}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
              {featured.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 line-clamp-3 leading-relaxed">
              {featured.synopsis}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => handleChapterClick(featured, featured.chapters[0])}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold shadow-lg shadow-rose-500/25 transition flex items-center gap-2 text-sm"
              >
                <Play className="w-4 h-4 fill-white" /> Start Reading Ch. 1 (Free)
              </button>

              <Link
                href={`/story/${featured.id}`}
                className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold transition text-sm flex items-center gap-1.5"
              >
                Story Details <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Continue Reading Shelf (FR-L1, FR-L3) */}
      {continueItems.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" /> Continue Reading
            </h2>
            <span className="text-xs text-slate-400">Syncs across devices (FR-L1)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {continueItems.map((item) => (
              <Link
                key={item.storyId}
                href={`/read/${item.storyId}/${item.chapterId}`}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition group shadow-md"
              >
                <img
                  src={item.storyCover}
                  alt={item.storyTitle}
                  className="w-16 h-20 object-cover rounded-xl shrink-0 group-hover:scale-105 transition"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{item.storyTitle}</h4>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{item.chapterTitle}</p>
                  
                  {/* Progress bar */}
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Progress</span>
                      <span className="text-indigo-400 font-semibold">{item.percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. Catalog & Discovery Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10" id="manga">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Explore Titles</h2>
            <p className="text-xs text-slate-400 mt-1">High resolution manga and immersive light novels</p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${filterType === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('manga')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${filterType === 'manga' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                Manga
              </button>
              <button
                onClick={() => setFilterType('novel')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${filterType === 'novel' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                Light Novels
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-xl border border-slate-800/60 text-xs">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-1 rounded-lg transition ${selectedTag === tag ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-300'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredStories.map((story) => (
            <div
              key={story.id}
              className="flex flex-col bg-slate-900/80 rounded-2xl border border-slate-800/80 overflow-hidden hover:border-slate-700/80 transition-all duration-300 group shadow-lg"
            >
              {/* Cover Thumbnail */}
              <Link href={`/story/${story.id}`} className="relative aspect-[3/4] w-full overflow-hidden block">
                <img
                  src={story.cover}
                  alt={story.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                {/* Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-slate-900/90 text-slate-200 backdrop-blur-sm border border-slate-700">
                    {story.type}
                  </span>
                </div>

                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-black/60 text-amber-400 backdrop-blur-sm">
                  <Star className="w-3 h-3 fill-amber-400" /> {story.rating}
                </div>

                <div className="absolute bottom-2.5 left-2.5 right-2.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {story.views} views
                  </span>
                </div>
              </Link>

              {/* Story Body */}
              <div className="p-3.5 flex flex-col flex-1 justify-between">
                <div>
                  <Link href={`/story/${story.id}`}>
                    <h3 className="font-bold text-sm sm:text-base text-white hover:text-rose-400 transition line-clamp-1">
                      {story.title}
                    </h3>
                  </Link>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{story.author}</p>
                </div>

                {/* Quick Chapter Chips */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400">Chapters:</div>
                  <div className="flex flex-col gap-1">
                    {story.chapters.slice(0, 2).map((chap) => {
                      const isUnlocked = chap.priceCoins === 0 || unlockedChapters.includes(chap.id);
                      return (
                        <button
                          key={chap.id}
                          onClick={() => handleChapterClick(story, chap)}
                          className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-xs transition text-left"
                        >
                          <span className="truncate text-slate-300 max-w-[120px]">Ch. {chap.orderIndex}</span>
                          {isUnlocked ? (
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Free
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-400" /> 🪙 {chap.priceCoins}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
