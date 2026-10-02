'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/lib/store';
import { STORIES, Story, Chapter } from '@/lib/manga-data';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Lock,
  MessageSquare,
  Sparkles,
  Type,
  Sun,
  Moon,
  Columns,
  Maximize2,
  X,
  Send,
  ShieldAlert,
} from 'lucide-react';

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.storyId as string;
  const chapterId = params.chapterId as string;

  const { role, unlockedChapters, setUnlockTarget, saveReadingProgress, comments, addComment } = useApp();

  // Story & Chapter selection
  const story = STORIES.find((s) => s.id === storyId);
  const chapter = story?.chapters.find((c) => c.id === chapterId);

  // Manga reader settings
  const [viewMode, setViewMode] = useState<'webtoon' | 'paged'>('webtoon');
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Novel reader settings
  const [fontSize, setFontSize] = useState<number>(18);
  const [novelTheme, setNovelTheme] = useState<'midnight' | 'sepia' | 'oled'>('midnight');

  // Comment Drawer state
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Save reading progress on mount and page change (FR-L1)
  useEffect(() => {
    if (story && chapter) {
      const total = story.type === 'manga' ? (chapter.pages?.length || 1) : 1;
      saveReadingProgress(story.id, chapter.id, currentPage, total);
    }
  }, [storyId, chapterId, currentPage]);

  if (!story || !chapter) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-white">
        <h2 className="text-xl font-bold mb-2">Content Not Found</h2>
        <Link href="/" className="text-xs text-indigo-400 hover:underline">Return to Home</Link>
      </div>
    );
  }

  // Entitlement gate check (FR-R3)
  const isUnlocked = chapter.priceCoins === 0 || unlockedChapters.includes(chapter.id) || role === 'admin';

  const currentIndex = story.chapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = currentIndex > 0 ? story.chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < story.chapters.length - 1 ? story.chapters[currentIndex + 1] : null;

  const chapterComments = comments.filter((c) => c.chapterId === chapter.id);

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);
    if (!commentInput.trim()) return;

    const res = addComment(story.id, chapter.id, commentInput, replyTarget || undefined);
    if (!res.success) {
      setCommentError(res.error || 'Failed to post comment');
      return;
    }
    setCommentInput('');
    setReplyTarget(null);
  };

  return (
    <div className={`min-h-screen flex flex-col ${
      novelTheme === 'sepia' ? 'bg-[#fbf0d9] text-[#2d2319]' : novelTheme === 'oled' ? 'bg-black text-slate-200' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Top Reader HUD Navigation */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 py-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/story/${story.id}`}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Exit Reader"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-white line-clamp-1">{story.title}</span>
            <span className="text-slate-400 text-[11px]">{chapter.title}</span>
          </div>
        </div>

        {/* Reader Mode Controls */}
        <div className="flex items-center gap-2">
          {story.type === 'manga' ? (
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('webtoon')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  viewMode === 'webtoon' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Webtoon (Scroll)
              </button>
              <button
                onClick={() => setViewMode('paged')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  viewMode === 'paged' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Paged (Flip)
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {/* Font size */}
              <button
                onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                className="px-2 py-1 text-slate-400 hover:text-white font-bold"
                title="Decrease font size"
              >
                A-
              </button>
              <span className="text-[11px] text-slate-400">{fontSize}px</span>
              <button
                onClick={() => setFontSize((s) => Math.min(26, s + 2))}
                className="px-2 py-1 text-slate-400 hover:text-white font-bold"
                title="Increase font size"
              >
                A+
              </button>

              {/* Themes */}
              <div className="h-4 w-px bg-slate-800" />
              <button
                onClick={() => setNovelTheme('midnight')}
                className={`w-5 h-5 rounded-full bg-slate-900 border ${novelTheme === 'midnight' ? 'ring-2 ring-indigo-400' : ''}`}
                title="Midnight Theme"
              />
              <button
                onClick={() => setNovelTheme('sepia')}
                className={`w-5 h-5 rounded-full bg-[#fbf0d9] border ${novelTheme === 'sepia' ? 'ring-2 ring-amber-600' : ''}`}
                title="Sepia Paper Theme"
              />
              <button
                onClick={() => setNovelTheme('oled')}
                className={`w-5 h-5 rounded-full bg-black border ${novelTheme === 'oled' ? 'ring-2 ring-white' : ''}`}
                title="OLED Pure Black"
              />
            </div>
          )}

          {/* Comments drawer toggle */}
          <button
            onClick={() => setIsCommentsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{chapterComments.length}</span>
          </button>
        </div>
      </header>

      {/* Role-based Top Banner Ad (FR-X3: Users see top banner; Admins see none) */}
      {role === 'user' && (
        <div className="w-full bg-indigo-950/60 border-b border-indigo-900/60 py-2 px-4 text-center text-xs text-indigo-300 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Special Offer: Top up 300 Coins and receive +35 Bonus Coins today!</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center">
        {!isUnlocked ? (
          /* Locked Chapter Card (FR-R3, FR-M3) */
          <div className="max-w-md w-full mx-4 my-20 p-8 rounded-3xl bg-slate-900/90 border border-slate-800 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">Coin-Locked Chapter</h3>
            <p className="text-xs text-slate-400">
              This chapter requires <span className="text-amber-400 font-bold">🪙 {chapter.priceCoins} Coins</span> to unlock.
              Purchased chapters remain unlocked forever in your account (FR-X2).
            </p>
            <button
              onClick={() => setUnlockTarget({ story, chapter })}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-500/20 transition"
            >
              Unlock for 🪙 {chapter.priceCoins} Coins
            </button>
          </div>
        ) : story.type === 'manga' ? (
          /* MANGA READER */
          viewMode === 'webtoon' ? (
            /* Webtoon Mode: Continuous vertical scroll */
            <div className="w-full max-w-2xl flex flex-col items-center py-6 px-2 sm:px-0">
              {chapter.pages?.map((pageUrl, idx) => (
                <React.Fragment key={idx}>
                  <img
                    src={pageUrl}
                    alt={`Page ${idx + 1}`}
                    className="w-full h-auto object-contain rounded-lg shadow-xl mb-2"
                    loading="lazy"
                  />

                  {/* Inline Ad for Guests (FR-X3) */}
                  {role === 'guest' && idx === 1 && (
                    <div className="w-full my-6 p-6 rounded-2xl bg-slate-900 border border-amber-500/30 text-center shadow-lg space-y-2">
                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                        Sponsored Advertisement (Guest Mode)
                      </div>
                      <h4 className="text-base font-bold text-white">Enjoying this series?</h4>
                      <p className="text-xs text-slate-400">
                        Create an account to remove inline ads and save your reading position across devices!
                      </p>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            /* Paged Mode: 1 page at a time with click to turn */
            <div className="w-full max-w-2xl flex flex-col items-center py-6">
              <div
                onClick={() => {
                  if (currentPage < (chapter.pages?.length || 1) - 1) {
                    setCurrentPage((p) => p + 1);
                  }
                }}
                className="relative cursor-pointer select-none"
              >
                {chapter.pages && (
                  <img
                    src={chapter.pages[currentPage]}
                    alt={`Page ${currentPage + 1}`}
                    className="max-h-[82vh] w-auto object-contain rounded-xl shadow-2xl"
                  />
                )}
              </div>

              {/* Paged Controls */}
              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 disabled:opacity-30 hover:bg-slate-800 text-white transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-semibold text-slate-400">
                  Page <span className="text-white font-bold">{currentPage + 1}</span> of {chapter.pages?.length || 1}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min((chapter.pages?.length || 1) - 1, p + 1))}
                  disabled={currentPage === (chapter.pages?.length || 1) - 1}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 disabled:opacity-30 hover:bg-slate-800 text-white transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )
        ) : (
          /* NOVEL READER */
          <div
            className="w-full max-w-2xl px-6 py-12 leading-loose transition-all"
            style={{ fontSize: `${fontSize}px` }}
          >
            <div className="mb-8 border-b pb-4 border-slate-800/40">
              <h2 className="text-2xl font-black mb-1">{chapter.title}</h2>
              <span className="text-xs opacity-60">Published on {chapter.releaseDate}</span>
            </div>

            <div className="space-y-6 whitespace-pre-line font-serif">
              {chapter.novelText}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Prev/Next Chapter Navigation (FR-R5) */}
      <footer className="w-full max-w-2xl mx-auto px-4 py-8 flex items-center justify-between border-t border-slate-800/60 mt-8 text-xs">
        {prevChapter ? (
          <button
            onClick={() => router.push(`/read/${story.id}/${prevChapter.id}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold transition"
          >
            <ChevronLeft className="w-4 h-4" /> Previous Chapter
          </button>
        ) : (
          <div />
        )}

        {nextChapter ? (
          <button
            onClick={() => router.push(`/read/${story.id}/${nextChapter.id}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 text-white font-bold transition shadow-md"
          >
            Next Chapter <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="text-slate-500 font-semibold">Latest Chapter Reached</div>
        )}
      </footer>

      {/* Chapter Comment Drawer (FR-CM2) */}
      {isCommentsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Chapter Comments</h3>
              </div>
              <button
                onClick={() => setIsCommentsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comment List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {chapterComments.length === 0 ? (
                <p className="text-center py-10 text-xs text-slate-500">No comments yet on this chapter.</p>
              ) : (
                chapterComments.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 ${
                      c.parentId ? 'ml-6 border-l-2 border-l-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={c.avatar} alt={c.authorName} className="w-6 h-6 rounded-full bg-slate-800" />
                        <span className="text-xs font-bold text-white">{c.authorName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{c.createdAt.slice(0, 10)}</span>
                    </div>
                    <p className="text-xs text-slate-300">{c.body}</p>

                    {/* Reply button (only on top level per FR-CM5) */}
                    {!c.parentId && (
                      <button
                        onClick={() => setReplyTarget(c.id)}
                        className="text-[11px] font-semibold text-indigo-400 hover:underline pt-1"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Post comment input */}
            <form onSubmit={handlePostComment} className="pt-4 border-t border-slate-800 space-y-2">
              {replyTarget && (
                <div className="flex items-center justify-between text-[11px] text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">
                  <span>Replying to comment...</span>
                  <button onClick={() => setReplyTarget(null)} className="text-slate-400 hover:text-white">Cancel</button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder={role === 'guest' ? 'Log in to comment...' : 'Leave a comment...'}
                  disabled={role === 'guest'}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={role === 'guest'}
                  className="px-3 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {commentError && <p className="text-[11px] text-rose-400">{commentError}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
