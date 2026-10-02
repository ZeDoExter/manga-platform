import type { Metadata } from 'next';
import Link from 'next/link';
import CoverCard from '@/components/CoverCard';
import { STORIES, Story, resumeChapter } from '@/lib/data';
import {
  Flame,
  Play,
  BookOpen,
  ArrowRight,
  Clock,
  Trophy,
  Layers,
  Sparkles,
  Star,
  Eye,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'DooToon — ดูตูน แพลตฟอร์มมังงะและนิยายออนไลน์',
  description: 'ดูตูน แพลตฟอร์มมังงะและนิยายออนไลน์ อัปเดตตอนใหม่ทุกวัน ภาพคมชัด ไร้โฆษณากวนใจ',
};

const CHIPS = ['ทั้งหมด', 'มังงะ', 'นิยาย', 'จบแล้ว', 'ฟรี'];

function matchQuery(q: string) {
  const t = q.trim();
  if (!t || t === 'ทั้งหมด') return STORIES;
  if (t === 'ฟรี') return STORIES.filter((s) => s.price === 0);
  return STORIES.filter(
    (s) => s.title.includes(t) || s.type === t || s.status === t || s.tags.some((tag) => tag.includes(t)),
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const list = matchQuery(q);
  const continueReading = STORIES.filter((s) => s.progress > 0);
  const featured = STORIES[0]; // Hero spotlight

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 60 }}>
      {/* ========================================================================= */}
      {/* SECTION 1: HERO SPOTLIGHT (DOOTOON BANNER)                                */}
      {/* ========================================================================= */}
      {!q && (
        <section className="hero-wrap">
          <div
            className="hero-bg"
            style={{ backgroundImage: `url(${featured.banner})` }}
          />
          <div className="hero-gradient" />

          <div className="wrap" style={{ height: '100%' }}>
            <div className="hero-box">
              <div className="hero-tag-row">
                <span className="hero-kicker">
                  <Flame style={{ width: 13, height: 13 }} />
                  <span>อันดับ 1 มาแรง</span>
                </span>
                <span className="badge badge-rank-n">{featured.type}</span>
                <span className="badge badge-coin">
                  <Star style={{ width: 11, height: 11, fill: 'currentColor' }} />
                  <span>{featured.rating}</span>
                </span>
                <span className="hero-stat">
                  <Eye style={{ width: 13, height: 13 }} />
                  <span>{featured.views} ยอดอ่าน</span>
                </span>
              </div>

              <h1 className="hero-heading">{featured.title}</h1>
              <p className="hero-desc">{featured.desc}</p>

              <div className="hero-meta-tags">
                {featured.tags.map((tag) => (
                  <span key={tag} className="hero-meta-tag">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="hero-buttons">
                <Link className="btn btn-primary" href={`/read/${featured.id}/1`}>
                  <Play style={{ width: 15, height: 15, fill: '#fff' }} />
                  <span>เริ่มอ่านตอนที่ 1 (ฟรี)</span>
                </Link>
                <Link className="btn btn-secondary" href={`/story/${featured.id}`}>
                  <BookOpen style={{ width: 15, height: 15 }} />
                  <span>รายละเอียดเรื่อง</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="wrap">
        {/* ========================================================================= */}
        {/* SECTION 2: กำลังอ่านค้างไว้ (CONTINUE READING ROW - FR-L1)                 */}
        {/* ========================================================================= */}
        {!q && continueReading.length > 0 && (
          <section className="section-container">
            <div className="section-head">
              <div className="section-title">
                <Clock className="section-title-icon" style={{ width: 20, height: 20, color: '#38bdf8' }} />
                <span>กำลังอ่านค้างไว้</span>
              </div>
              <span className="section-more" style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                ซิงค์ประวัติอัตโนมัติ (FR-L1)
              </span>
            </div>

            <div className="continue-rail">
              {continueReading.map((story) => {
                const ch = resumeChapter(story);
                return (
                  <Link key={story.id} className="continue-item" href={`/read/${story.id}/${ch}`}>
                    <img src={story.cover} alt={story.title} className="continue-cover" loading="lazy" />
                    <div className="continue-detail">
                      <span className="continue-name">{story.title}</span>
                      <span className="continue-ch-label">อ่านถึงตอนที่ {ch}</span>

                      <div className="continue-bar-container">
                        <div className="continue-track">
                          <div className="continue-fill" style={{ width: `${story.progress}%` }} />
                        </div>
                        <span className="continue-pct-text">{story.progress}%</span>
                      </div>
                    </div>
                    <ArrowRight style={{ width: 15, height: 15, color: 'var(--text-muted)' }} />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: ชาร์ตอันดับยอดนิยม (WEEKLY TOP RANKINGS 1, 2, 3...)            */}
        {/* ========================================================================= */}
        {!q && (
          <section className="section-container">
            <div className="section-head">
              <div className="section-title">
                <Trophy className="section-title-icon" style={{ width: 20, height: 20, color: 'var(--coin)' }} />
                <span>อันดับยอดนิยมประจำสัปดาห์</span>
              </div>
              <Link href="/?q=ทั้งหมด" className="section-more">
                <span>ดูทั้งหมด</span>
                <ArrowRight style={{ width: 14, height: 14 }} />
              </Link>
            </div>

            <div className="rankings-grid">
              {STORIES.slice(0, 4).map((story, idx) => {
                const rank = idx + 1;
                const badgeClass =
                  rank === 1
                    ? 'badge-rank-1'
                    : rank === 2
                    ? 'badge-rank-2'
                    : rank === 3
                    ? 'badge-rank-3'
                    : 'badge-rank-n';

                return (
                  <Link key={story.id} className="rank-card" href={`/story/${story.id}`}>
                    <div className={`rank-number-box ${badgeClass}`}>{rank}</div>
                    <img src={story.cover} alt={story.title} className="rank-thumb" loading="lazy" />
                    <div className="rank-content">
                      <span className="rank-genre">{story.tags.slice(0, 2).join(' • ')}</span>
                      <span className="rank-title">{story.title}</span>

                      <div className="rank-stats-row">
                        <span className="rank-stats-item" style={{ color: 'var(--coin)' }}>
                          <Star style={{ width: 11, height: 11, fill: 'currentColor' }} />
                          {story.rating}
                        </span>
                        <span className="rank-stats-item">
                          <Eye style={{ width: 11, height: 11 }} />
                          {story.views}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: อัปเดตตอนใหม่ล่าสุด (LATEST CHAPTER UPDATES)                   */}
        {/* ========================================================================= */}
        {!q && (
          <section className="section-container">
            <div className="section-head">
              <div className="section-title">
                <Sparkles className="section-title-icon" style={{ width: 20, height: 20 }} />
                <span>อัปเดตตอนใหม่ล่าสุด</span>
              </div>
              <span className="section-more" style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                อัปเดตทุกวัน
              </span>
            </div>

            <div className="updates-grid">
              {STORIES.slice(0, 6).map((story) => (
                <div key={story.id} className="update-card">
                  <Link href={`/story/${story.id}`}>
                    <img src={story.cover} alt={story.title} className="update-img" loading="lazy" />
                  </Link>
                  <div className="update-meta">
                    <Link href={`/story/${story.id}`} className="update-name">
                      {story.title}
                    </Link>
                    <span className="update-creator">{story.author}</span>

                    <div className="update-ch-bar">
                      <Link href={`/read/${story.id}/${story.chapters}`} className="update-ch-link">
                        <span>ตอนที่ {story.chapters}</span>
                        {story.price === 0 ? (
                          <span style={{ color: 'var(--success)', fontSize: 10 }}>ฟรี</span>
                        ) : (
                          <span style={{ color: 'var(--coin)', fontSize: 10 }}>{story.price} เหรียญ</span>
                        )}
                      </Link>
                      <span className="update-time-tag">{story.updatedAt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 5: สำรวจเรื่องทั้งหมด (CATALOG BROWSER)                           */}
        {/* ========================================================================= */}
        <section className="section-container">
          <div className="section-head">
            <div className="section-title">
              <Layers className="section-title-icon" style={{ width: 20, height: 20, color: '#a78bfa' }} />
              <span>{q ? `ผลการค้นหา: "${q}"` : 'สำรวจเรื่องทั้งหมด'}</span>
            </div>
            <span className="section-more" style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              {list.length} เรื่อง
            </span>
          </div>

          {/* Filter Chips */}
          <div className="filter-chips-rail">
            {CHIPS.map((chip) => {
              const active = (!q && chip === 'ทั้งหมด') || q === chip;
              const href = chip === 'ทั้งหมด' ? '/' : `/?q=${encodeURIComponent(chip)}`;
              return (
                <Link key={chip} className={`filter-chip ${active ? 'active' : ''}`} href={href}>
                  {chip}
                </Link>
              );
            })}
          </div>

          {/* Grid */}
          <div className="catalog-grid">
            {list.map((story) => (
              <Link key={story.id} href={`/story/${story.id}`}>
                <CoverCard story={story} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
