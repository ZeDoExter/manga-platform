import Link from 'next/link';
import { CoverCard } from '@/components/CoverCard';
import { STORIES, Story } from '@/lib/data';
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

interface SearchProps {
  searchParams: Promise<{ q?: string; type?: string }>;
}

export default async function HomePage({ searchParams }: SearchProps) {
  const { q = '', type = '' } = await searchParams;

  const filteredStories = STORIES.filter((s) => {
    if (type && s.type !== type) return false;
    if (q) {
      const query = q.toLowerCase();
      return (
        s.title.toLowerCase().includes(query) ||
        s.author.toLowerCase().includes(query) ||
        s.tags.some((t) => t.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const featured = STORIES[0]; // Solo Leveling

  const chips = [
    { label: 'ทั้งหมด', href: '/' },
    { label: 'มังงะ', href: '/?type=manga' },
    { label: 'นิยาย', href: '/?type=novel' },
  ];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 60 }}>
      {/* ========================================================================= */}
      {/* SECTION 1: HERO SPOTLIGHT (DOOTOON BANNER)                                */}
      {/* ========================================================================= */}
      {!q && !type && (
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
        {!q && !type && (
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
              <Link className="continue-item" href="/read/solo-leveling/1">
                <img src={featured.cover} alt={featured.title} className="continue-cover" loading="lazy" />
                <div className="continue-detail">
                  <span className="continue-name">{featured.title}</span>
                  <span className="continue-ch-label">อ่านถึงตอนที่ 1</span>
                  <div className="continue-bar-container">
                    <div className="continue-track">
                      <div className="continue-fill" style={{ width: '75%' }} />
                    </div>
                    <span className="continue-pct-text">75%</span>
                  </div>
                </div>
                <ArrowRight style={{ width: 15, height: 15, color: 'var(--text-muted)' }} />
              </Link>

              <Link className="continue-item" href="/read/frieren/1">
                <img src={STORIES[1].cover} alt={STORIES[1].title} className="continue-cover" loading="lazy" />
                <div className="continue-detail">
                  <span className="continue-name">{STORIES[1].title}</span>
                  <span className="continue-ch-label">อ่านถึงตอนที่ 1</span>
                  <div className="continue-bar-container">
                    <div className="continue-track">
                      <div className="continue-fill" style={{ width: '40%' }} />
                    </div>
                    <span className="continue-pct-text">40%</span>
                  </div>
                </div>
                <ArrowRight style={{ width: 15, height: 15, color: 'var(--text-muted)' }} />
              </Link>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: ชาร์ตอันดับยอดนิยม (WEEKLY TOP RANKINGS 1, 2, 3...)            */}
        {/* ========================================================================= */}
        {!q && !type && (
          <section className="section-container">
            <div className="section-head">
              <div className="section-title">
                <Trophy className="section-title-icon" style={{ width: 20, height: 20, color: 'var(--coin)' }} />
                <span>อันดับยอดนิยมประจำสัปดาห์</span>
              </div>
              <Link href="/?type=manga" className="section-more">
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
        {!q && !type && (
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
              {STORIES.map((story) => {
                const latestCh = story.chapters[story.chapters.length - 1];
                return (
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
                        <Link href={`/read/${story.id}/${latestCh ? latestCh.orderIndex : 1}`} className="update-ch-link">
                          <span>ตอนที่ {latestCh ? latestCh.orderIndex : 1}</span>
                          {latestCh && latestCh.priceCoins === 0 ? (
                            <span style={{ color: 'var(--success)', fontSize: 10 }}>ฟรี</span>
                          ) : (
                            <span style={{ color: 'var(--coin)', fontSize: 10 }}>{latestCh?.priceCoins} เหรียญ</span>
                          )}
                        </Link>
                        <span className="update-time-tag">{latestCh?.releaseDate || 'วันนี้'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
              {filteredStories.length} เรื่อง
            </span>
          </div>

          {/* Filter Chips */}
          <div className="filter-chips-rail">
            {chips.map((chip) => {
              const active = (!type && chip.href === '/') || (type && chip.href.includes(type));
              return (
                <Link key={chip.label} className={`filter-chip ${active ? 'active' : ''}`} href={chip.href}>
                  {chip.label}
                </Link>
              );
            })}
          </div>

          {/* Grid */}
          <div className="catalog-grid">
            {filteredStories.map((story) => (
              <CoverCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
