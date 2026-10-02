export type StoryType = 'manga' | 'novel';

export interface CreatorSplit {
  creatorId: string;
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
  novelText?: string; // markdown / paragraphs for novel
  releaseDate: string;
}

export interface Comment {
  id: string;
  storyId: string;
  chapterId: string;
  chapterTitle: string;
  userId: string;
  authorName: string;
  avatar: string;
  body: string;
  likeCount: number;
  replyCount: number;
  parentId?: string;
  createdAt: string;
}

export interface Story {
  id: string;
  title: string;
  type: StoryType;
  cover: string;
  banner: string;
  synopsis: string;
  author: string;
  artist: string;
  creatorSplits: CreatorSplit[];
  tags: string[];
  rating: number;
  views: string;
  status: 'ongoing' | 'completed';
  chapters: Chapter[];
}

export const STORIES: Story[] = [
  {
    id: 'solo-leveling-ragnarok',
    title: 'Solo Leveling: Ragnarok',
    type: 'manga',
    cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80',
    synopsis: 'The gates reopened. As mysterious cosmic deities descend upon earth, a new monarch rises with the inherited system of shadow power to protect humanity from the brink of total annihilation.',
    author: 'Chugong',
    artist: 'REDICE Studio',
    creatorSplits: [
      { creatorId: 'auth-1', name: 'Chugong', role: 'Original Author', percentage: 70 },
      { creatorId: 'art-1', name: 'REDICE Studio', role: 'Main Illustrator', percentage: 30 },
    ],
    tags: ['Action', 'Fantasy', 'System', 'Monarch', 'Webtoon'],
    rating: 4.95,
    views: '2.4M',
    status: 'ongoing',
    chapters: [
      {
        id: 'sl-ch-1',
        storyId: 'solo-leveling-ragnarok',
        orderIndex: 1,
        title: 'Chapter 1: The Inheritor of Shadows',
        priceCoins: 0, // Free
        releaseDate: '2026-09-10',
        pages: [
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=900&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=900&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80',
        ],
      },
      {
        id: 'sl-ch-2',
        storyId: 'solo-leveling-ragnarok',
        orderIndex: 2,
        title: 'Chapter 2: Awakening of the Cursed Gate',
        priceCoins: 40, // Locked
        releaseDate: '2026-09-17',
        pages: [
          'https://images.unsplash.com/photo-1563089145-599997674d42?w=900&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=900&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=900&auto=format&fit=crop&q=80',
        ],
      },
      {
        id: 'sl-ch-3',
        storyId: 'solo-leveling-ragnarok',
        orderIndex: 3,
        title: 'Chapter 3: Monarch Army Summoning',
        priceCoins: 50, // Locked
        releaseDate: '2026-09-24',
        pages: [
          'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=900&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80',
        ],
      },
    ],
  },
  {
    id: 'the-beginning-after-the-end',
    title: 'The Beginning After The End',
    type: 'novel',
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    synopsis: 'King Grey possesses unrivaled strength, wealth, and prestige in a world governed by martial ability. However, solitude lingers closely behind those with great power. Reincarnated into a new world steeped with magic and monsters, the king has a second chance to relive his life.',
    author: 'TurtleMe',
    artist: 'Fuyuki23',
    creatorSplits: [
      { creatorId: 'auth-2', name: 'TurtleMe', role: 'Novel Writer', percentage: 100 },
    ],
    tags: ['Novel', 'Fantasy', 'Reincarnation', 'Magic', 'Adventure'],
    rating: 4.92,
    views: '1.8M',
    status: 'ongoing',
    chapters: [
      {
        id: 'tbate-ch-1',
        storyId: 'the-beginning-after-the-end',
        orderIndex: 1,
        title: 'Chapter 1: The King Without a Heart',
        priceCoins: 0, // Free
        releaseDate: '2026-08-15',
        novelText: `The scent of steel and fresh blood had grown painfully mundane.

I opened my eyes to the high ceilings of the throne room. Outside, thousands of flags bearing the crest of my nation fluttered in the autumn gale, but here within these obsidian walls, the chill had set into my bones.

"Your Majesty," a soft voice knelt before the dais. "The envoy from the southern territories has arrived with their tribute."

I did not move. In my previous life, power was an absolute currency. Yet as I closed my eyes again, the world dissolved into endless white.

When light returned, it burned my sight. I could not speak. The sensation of warm hands lifting me, the crying voice of a woman laughing through tears—

"Look, Reynolds! He has your eyes."

I looked down at two tiny, frail hands. Magic existed in this world, humming through the atmosphere like microscopic embers. A new journey had begun.`,
      },
      {
        id: 'tbate-ch-2',
        storyId: 'the-beginning-after-the-end',
        orderIndex: 2,
        title: 'Chapter 2: The Core of Mana',
        priceCoins: 30, // Locked
        releaseDate: '2026-08-22',
        novelText: `Meditating under the oak tree in our backyard, I drew the surrounding ambient mana into my nascent sternum.

The theory was surprisingly similar to ki manipulation from my previous life, but the density here was intoxicating. Sparks of azure and violet rotated in an orbital dance within my diaphragm.

"Arthur, dear, dinner is ready!" my mother called from the patio.

I exhaled a breath of concentrated steam, snapping the mana flow back into balance. Tomorrow, the journey to the royal capital would test whether this foundation was sufficient.`,
      },
    ],
  },
  {
    id: 'frieren-beyond-journeys-end',
    title: 'Frieren: Beyond Journey’s End',
    type: 'manga',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80',
    synopsis: 'The adventure is over, but life goes on for an elf mage just beginning to learn what living means. Decades after the Hero Party defeated the Demon King, Frieren embarks on a quiet pilgrimage to understand the brief lives of humans.',
    author: 'Kanehito Yamada',
    artist: 'Tsukasa Abe',
    creatorSplits: [
      { creatorId: 'auth-3', name: 'Kanehito Yamada', role: 'Story Writer', percentage: 60 },
      { creatorId: 'art-3', name: 'Tsukasa Abe', role: 'Illustrator', percentage: 40 },
    ],
    tags: ['Manga', 'Fantasy', 'Slice of Life', 'Emotional', 'Adventure'],
    rating: 4.98,
    views: '3.1M',
    status: 'ongoing',
    chapters: [
      {
        id: 'frieren-ch-1',
        storyId: 'frieren-beyond-journeys-end',
        orderIndex: 1,
        title: 'Chapter 1: The End of the Journey',
        priceCoins: 0,
        releaseDate: '2026-07-01',
        pages: [
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=900&auto=format&fit=crop&q=80',
        ],
      },
      {
        id: 'frieren-ch-2',
        storyId: 'frieren-beyond-journeys-end',
        orderIndex: 2,
        title: 'Chapter 2: The Priest’s Lie',
        priceCoins: 35,
        releaseDate: '2026-07-08',
        pages: [
          'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=900&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80',
        ],
      },
    ],
  },
  {
    id: 'omniscient-reader',
    title: 'Omniscient Reader’s Viewpoint',
    type: 'manga',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
    synopsis: 'Only I know how this world ends. A subway ride turns into an apocalyptic reality show run by cosmic dokkaebis, exactly like the obscure web novel Dokja has read for over a decade.',
    author: 'sing N song',
    artist: 'Sleepy-C',
    creatorSplits: [
      { creatorId: 'auth-4', name: 'sing N song', role: 'Author', percentage: 65 },
      { creatorId: 'art-4', name: 'Sleepy-C', role: 'Studio', percentage: 35 },
    ],
    tags: ['Action', 'Apocalypse', 'Survival', 'Psychological'],
    rating: 4.96,
    views: '2.9M',
    status: 'ongoing',
    chapters: [
      {
        id: 'orv-ch-1',
        storyId: 'omniscient-reader',
        orderIndex: 1,
        title: 'Chapter 1: The Apocalypse Starts on a Train',
        priceCoins: 0,
        releaseDate: '2026-08-01',
        pages: [
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=900&auto=format&fit=crop&q=80',
        ],
      },
      {
        id: 'orv-ch-2',
        storyId: 'omniscient-reader',
        orderIndex: 2,
        title: 'Chapter 2: First Scenario - Life or Death',
        priceCoins: 40,
        releaseDate: '2026-08-08',
        pages: [
          'https://images.unsplash.com/photo-1563089145-599997674d42?w=900&auto=format&fit=crop&q=80',
        ],
      },
    ],
  },
];

export const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'c-1',
    storyId: 'solo-leveling-ragnarok',
    chapterId: 'sl-ch-1',
    chapterTitle: 'Chapter 1',
    userId: 'u-1',
    authorName: 'ShadowLord_99',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Shadow',
    body: 'The art quality in this sequel is phenomenal! The homage to Jinwoo in the opening panel gave me chills.',
    likeCount: 142,
    replyCount: 2,
    createdAt: '2026-09-11T14:32:00Z',
  },
  {
    id: 'c-2',
    storyId: 'solo-leveling-ragnarok',
    chapterId: 'sl-ch-1',
    chapterTitle: 'Chapter 1',
    userId: 'u-2',
    authorName: 'MangaEnjoyer',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Manga',
    parentId: 'c-1',
    body: 'Totally agreed! REDICE studio always delivers top tier visuals.',
    likeCount: 38,
    replyCount: 0,
    createdAt: '2026-09-11T15:05:00Z',
  },
  {
    id: 'c-3',
    storyId: 'solo-leveling-ragnarok',
    chapterId: 'sl-ch-2',
    chapterTitle: 'Chapter 2',
    userId: 'u-3',
    authorName: 'HunterCha',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Hunter',
    body: 'Unlocked with 40 coins and it was 100% worth every single coin. The cliffhanger is insane!',
    likeCount: 89,
    replyCount: 0,
    createdAt: '2026-09-18T10:12:00Z',
  },
];
