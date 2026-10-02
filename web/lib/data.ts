// Mock catalog data (FR-C1/FR-C2). Real source: `catalog` Go service.
export type StoryType = 'มังงะ' | 'นิยาย';

export interface CreatorSplit {
  name: string;
  role: string;
  percentage: number;
}

export interface Story {
  id: string;
  title: string;
  type: StoryType;
  status: 'ต่อเนื่อง' | 'จบแล้ว';
  tags: string[];
  chapters: number;
  updatedAt: string;
  progress: number; // 0-100%
  price: number;    // 0 = free
  desc: string;
  rating: string;
  views: string;
  cover: string;
  banner: string;
  author: string;
  artist: string;
  creatorSplits: CreatorSplit[];
}

export const STORIES: Story[] = [
  {
    id: '1',
    title: 'ดาบหิมะเลือดมังกร',
    type: 'มังงะ',
    status: 'จบแล้ว',
    tags: ['แอ็กชัน', 'กำลังภายใน', 'แฟนตาซี'],
    chapters: 68,
    updatedAt: '2 ชม.ก่อน',
    progress: 72,
    price: 0,
    desc: 'จอมยุทธ์หนุ่มกับดาบต้องสาปที่ตื่นขึ้นทุกครั้งที่หิมะแรกโปรยปราย ศึกสุดท้ายของสำนักที่ไม่มีใครอยากจดจำเพื่อปกป้องยุทธภพ',
    rating: '4.9',
    views: '1.2M',
    cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80',
    author: 'กิมย้งน้อย',
    artist: 'สตูดิโอเฟิงหลิน',
    creatorSplits: [
      { name: 'กิมย้งน้อย', role: 'ผู้แต่งเนื้อเรื่อง', percentage: 70 },
      { name: 'สตูดิโอเฟิงหลิน', role: 'ผู้วาดภาพประกอบ', percentage: 30 },
    ],
  },
  {
    id: '2',
    title: 'คืนนี้ฟ้ามีแค่เรา',
    type: 'นิยาย',
    status: 'ต่อเนื่อง',
    tags: ['โรแมนซ์', 'ดราม่า', 'อบอุ่นหัวใจ'],
    chapters: 142,
    updatedAt: '12 นาทีที่แล้ว',
    progress: 35,
    price: 5,
    desc: 'เธอพบกล่องจดหมายที่ไม่เคยถูกส่งในร้านชำยามวิกาล ทุกฉบับจ่าหน้าถึงเธอในอนาคต พร้อมคำสัญญาที่ไม่เคยเลือนหาย',
    rating: '4.8',
    views: '890K',
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    author: 'แสงจันทร์สีคราม',
    artist: 'พิมพ์พิศา',
    creatorSplits: [
      { name: 'แสงจันทร์สีคราม', role: 'ผู้เขียนนวนิยาย', percentage: 100 },
    ],
  },
  {
    id: '3',
    title: 'ร้านชำยามวิกาล',
    type: 'มังงะ',
    status: 'ต่อเนื่อง',
    tags: ['สไลซ์ออฟไลฟ์', 'ลึกลับ', 'เยียวยาใจ'],
    chapters: 24,
    updatedAt: '1 ชม.ก่อน',
    progress: 90,
    price: 3,
    desc: 'ร้านชำอบอุ่นที่เปิดเฉพาะคนนอนไม่หลับ กับเจ้าของร้านผู้ลึกลับที่จำรสชาติความทรงจำของลูกค้าทุกคนได้อย่างแม่นยำ',
    rating: '4.95',
    views: '2.1M',
    cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80',
    author: 'มิดไนท์',
    artist: 'คิมฮารุ',
    creatorSplits: [
      { name: 'มิดไนท์', role: 'ผู้แต่ง', percentage: 60 },
      { name: 'คิมฮารุ', role: 'ผู้วาด', percentage: 40 },
    ],
  },
  {
    id: '4',
    title: 'เนโครแมนเซอร์ฝึกหัด',
    type: 'มังงะ',
    status: 'ต่อเนื่อง',
    tags: ['แฟนตาซี', 'แอ็กชัน', 'ระบบ'],
    chapters: 51,
    updatedAt: 'เมื่อวาน',
    progress: 12,
    price: 5,
    desc: 'ปลุกผีครั้งแรกก็ทำหอคอยระเบิด เด็กฝึกหัดสายเวทดำสุดซื่อกับอาจารย์จอมโหดในดันเจี้ยนระดับ S',
    rating: '4.7',
    views: '1.5M',
    cover: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
    author: 'เรดไอซ์',
    artist: 'ทีมสตูดิโอ',
    creatorSplits: [
      { name: 'เรดไอซ์', role: 'ผู้เขียน', percentage: 65 },
      { name: 'ทีมสตูดิโอ', role: 'ผู้จัดทำภาพ', percentage: 35 },
    ],
  },
  {
    id: '5',
    title: 'บันทึกดาวตก',
    type: 'นิยาย',
    status: 'จบแล้ว',
    tags: ['ไซไฟ', 'ผจญภัย', 'อวกาศ'],
    chapters: 89,
    updatedAt: '3 วันที่แล้ว',
    progress: 0,
    price: 0,
    desc: 'สัญญาณคลื่นวิทยุประหลาดจากขอบกาแล็กซีที่ตรงกับสมุดบันทึกโบราณของคุณปู่ทุกตัวอักษร',
    rating: '4.65',
    views: '650K',
    cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    author: 'ดร.พงศ์',
    artist: 'อาร์ตสเปซ',
    creatorSplits: [
      { name: 'ดร.พงศ์', role: 'ผู้ประพันธ์', percentage: 100 },
    ],
  },
  {
    id: '6',
    title: 'ครัวหลังวังย้อนยุค',
    type: 'มังงะ',
    status: 'ต่อเนื่อง',
    tags: ['อาหาร', 'ย้อนยุค', 'ตลก'],
    chapters: 33,
    updatedAt: '5 ชม.ก่อน',
    progress: 55,
    price: 4,
    desc: 'เชฟมิชลินหนุ่มประสบอุบัติเหตุตื่นขึ้นมาในครัวหลวงยุคโบราณ กับภารกิจทำสำรับรสเลิศเพื่อเอาตัวรอด',
    rating: '4.85',
    views: '1.7M',
    cover: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80',
    author: 'เชฟตั้ม',
    artist: 'ลายเส้นไทย',
    creatorSplits: [
      { name: 'เชฟตั้ม', role: 'เนื้อเรื่อง', percentage: 70 },
      { name: 'ลายเส้นไทย', role: 'วาดภาพ', percentage: 30 },
    ],
  },
];

export function getStory(id: string): Story | undefined {
  return STORIES.find((s) => s.id === id);
}

export function resumeChapter(story: Story): number {
  if (!story.progress) return 1;
  return Math.max(1, Math.min(story.chapters, Math.round((story.chapters * story.progress) / 100)));
}

export interface Chapter {
  n: number;
  title: string;
  kind: string;
  price: number;
  freeIn?: string;
  pages?: string[];
  novelText?: string;
}

const MANGA_PAGES_POOL = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=900&auto=format&fit=crop&q=80',
];

const NOVEL_SAMPLE_TEXT = `สายลมหนาวพัดผ่านยอดสนโบราณจนกิ่งไม้สั่นไหวอย่างแผ่วเบา

เขาเปิดตามองเพดานหินสูงตระหง่าน บาดแผลจากคมดาบเมื่อครั้งศึกที่หน้าด่านยังคงทิ้งรอยชาไว้ที่หัวไหล่ขวา แต่สิ่งที่เจ็บปวดยิ่งกว่าคือคำสั่งสุดท้ายของสำนัก

"เจ้าต้องมีชีวิตอยู่ต่อไป" เสียงอันแผ่วเบาของอาจารย์ดั่งยังก้องอยู่ในม่านหมอก

ข้างนอกเสียงระฆังประจำวิหารดังเหง่งหง่างสามครา บ่งบอกว่าผู้ตรวจการของราชสำนักได้เดินทางมาถึงเชิงผาแล้ว เขาคว้าด้ามดาบสีดำสนิทที่วางข้างตัวขึ้นมา สัมผัสเย็นเยียบของเหล็กกล้าตอกย้ำว่าการเดินทางบทใหม่ได้เริ่มต้นขึ้นแล้ว`;

export function chapterPrice(story: Story, n: number): number {
  if (story.price === 0) return 0;
  if (n <= 3) return 0; // 3 ตอนแรกฟรี
  return story.price;
}

export function getChapter(story: Story, n: number): Chapter | undefined {
  if (!Number.isInteger(n) || n < 1 || n > story.chapters) return undefined;
  const price = chapterPrice(story, n);
  return {
    n,
    title: `ตอนที่ ${n}`,
    kind: story.type === 'มังงะ' ? 'ภาพความละเอียดสูง' : 'นิยายตัวอักษร',
    price,
    freeIn: price > 0 && n === story.chapters ? 'ปลดฟรีใน 5 วัน' : undefined,
    pages: story.type === 'มังงะ' ? MANGA_PAGES_POOL : undefined,
    novelText: story.type === 'นิยาย' ? NOVEL_SAMPLE_TEXT : undefined,
  };
}

export function getRecentChapters(story: Story): Chapter[] {
  const out: Chapter[] = [];
  const start = Math.max(1, story.chapters - 7);
  for (let i = story.chapters; i >= start; i--) {
    const ch = getChapter(story, i);
    if (ch) out.push(ch);
  }
  return out;
}

export function chapterKey(storyId: string, n: number): string {
  return `${storyId}#${n}`;
}
