import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReaderView from '@/components/ReaderView';
import { STORIES, getChapter, getRecentChapters, getStory } from '@/lib/data';

export function generateStaticParams() {
  const out: { storyId: string; ch: string }[] = [];
  for (const s of STORIES) {
    for (const c of getRecentChapters(s)) out.push({ storyId: s.id, ch: String(c.n) });
  }
  // ตอนแรกของแต่ละเรื่อง + ตอนค้างอ่าน (กัน deep link หลักพัง)
  for (const s of STORIES) {
    out.push({ storyId: s.id, ch: '1' });
    const resume = Math.max(1, Math.min(s.chapters, Math.round((s.chapters * s.progress) / 100)));
    out.push({ storyId: s.id, ch: String(resume) });
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storyId: string; ch: string }>;
}): Promise<Metadata> {
  const { storyId, ch } = await params;
  const s = getStory(storyId);
  if (!s) return {};
  return {
    title: `${s.title} ตอนที่ ${ch} — มังงะฮับ`,
    description: `อ่าน${s.title} ตอนที่ ${ch} ${s.type === 'มังงะ' ? 'ภาพคมชัด' : 'ตัวอักษรปรับขนาดได้'} โหมดมืดถนอมสายตา (FR-R1/FR-R2)`,
  };
}

// หน้าอ่าน SSR เปลือก + paywall/entitlement ฝั่ง client (FR-R3: ตรวจสิทธิ์ก่อนเสิร์ฟทุกครั้ง)
export default async function ReadPage({
  params,
}: {
  params: Promise<{ storyId: string; ch: string }>;
}) {
  const { storyId, ch } = await params;
  const story = getStory(storyId);
  if (!story) notFound();
  const n = Number(ch);
  const chapter = getChapter(story, n);
  if (!chapter) notFound();

  return (
    <ReaderView
      story={story}
      chapter={chapter}
      prev={n > 1 ? n - 1 : null}
      next={n < story.chapters ? n + 1 : null}
    />
  );
}
