import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CoverCard from '@/components/CoverCard';
import StoryActions from '@/components/StoryActions';
import ChapterList from '@/components/ChapterList';
import { STORIES, getRecentChapters, getStory } from '@/lib/data';

export function generateStaticParams() {
  return STORIES.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = getStory(id);
  if (!s) return {};
  return {
    title: `${s.title} — มังงะฮับ`,
    description: `${s.desc} · ${s.type} ${s.status} รวม ${s.chapters} ตอน (FR-SEO1)`,
    alternates: { canonical: `/story/${s.id}` },
  };
}

// FR-C1 story detail + FR-C2 chapters + FR-U3 attestation note + FR-G1 age gate chip
export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = getStory(id);
  if (!story) notFound();
  const chapters = getRecentChapters(story);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: story.title,
    bookFormat: story.type === 'มังงะ' ? 'ComicStory' : 'Novel',
    numberOfPages: story.chapters,
    inLanguage: 'th',
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link className="back-link" href="/">
        ← กลับหน้าแรก
      </Link>

      <div className="story-hero">
        <CoverCard story={story} />
        <div>
          <div className="meta-chips">
            <span className="mchip hot">🔥 มาแรง #2</span>
            <span className="mchip">{story.type}</span>
            <span className="mchip">{story.status}</span>
            <span className="mchip">17+ ยืนยันอายุก่อนอ่าน (FR-G1)</span>
          </div>
          <h1>{story.title}</h1>
          <div className="story-byline">
            โดยทีม CloudTrans · แปล พิสูจน์อักษร แต่งภาพ ลงตอน (FR-T1) · ★ {story.rating} · ติดตาม 12.4k
          </div>
          <p className="syn">{story.desc} อัปเดตทุกวันศุกร์ ปลดล็อกก่อนใครด้วยเหรียญ แล้วอ่านฟรีอัตโนมัติหลัง N วัน (FR-E1/FR-X4)</p>
          <StoryActions story={story} />
          <div className="split">
            💰 ส่วนแบ่งทีมวาด — แปล 50% · พิสูจน์ 20% · แต่งภาพ 30% = 100% (FR-M3/M4)
            <div className="split-bar">
              <i style={{ flex: 50, background: '#7C9BF4' }} />
              <i style={{ flex: 20, background: '#7ED0A5' }} />
              <i style={{ flex: 30, background: '#F5B544' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <a className="on" href="#chapters">
          ตอนทั้งหมด {story.chapters}
        </a>
        <a href="#comments">คอมเมนต์ 1.2k</a>
        <a href="#about">รายละเอียด</a>
      </div>

      <ChapterList story={story} chapters={chapters} />
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
        อัปโหลดพร้อมคำรับรองสิทธิ์แล้ว (FR-U3) · ถ้าโดน takedown รายได้ฝั่งนี้จะถูก reverse + คืนเหรียญผู้ซื้ออัตโนมัติ (FR-M6/FR-D2)
      </p>

      <div id="comments">
        <div className="comment">
          <div className="who">
            <span className="ava" style={{ background: '#7C9BF4' }}>
              M
            </span>
            <b>mint_reader</b>
            <span style={{ color: 'var(--muted)' }}>· ตอนที่ 9 · 2 ชม.ก่อน</span>
          </div>
          <p style={{ fontSize: 13.5, margin: '8px 0 0' }}>
            ตอนนี้ร้องไห้เลย… ฉากจดหมายทำถึงมาก <span style={{ color: 'var(--muted)' }}>(สปอยล์ตอนที่ยังอ่านไม่ถึงจะถูกพับไว้ — FR-CM6)</span>
          </p>
        </div>
        <div className="comment">
          <div className="who">
            <span className="ava" style={{ background: '#E5484D' }}>
              C
            </span>
            <b>CloudTrans (ทีมวาด 📌)</b>
            <span style={{ color: 'var(--muted)' }}>· ปักหมุด</span>
          </div>
          <p style={{ fontSize: 13.5, margin: '8px 0 0' }}>
            ขอบคุณทุกทิป! ตอนหน้าลงวันศุกร์ 2 ทุ่มนะคะ (ปักหมุด/ซ่อนได้เฉพาะเรื่องตัวเอง — FR-CM8)
          </p>
        </div>
      </div>

      <div id="about" style={{ marginTop: 16 }}>
        <div className="meta-chips">
          {story.tags.map((t) => (
            <Link className="mchip" key={t} href={`/?q=${encodeURIComponent(t)}`}>
              #{t}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
