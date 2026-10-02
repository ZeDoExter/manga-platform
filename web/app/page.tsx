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
  CheckCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'DUKETOON — แพลตฟอร์มมังงะและนิยายออนไลน์',
  description: 'อ่านการ์ตูนมังงะและนิยายออนไลน์ อัปเดตตอนใหม่ทุกวัน ภาพคมชัด โหลดไว ไม่มีโฆษณากวนใจ',
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
  const featured = STORIES[0]; // Hero feature

  return (
    <div className="home-container">
      {/* ========================================================================= */}
      {/* SECTION 1: HERO SPOTLIGHT BANNER ("แบบปังๆ คมชัด สไตล์ Duketoon")         */}
      {/* ========================================================================= */}
      {!q && (
        <section className="hero-spotlight">
          {/* Background art with cinematic gradient */}
          <div
            className="hero-backdrop"
            style={{ backgroundImage: `url(${featured.banner})` }}
          />
          <div className="hero-scrim" />

          <div className="hero-content wrap">
            <div className="hero-badge-row">
              <span className="pill-badge pill-hot">
                <Flame style={{ width: 13, height: 13 }} />
                <span>อันดับ 1 ประจำสัปดาห์</span>
              </span>
              <span className="pill-badge pill-type">{featured.type}</span>
              <span className="pill-badge pill-rating">
                <Star style={{ width: 12, height: 12, fill: 'currentColor' }} />
                <span>{featured.rating}</span>
              </span>
              <span className="pill-views">
                <Eye style={{ width: 13, height: 13 }} />
                <span>{featured.views} ยอดอ่าน</span>
              </span>
            </div>

            <h1 className="hero-title">{featured.title}</h1>

            <p className="hero-synopsis">{featured.desc}</p>

            <div className="hero-tags">
              {featured.tags.map((tag) => (
                <span key={tag} className="hero-tag-item">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="hero-actions">
              <Link className="btn btn-primary btn-lg" href={`/read/${featured.id}/1`}>
                <Play style={{ width: 16, height: 16, fill: 'currentColor' }} />
                <span>เริ่มอ่านตอนที่ 1 (ฟรี)</span>
              </Link>
              <Link className="btn btn-lightline btn-lg" href={`/story/${featured.id}`}>
                <BookOpen style={{ width: 16, height: 16 }} />
                <span>รายละเอียดเรื่อง</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="wrap">
        {/* ========================================================================= */}
        {/* SECTION 2: แถบอ่านต่อจากที่ค้างไว้ (CONTINUE READING SHELF - FR-L1, FR-L3) */}
        {/* ========================================================================= */}
        {!q && continueReading.length > 0 && (
          <section className="section-block">
            <div className="sec-head">
              <div className="sec-title-group">
                <Clock style={{ width: 19, height: 19, color: 'var(--sky)' }} />
                <h2>อ่านต่อจากที่ค้างไว้</h2>
              </div>
              <span className="sec-sub">บันทึกตำแหน่งอัตโนมัติ (FR-L1)</span>
            </div>

            <div className="rail">
              {continueReading.map((story) => {
                const ch = resumeChapter(story);
                return (
                  <Link key={story.id} className="continue-card" href={`/read/${story.id}/${ch}`}>
                    <img
                      src={story.cover}
                      alt={story.title}
                      className="continue-thumb"
                      loading="lazy"
                    />
                    <div className="continue-info">
                      <span className="continue-type">{story.type}</span>
                      <b className="continue-title">{story.title}</b>
                      <span className="continue-ch">อ่านถึงตอนที่ {ch}</span>

                      {/* Progress bar */}
                      <div className="continue-bar-wrap">
                        <div className="continue-bar">
                          <i style={{ width: `${story.progress}%` }} />
                        </div>
                        <span className="continue-pct">{story.progress}%</span>
                      </div>
                    </div>
                    <div className="continue-action">
                      <ArrowRight style={{ width: 16, height: 16 }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: ชาร์ตอันดับยอดนิยม (WEEKLY TOP RANKING 1, 2, 3...)            */}
        {/* ========================================================================= */}
        {!q && (
          <section className="section-block">
            <div className="sec-head">
              <div className="sec-title-group">
                <Trophy style={{ width: 19, height: 19, color: 'var(--coin)' }} />
                <h2>ชาร์ตยอดนิยมประจำสัปดาห์</h2>
              </div>
              <Link href="/?q=ทั้งหมด" className="more">
                ดูทั้งหมด
              </Link>
            </div>

            <div className="ranking-grid">
              {STORIES.slice(0, 4).map((story, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                return (
                  <Link key={story.id} className="ranking-card" href={`/story/${story.id}`}>
                    <div className={`ranking-badge rank-${rank}`}>
                      {rank}
                    </div>
                    <img
                      src={story.cover}
                      alt={story.title}
                      className="ranking-thumb"
                      loading="lazy"
                    />
                    <div className="ranking-body">
                      <span className="ranking-genre">{story.tags.slice(0, 2).join(' · ')}</span>
                      <b className="ranking-title">{story.title}</b>
                      <div className="ranking-meta">
                        <span className="ranking-stat">
                          <Star style={{ width: 12, height: 12, fill: 'var(--coin)', color: 'var(--coin)' }} />
                          {story.rating}
                        </span>
                        <span className="ranking-stat">
                          <Eye style={{ width: 12, height: 12 }} />
                          {story.views}
                        </span>
                        <span className="ranking-ch">ตอนที่ {story.chapters}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: อัปเดตตอนใหม่ล่าสุด (LATEST CHAPTER RELEASES)                  */}
        {/* ========================================================================= */}
        {!q && (
          <section className="section-block">
            <div className="sec-head">
              <div className="sec-title-group">
                <Sparkles style={{ width: 19, height: 19, color: 'var(--hanko)' }} />
                <h2>อัปเดตตอนใหม่ล่าสุด</h2>
              </div>
              <span className="sec-sub">อัปเดตตลอด 24 ชั่วโมง</span>
            </div>

            <div className="latest-updates-grid">
              {STORIES.slice(0, 6).map((story) => (
                <div key={story.id} className="update-item">
                  <Link href={`/story/${story.id}`} className="update-thumb-link">
                    <img src={story.cover} alt={story.title} className="update-thumb" loading="lazy" />
                  </Link>
                  <div className="update-info">
                    <Link href={`/story/${story.id}`} className="update-title">
                      {story.title}
                    </Link>
                    <span className="update-author">{story.author}</span>
                    <div className="update-chap-row">
                      <Link href={`/read/${story.id}/${story.chapters}`} className="update-chap-btn">
                        <span>ตอนที่ {story.chapters}</span>
                        {story.price === 0 ? (
                          <span className="free-tag">ฟรี</span>
                        ) : (
                          <span className="coin-tag">เหรียญ</span>
                        )}
                      </Link>
                      <span className="update-time">{story.updatedAt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 5: รายการทั้งหมดและหมวดหมู่ (CATALOG BROWSER)                     */}
        {/* ========================================================================= */}
        <section className="section-block">
          <div className="sec-head" style={{ marginTop: 36 }}>
            <div className="sec-title-group">
              <Layers style={{ width: 19, height: 19, color: 'var(--sage)' }} />
              <h2>{q ? `ผลการค้นหา "${q}"` : 'สำรวจเรื่องทั้งหมด'}</h2>
            </div>
            <span className="sec-sub">พบ {list.length} เรื่อง</span>
          </div>

          {/* Filter Chips */}
          <div className="chips-row">
            {CHIPS.map((c) => {
              const active = (!q && c === 'ทั้งหมด') || q === c;
              const href = c === 'ทั้งหมด' ? '/' : `/?q=${encodeURIComponent(c)}`;
              return (
                <Link key={c} className={`chip-btn ${active ? 'active' : ''}`} href={href}>
                  {c}
                </Link>
              );
            })}
          </div>

          {/* Stories Grid */}
          {list.length === 0 ? (
            <div className="empty-box">
              <p>ไม่พบเรื่องที่ค้นหา ลองค้นหาด้วยคำอื่น หรือกดดู "ทั้งหมด"</p>
              <Link className="btn btn-primary" href="/">
                ดูเรื่องทั้งหมด
              </Link>
            </div>
          ) : (
            <div className="grid-shelf">
              {list.map((story) => (
                <Link key={story.id} href={`/story/${story.id}`} className="story-card-link">
                  <CoverCard story={story} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
