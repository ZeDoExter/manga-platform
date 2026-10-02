'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/lib/store';
import { STORIES, Story, Chapter } from '@/lib/manga-data';
import { Star, Eye, BookOpen, Lock, CheckCircle2, Users, ArrowLeft, MessageSquare, Send, Sparkles } from 'lucide-react';

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;
  const { unlockedChapters, setUnlockTarget, comments, addComment, role } = useApp();

  const [activeTab, setActiveTab] = useState<'chapters' | 'comments'>('chapters');
  const [commentInput, setCommentInput] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  const story = STORIES.find((s) => s.id === storyId);

  if (!story) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Story Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">The story you are looking for does not exist or has been removed.</p>
        <Link href="/" className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition">
          Return to Home
        </Link>
      </div>
    );
  }

  const storyComments = comments.filter((c) => c.storyId === story.id);

  const handleChapterAction = (chapter: Chapter) => {
    if (chapter.priceCoins === 0 || unlockedChapters.includes(chapter.id)) {
      router.push(`/read/${story.id}/${chapter.id}`);
    } else {
      setUnlockTarget({ story, chapter });
    }
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);
    if (!commentInput.trim()) return;

    // Post to chapter 1 by default for story comments
    const firstChapterId = story.chapters[0]?.id || 'general';
    const result = addComment(story.id, firstChapterId, commentInput);
    if (!result.success) {
      setCommentError(result.error || 'Failed to post comment');
      return;
    }
    setCommentInput('');
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Back button */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Discover
        </Link>
      </div>

      {/* Header Banner */}
      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 mt-2">
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800/80 shadow-2xl p-6 sm:p-8">
          {/* Backdrop blur */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-15 filter blur-xl scale-110"
            style={{ backgroundImage: `url(${story.banner})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/80 to-transparent" />

          <div className="relative flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
            <img
              src={story.cover}
              alt={story.title}
              className="w-40 sm:w-52 aspect-[3/4] object-cover rounded-2xl shadow-2xl border border-slate-700/60 shrink-0"
            />

            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {story.type}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 capitalize">
                  {story.status}
                </span>
                <span className="flex items-center gap-1 text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {story.rating}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 ml-1">
                  <Eye className="w-3.5 h-3.5" /> {story.views} reads
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">{story.title}</h1>

              <div className="flex items-center gap-4 text-xs text-slate-400">
                <div><span className="text-slate-500">Author:</span> <span className="font-semibold text-slate-200">{story.author}</span></div>
                <div><span className="text-slate-500">Artist:</span> <span className="font-semibold text-slate-200">{story.artist}</span></div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">{story.synopsis}</p>

              {/* Creator Team Split Badge (FR-C3, FR-M4) */}
              <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 max-w-xl">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5 text-indigo-400">
                    <Users className="w-4 h-4" /> Creator Team Revenue Split (FR-C3)
                  </span>
                  <span className="text-[11px] text-slate-400">Sums to 100%</span>
                </div>
                <div className="flex gap-2 w-full h-2 rounded-full overflow-hidden bg-slate-800 mb-2">
                  {story.creatorSplits.map((sp, idx) => (
                    <div
                      key={sp.creatorId}
                      className={idx === 0 ? 'bg-indigo-500' : 'bg-rose-500'}
                      style={{ width: `${sp.percentage}%` }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {story.creatorSplits.map((sp, idx) => (
                    <div key={sp.creatorId} className="flex items-center gap-1.5 text-slate-400">
                      <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-indigo-400' : 'bg-rose-400'}`} />
                      <span className="text-slate-200 font-medium">{sp.name}</span>
                      <span className="text-slate-400">({sp.role})</span>
                      <span className="text-indigo-400 font-bold">{sp.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
        <div className="flex border-b border-slate-800 gap-6 text-sm font-bold">
          <button
            onClick={() => setActiveTab('chapters')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'chapters' ? 'border-rose-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Chapters ({story.chapters.length})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'comments' ? 'border-rose-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> All Comments ({storyComments.length}) (FR-CM3)
          </button>
        </div>

        {/* Tab 1: Chapters Table */}
        {activeTab === 'chapters' && (
          <div className="mt-6 space-y-3">
            {story.chapters.map((chap) => {
              const isUnlocked = chap.priceCoins === 0 || unlockedChapters.includes(chap.id);
              return (
                <div
                  key={chap.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:bg-slate-900 hover:border-slate-700 transition group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-300 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition">
                      {chap.orderIndex}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-rose-400 transition">{chap.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{chap.releaseDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isUnlocked ? (
                      <button
                        onClick={() => handleChapterAction(chap)}
                        className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Read Free
                      </button>
                    ) : (
                      <button
                        onClick={() => handleChapterAction(chap)}
                        className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" /> Unlock 🪙 {chap.priceCoins}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Story-wide Comments (FR-CM3) */}
        {activeTab === 'comments' && (
          <div className="mt-6 max-w-3xl space-y-6">
            {/* Post comment form */}
            <form onSubmit={handlePostComment} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Post a comment on this story</span>
                <span className="text-indigo-400 font-semibold">Active role: {role}</span>
              </div>
              <textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Share your thoughts or theories about this series..."
                className="w-full h-24 p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
              />
              {commentError && (
                <p className="text-xs text-rose-400">{commentError}</p>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 hover:from-rose-400 hover:to-rose-500 transition"
                >
                  <Send className="w-3.5 h-3.5" /> Post Comment
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-3.5">
              {storyComments.length === 0 ? (
                <p className="text-center py-10 text-xs text-slate-500">No comments yet. Be the first to share your thoughts!</p>
              ) : (
                storyComments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 ${
                      comment.parentId ? 'ml-6 border-l-2 border-l-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img src={comment.avatar} alt={comment.authorName} className="w-7 h-7 rounded-full bg-slate-800" />
                        <div>
                          <span className="text-xs font-bold text-white">{comment.authorName}</span>
                          <span className="text-[10px] text-slate-400 ml-2">{comment.createdAt.slice(0, 10)}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {comment.chapterTitle}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{comment.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
