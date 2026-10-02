export type StoryType = 'manga' | 'novel';

export interface CreatorSplit {
  name: string;
  role: string;
  percentage: number;
}

export interface Chapter {
  id: string;
  storyId: string;
  orderIndex: number;
  title: string;
  priceCoins: number; // 0 = free
  pages?: string[];   // image URLs for manga
  novelText?: string; // formatted text for novel
  releaseDate: string;
}

export interface Story {
  id: string;
  title: string;
  type: StoryType;
  cover: string;
  banner: string;
  desc: string;
  author: string;
  artist: string;
  creatorSplits: CreatorSplit[];
  tags: string[];
  rating: string;
  views: string;
  status: 'ต่อเนื่อง' | 'จบแล้ว';
  chapters: Chapter[];
}

const MANGA_PAGES_SOLO = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=900&auto=format&fit=crop&q=80',
];

const MANGA_PAGES_FRIEREN = [
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&auto=format&fit=crop&q=80',
];

const NOVEL_TEXT_TBATE = `สายลมหนาวพัดผ่านยอดสนโบราณจนกิ่งไม้สั่นไหวอย่างแผ่วเบา

เขาเปิดตามองเพดานหินสูงตระหง่าน บาดแผลจากคมดาบเมื่อครั้งศึกที่หน้าด่านยังคงทิ้งรอยชาไว้ที่หัวไหล่ขวา แต่สิ่งที่เจ็บปวดยิ่งกว่าคือคำสั่งสุดท้ายของสำนัก

"เจ้าต้องมีชีวิตอยู่ต่อไป" เสียงอันแผ่วเบาของอาจารย์ดั่งยังก้องอยู่ในม่านหมอก

ข้างนอกเสียงระฆังประจำวิหารดังเหง่งหง่างสามครา บ่งบอกว่าผู้ตรวจการของราชสำนักได้เดินทางมาถึงเชิงผาแล้ว เขาคว้าด้ามดาบสีดำสนิทที่วางข้างตัวขึ้นมา สัมผัสเย็นเยียบของเหล็กกล้าตอกย้ำว่าการเดินทางบทใหม่ได้เริ่มต้นขึ้นแล้ว`;

export const STORIES: Story[] = [
  {
    id: 'solo-leveling',
    title: 'Solo Leveling: Ragnarok',
    type: 'manga',
    cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80',
    desc: 'ประตูมิติปริศนาเปิดขึ้นอีกครั้ง เมื่อทวยเทพจากห้วงอวกาศเริ่มรุกรานโลก ทายาทแห่งราชันเงาจึงตื่นขึ้นเพื่อสืบทอดพลังและปกป้องมนุษยชาติ',
    author: 'Chugong',
    artist: 'REDICE Studio',
    creatorSplits: [
      { name: 'Chugong', role: 'ผู้แต่งเนื้อเรื่อง', percentage: 70 },
      { name: 'REDICE Studio', role: 'ผู้วาดภาพประกอบ', percentage: 30 },
    ],
    tags: ['แอ็กชัน', 'แฟนตาซี', 'พลังพิเศษ', 'มาแรง'],
    rating: '4.95',
    views: '2.4M',
    status: 'ต่อเนื่อง',
    chapters: [
      {
        id: 'sl-1',
        storyId: 'solo-leveling',
        orderIndex: 1,
        title: 'ตอนที่ 1: ผู้สืบทอดบัลลังก์เงา',
        priceCoins: 0,
        pages: MANGA_PAGES_SOLO,
        releaseDate: '10 นาทีที่แล้ว',
      },
      {
        id: 'sl-2',
        storyId: 'solo-leveling',
        orderIndex: 2,
        title: 'ตอนที่ 2: การตื่นขึ้นของประตูนรก',
        priceCoins: 40,
        pages: MANGA_PAGES_SOLO,
        releaseDate: '2 วันที่แล้ว',
      },
      {
        id: 'sl-3',
        storyId: 'solo-leveling',
        orderIndex: 3,
        title: 'ตอนที่ 3: กองทัพเงาสงคราม',
        priceCoins: 50,
        pages: MANGA_PAGES_SOLO,
        releaseDate: '5 วันที่แล้ว',
      },
    ],
  },
  {
    id: 'frieren',
    title: 'คำอธิษฐานในวันที่จากลา',
    type: 'manga',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80',
    desc: 'การเดินทางของปาร์ตี้ผู้กล้าได้สิ้นสุดลงแล้ว แต่ชีวิตของเอลฟ์นักเวทผู้มีอายุขัยนับพันปีกำลังเริ่มต้นใหม่อีกครั้งเพื่อทำความเข้าใจหัวใจของมนุษย์',
    author: 'Kanehito Yamada',
    artist: 'Tsukasa Abe',
    creatorSplits: [
      { name: 'Kanehito Yamada', role: 'เนื้อเรื่อง', percentage: 65 },
      { name: 'Tsukasa Abe', role: 'ภาพประกอบ', percentage: 35 },
    ],
    tags: ['แฟนตาซี', 'อบอุ่นหัวใจ', 'การผจญภัย'],
    rating: '4.98',
    views: '3.1M',
    status: 'ต่อเนื่อง',
    chapters: [
      {
        id: 'fr-1',
        storyId: 'frieren',
        orderIndex: 1,
        title: 'ตอนที่ 1: จุดสิ้นสุดของการผจญภัย',
        priceCoins: 0,
        pages: MANGA_PAGES_FRIEREN,
        releaseDate: '1 ชม.ก่อน',
      },
      {
        id: 'fr-2',
        storyId: 'frieren',
        orderIndex: 2,
        title: 'ตอนที่ 2: คำโกหกของนักบวช',
        priceCoins: 35,
        pages: MANGA_PAGES_FRIEREN,
        releaseDate: '3 วันที่แล้ว',
      },
    ],
  },
  {
    id: 'tbate',
    title: 'วันที่ข้าได้เกิดใหม่เป็นราชา',
    type: 'novel',
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    desc: 'อดีตราชาผู้ยิ่งใหญ่เกิดใหม่ในโลกเวทมนตร์และสัตว์อสูร โอกาสครั้งที่สองที่จะได้สัมผัสความอบอุ่นของครอบครัวและพลังที่แท้จริง',
    author: 'TurtleMe',
    artist: 'Fuyuki23',
    creatorSplits: [
      { name: 'TurtleMe', role: 'ผู้เขียนนวนิยาย', percentage: 100 },
    ],
    tags: ['นิยาย', 'เกิดใหม่', 'เวทมนตร์', 'ผจญภัย'],
    rating: '4.92',
    views: '1.8M',
    status: 'ต่อเนื่อง',
    chapters: [
      {
        id: 'tb-1',
        storyId: 'tbate',
        orderIndex: 1,
        title: 'ตอนที่ 1: ราชาผู้ไร้หัวใจ',
        priceCoins: 0,
        novelText: NOVEL_TEXT_TBATE,
        releaseDate: '3 ชม.ก่อน',
      },
      {
        id: 'tb-2',
        storyId: 'tbate',
        orderIndex: 2,
        title: 'ตอนที่ 2: แก่นแท้แห่งมานา',
        priceCoins: 30,
        novelText: NOVEL_TEXT_TBATE,
        releaseDate: '1 สัปดาห์ก่อน',
      },
    ],
  },
  {
    id: 'omniscient-reader',
    title: 'มุมมองนักอ่านพระเจ้า',
    type: 'manga',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
    desc: 'โลกกลายเป็นนรกตามนิยายที่เขาอ่านเพียงคนเดียวมาตลอดสิบปี มีเพียงเขาเท่านั้นที่รู้บทสรุปของหายนะครั้งนี้',
    author: 'sing N song',
    artist: 'Sleepy-C',
    creatorSplits: [
      { name: 'sing N song', role: 'ผู้แต่ง', percentage: 60 },
      { name: 'Sleepy-C', role: 'สตูดิโอผู้วาด', percentage: 40 },
    ],
    tags: ['แอ็กชัน', 'วันสิ้นโลก', 'จิตวิทยา'],
    rating: '4.96',
    views: '2.9M',
    status: 'ต่อเนื่อง',
    chapters: [
      {
        id: 'orv-1',
        storyId: 'omniscient-reader',
        orderIndex: 1,
        title: 'ตอนที่ 1: จุดเริ่มต้นบนรถไฟใต้ดิน',
        priceCoins: 0,
        pages: MANGA_PAGES_SOLO,
        releaseDate: '5 ชม.ก่อน',
      },
      {
        id: 'orv-2',
        storyId: 'omniscient-reader',
        orderIndex: 2,
        title: 'ตอนที่ 2: ภารกิจแรก ความเป็นหรือความตาย',
        priceCoins: 40,
        pages: MANGA_PAGES_SOLO,
        releaseDate: '4 วันที่แล้ว',
      },
    ],
  },
  {
    id: 'dungeon-cleaner',
    title: 'อดีตผู้กล้ามาเป็นคนเก็บขยะดันเจี้ยน',
    type: 'manga',
    cover: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1600&auto=format&fit=crop&q=80',
    desc: 'หลังปราบจอมมารได้ เขากลับถูกปลดประจำการ งานใหม่ที่ได้คือภารกิจเก็บกวาดซากมอนสเตอร์ที่ดันเจี้ยนชั้นลึกสุด',
    author: 'คิมจินวู',
    artist: 'สตูดิโอเคียว',
    creatorSplits: [
      { name: 'คิมจินวู', role: 'เนื้อเรื่อง', percentage: 70 },
      { name: 'สตูดิโอเคียว', role: 'ภาพ', percentage: 30 },
    ],
    tags: ['คอมเมดี้', 'แฟนตาซี', 'ดันเจี้ยน'],
    rating: '4.75',
    views: '980K',
    status: 'ต่อเนื่อง',
    chapters: [
      {
        id: 'dc-1',
        storyId: 'dungeon-cleaner',
        orderIndex: 1,
        title: 'ตอนที่ 1: งานแรกหลังปลดเกษียณ',
        priceCoins: 0,
        pages: MANGA_PAGES_FRIEREN,
        releaseDate: 'เมื่อวาน',
      },
    ],
  },
  {
    id: 'magic-emperor',
    title: 'จักรพรรดิเวทมนตร์หวนคืน',
    type: 'novel',
    cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1600&auto=format&fit=crop&q=80',
    desc: 'จักรพรรดิเวทมนตร์ผู้ถูกทรยศโดยศิษย์เอก ตื่นขึ้นมาในร่างของคุณชายตกอับพร้อมคัมภีร์เวทโบราณที่หายสาบสูญ',
    author: 'เยี่ยหมิง',
    artist: 'หลินเฟิง',
    creatorSplits: [
      { name: 'เยี่ยหมิง', role: 'ผู้เขียน', percentage: 100 },
    ],
    tags: ['นิยาย', 'ย้อนเวลา', 'แก้แค้น'],
    rating: '4.88',
    views: '1.4M',
    status: 'จบแล้ว',
    chapters: [
      {
        id: 'me-1',
        storyId: 'magic-emperor',
        orderIndex: 1,
        title: 'ตอนที่ 1: จิตวิญญาณที่ไม่มอดดับ',
        priceCoins: 0,
        novelText: NOVEL_TEXT_TBATE,
        releaseDate: '3 วันที่แล้ว',
      },
    ],
  },
];
