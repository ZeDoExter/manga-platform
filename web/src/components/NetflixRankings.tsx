'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Story } from '@/lib/data';
import { Trophy, ChevronLeft, ChevronRight, Star, Eye } from 'lucide-react';

interface Props {
  stories: Story[];
}

export function NetflixRankings({ stories }: Props) {
  const railRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!railRef.current) return;
    const delta = direction === 'left' ? -380 : 380;
    railRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <section className="section-container">
      {/* Header with Title and Scroll Arrow Controls */}
      <div className="section-head" style={{ marginBottom: 12 }}>
        <div className="section-title">
          <Trophy className="section-title-icon" style={{ width: 22, height: 22, color: 'var(--coin)' }} />
          <span style={{ fontSize: 19, fontWeight: 800 }}>ท็อป 10 อันดับยอดนิยม</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => handleScroll('left')}
            className="btn btn-secondary btn-sm"
            style={{ width: 34, height: 34, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="เลื่อนไปทางซ้าย"
            aria-label="เลื่อนซ้าย"
          >
            <ChevronLeft style={{ width: 17, height: 17 }} />
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="btn btn-secondary btn-sm"
            style={{ width: 34, height: 34, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="เลื่อนไปทางขวา"
            aria-label="เลื่อนขวา"
          >
            <ChevronRight style={{ width: 17, height: 17 }} />
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Rail */}
      <div
        ref={railRef}
        className="netflix-rail"
        style={{
          display: 'flex',
          gap: 24,
          overflowX: 'auto',
          padding: '16px 8px 28px',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none',
        }}
      >
        {stories.map((story, idx) => {
          const rank = idx + 1;
          const isRank1 = rank === 1;

          return (
            <Link
              key={story.id}
              href={`/story/${story.id}`}
              className="netflix-item-container"
              style={{
                flex: '0 0 auto',
                scrollSnapAlign: 'start',
                display: 'flex',
                alignItems: 'flex-end',
                textDecoration: 'none',
                position: 'relative',
              }}
            >
              {/* Giant Full-Height Number (Height equals cover height!) */}
              <div
                className="netflix-giant-num"
                style={{
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  fontSize: 'clamp(160px, 18vw, 220px)',
                  fontWeight: 950,
                  lineHeight: 0.74,
                  height: 230,
                  display: 'flex',
                  alignItems: 'flex-end',
                  color: '#08090c',
                  WebkitTextStroke: isRank1 ? '4.5px #f5a623' : '3.8px #525a6c',
                  marginRight: -40,
                  zIndex: 10,
                  userSelect: 'none',
                  flexShrink: 0,
                  filter: 'drop-shadow(4px 4px 12px rgba(0, 0, 0, 0.85))',
                  transition: 'all 0.22s ease',
                }}
              >
                {rank}
              </div>

              {/* Vertical Poster Card */}
              <div
                className="netflix-poster-card"
                style={{
                  position: 'relative',
                  width: 160,
                  height: 230,
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
                  background: 'var(--surface)',
                  flexShrink: 0,
                  transition: 'transform 0.22s ease, border-color 0.22s ease',
                }}
              >
                <img
                  src={story.cover}
                  alt={story.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  loading="lazy"
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, transparent 50%, rgba(9, 10, 15, 0.95) 100%)',
                  }}
                />

                {/* Card Bottom Meta */}
                <div
                  style={{
                    position: 'absolute',
                    left: 8,
                    right: 8,
                    bottom: 8,
                    zIndex: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                    }}
                  >
                    {story.title}
                  </span>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 2,
                    }}
                  >
                    <Star style={{ width: 10, height: 10, fill: 'var(--coin)', color: 'var(--coin)' }} />
                    <span>{story.rating}</span>
                    <span>•</span>
                    <span>{story.views}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
