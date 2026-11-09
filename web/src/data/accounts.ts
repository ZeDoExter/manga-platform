import type { Account, AccountData, Announcement, Prefs, StudioStory, Taste } from "@/lib/types";
import { CREATORS, STORIES } from "./stories";
import { rng, shuffle } from "@/lib/util";
import { chapterTitle, defaultPages } from "@/lib/content";

export const GUEST_ACCOUNT: Account = {
  id: "guest", name: "Guest", role: "guest", bio: "Browsing without an account.",
  location: "DOOTOON", joined: "2026", tagline: "Sign in to save your library.",
  colors: ["#8d889b", "#e8e1d1"], glyph: "?", followers: 0, following: 0,
};

export const READERS: Account[] = [
  GUEST_ACCOUNT,
  { id: "mika", name: "Mika Tanabe", role: "reader", location: "Osaka, JP", joined: "Mar 2023", glyph: "月", colors: ["#0b1033", "#ffd27a"], followers: 2841, following: 213, tagline: "Night-shift nurse. Reader of unsent letters.", bio: "Night-shift nurse who reads on the last train home. Collector of quiet mysteries, slow burns and anything with a bell in it. Will absolutely cry at chapter 88." },
  { id: "theo", name: "Theo Marchetti", role: "reader", location: "Turin, IT", joined: "Jul 2022", glyph: "刀", colors: ["#09090f", "#00e5c7"], followers: 912, following: 330, tagline: "Cyberpunk, dread, and cold brew.", bio: "Embedded-systems engineer who reads sci-fi action and slow dread. Keeps a spreadsheet of every fight scene he's rated. Mecha apologist." },
  { id: "juno-park", name: "Juno Park", role: "reader", location: "Seoul, KR", joined: "Jan 2023", glyph: "夜", colors: ["#2b0f2e", "#ff4fa3"], followers: 5320, following: 140, tagline: "Villainess enthusiast.", bio: "Webtoon addict, ratings spreadsheet keeper." },
  { id: "dmitri-k", name: "Dmitri K.", role: "reader", location: "Tallinn, EE", joined: "Feb 2024", glyph: "理", colors: ["#14080b", "#b3122f"], followers: 640, following: 52, tagline: "Theory-crafter.", bio: "Reads mysteries backwards." },
  { id: "amara-o", name: "Amara O.", role: "reader", location: "Lagos, NG", joined: "Dec 2022", glyph: "海", colors: ["#062a3a", "#1aa6b7"], followers: 2210, following: 97, tagline: "Maps, myths and marathon reads.", bio: "Marathon reader of epic web novels." },
  { id: "leo-fontaine", name: "Leo Fontaine", role: "reader", location: "Lyon, FR", joined: "May 2023", glyph: "灯", colors: ["#1b2a49", "#f4a259"], followers: 388, following: 41, tagline: "Rain-and-romance.", bio: "Lighthouse romance fan." },
  { id: "yuki-s", name: "Yuki S.", role: "reader", location: "Sapporo, JP", joined: "Oct 2021", glyph: "雪", colors: ["#10263d", "#6bb4d8"], followers: 1900, following: 120, tagline: "Music & school-club stories.", bio: "Plays violin, reads about violinists." },
  { id: "admin-1", name: "System Admin", role: "admin", location: "Bangkok, TH", joined: "Jan 2026", glyph: "守", colors: ["#15120f", "#ff4a22"], followers: 0, following: 0, tagline: "Platform moderation & operations.", bio: "DOOTOON trust, safety, and revenue operations." },
];

export const ACCOUNTS: Account[] = [...READERS, ...CREATORS];
export const ACCOUNT_MAP: Record<string, Account> = Object.fromEntries(ACCOUNTS.map((a) => [a.id, a]));
export const DEMO_IDS = ["mika", "ren-akitsuki", "admin-1"];

export interface AppState {
  accountId: string;
  theme: "paper" | "night";
  prefs: Prefs;
  data: Record<string, AccountData>;
  studio: StudioStory[];
  announcements: Announcement[];
  echoes: Record<string, { pct: number; kind: string; at: number }[]>;
  hydrated: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  fontSize: 19,
  lineHeight: 1.75,
  font: "serif",
  readerTheme: "paper",
  width: 660,
  focusLens: false,
  atmos: true,
  quiet: false,
  mangaMode: "scroll",
};

const H = 3600000;
const D = 24 * H;

export const emptyData = (name: string): AccountData => ({
  library: [],
  progress: {},
  history: [],
  bookmarks: [],
  collections: [],
  following: [],
  reviews: [],
  ratings: {},
  taste: { darkness: 5, pace: 5, romance: 5, mystery: 5, action: 5, humor: 5, depth: 5 },
  profile: { name, bio: "", accent: "#ff4a22", avatar: 0, genres: [] },
  streak: 0,
});

export function genReaderData(id: string, now: number): AccountData {
  const acc = ACCOUNT_MAP[id];
  const r = rng(id);
  const picks = shuffle(r, STORIES).slice(0, 7);
  const taste: Taste = { darkness: Math.floor(r() * 10), pace: Math.floor(r() * 10), romance: Math.floor(r() * 10), mystery: Math.floor(r() * 10), action: Math.floor(r() * 10), humor: Math.floor(r() * 10), depth: Math.floor(r() * 10) };
  const d = emptyData(acc?.name ?? id);
  d.library = picks.map((s) => s.id);
  picks.forEach((s, i) => {
    const ch = Math.max(1, Math.floor(s.chapters * (0.2 + r() * 0.8)));
    d.progress[s.id] = { chapter: ch, pct: r(), at: now - (i * 9 + 2) * H };
    d.history.push({ storyId: s.id, chapter: ch, at: now - (i * 9 + 2) * H });
    d.ratings[s.id] = 4 + Math.round(r());
  });
  d.taste = taste;
  d.profile.genres = Array.from(new Set(picks.flatMap((s) => s.genres))).slice(0, 4);
  d.following = shuffle(r, CREATORS).slice(0, 3).map((c) => c.id);
  d.streak = Math.floor(r() * 40) + 3;
  d.collections = [{ id: "c1", name: "Favorites", emoji: "⭐", storyIds: picks.slice(0, 3).map((s) => s.id) }];
  return d;
}

export function makeInitialState(now: number): AppState {
  const mika = emptyData("Mika Tanabe");
  mika.library = ["hollow-moon-courier", "the-ninth-bell", "salt-and-spirit", "the-starless-tailor", "tidebound-cartographers", "kintsugi-heart-clinic", "lighthouse-at-the-end-of-every-door", "last-train-to-kasumi", "monday-is-a-dragon"];
  mika.progress = {
    "hollow-moon-courier": { chapter: 171, pct: 0.35, at: now - 3 * H },
    "the-ninth-bell": { chapter: 88, pct: 0.6, at: now - 20 * H },
    "salt-and-spirit": { chapter: 79, pct: 1, at: now - 30 * H },
    "the-starless-tailor": { chapter: 240, pct: 0.2, at: now - 2 * D },
    "tidebound-cartographers": { chapter: 41, pct: 0.8, at: now - 3 * D },
    "kintsugi-heart-clinic": { chapter: 64, pct: 1, at: now - 6 * D },
    "lighthouse-at-the-end-of-every-door": { chapter: 30, pct: 0.5, at: now - 9 * D },
    "last-train-to-kasumi": { chapter: 12, pct: 0.4, at: now - 12 * D },
    "monday-is-a-dragon": { chapter: 150, pct: 0.9, at: now - 40 * D },
  };
  mika.history = [
    { storyId: "hollow-moon-courier", chapter: 171, at: now - 3 * H },
    { storyId: "the-ninth-bell", chapter: 88, at: now - 20 * H },
    { storyId: "hollow-moon-courier", chapter: 170, at: now - 27 * H },
    { storyId: "salt-and-spirit", chapter: 79, at: now - 30 * H },
    { storyId: "the-starless-tailor", chapter: 240, at: now - 2 * D },
    { storyId: "tidebound-cartographers", chapter: 41, at: now - 3 * D },
    { storyId: "kintsugi-heart-clinic", chapter: 64, at: now - 6 * D },
    { storyId: "lighthouse-at-the-end-of-every-door", chapter: 30, at: now - 9 * D },
    { storyId: "last-train-to-kasumi", chapter: 12, at: now - 12 * D },
  ];
  mika.bookmarks = [
    { id: "b1", storyId: "hollow-moon-courier", chapter: 12, pct: 0.52, label: "“A reply in his own hand”", at: now - 80 * D },
    { id: "b2", storyId: "the-ninth-bell", chapter: 1, pct: 0.9, label: "“There has never been anyone in that bed.”", at: now - 120 * D },
    { id: "b3", storyId: "kintsugi-heart-clinic", chapter: 41, pct: 0.7, label: "Gold in the cracks", at: now - 33 * D },
    { id: "b4", storyId: "salt-and-spirit", chapter: 55, pct: 0.3, label: "The engagement ring", at: now - 12 * D },
  ];
  mika.collections = [
    { id: "col1", name: "Rainy Day Reads", emoji: "☔", storyIds: ["the-ninth-bell", "last-train-to-kasumi", "kintsugi-heart-clinic"] },
    { id: "col2", name: "Cry Safely", emoji: "😭", storyIds: ["hollow-moon-courier", "kintsugi-heart-clinic", "lighthouse-at-the-end-of-every-door"] },
    { id: "col3", name: "Comfort Bowls", emoji: "🍜", storyIds: ["salt-and-spirit", "monday-is-a-dragon", "the-starless-tailor"] },
  ];
  mika.following = ["ren-akitsuki", "ume-kobayashi", "hana-mori", "ines-calderon"];
  mika.ratings = { "hollow-moon-courier": 5, "the-ninth-bell": 5, "salt-and-spirit": 4, "kintsugi-heart-clinic": 5, "the-starless-tailor": 4 };
  mika.reviews = [
    { id: "rv1", storyId: "hollow-moon-courier", rating: 5, text: "I've never cried over a postage stamp before. Ren draws silence better than anyone — chapter 12 changed how I read the whole series.", at: now - 60 * D },
    { id: "rv2", storyId: "the-ninth-bell", rating: 5, text: "That forty-one second silence is the best horror device I've read this decade. Reread chapter one after chapter 40 and your skin will crawl.", at: now - 33 * D },
  ];
  mika.taste = { darkness: 6, pace: 4, romance: 5, mystery: 9, action: 3, humor: 5, depth: 9 };
  mika.profile = { name: "Mika Tanabe", bio: "Night-shift nurse who reads on the last train home. Collector of quiet mysteries, slow burns and anything with a bell in it.", accent: "#ff4a22", avatar: 0, genres: ["Mystery", "Fantasy", "Slice of Life", "Drama"] };
  mika.streak = 47;

  const theo = emptyData("Theo Marchetti");
  theo.library = ["neon-ronin-protocol", "crimson-theorem", "ashfall-regalia", "bone-garden-sonata", "skyforge-orphans", "saturday-with-a-void", "copper-sky-pirates"];
  theo.progress = {
    "neon-ronin-protocol": { chapter: 120, pct: 0.4, at: now - 5 * H },
    "crimson-theorem": { chapter: 99, pct: 0.7, at: now - 1 * D },
    "ashfall-regalia": { chapter: 150, pct: 0.2, at: now - 3 * D },
    "bone-garden-sonata": { chapter: 40, pct: 0.9, at: now - 5 * D },
    "skyforge-orphans": { chapter: 88, pct: 1, at: now - 14 * D },
  };
  theo.history = [
    { storyId: "neon-ronin-protocol", chapter: 120, at: now - 5 * H },
    { storyId: "crimson-theorem", chapter: 99, at: now - 1 * D },
    { storyId: "ashfall-regalia", chapter: 150, at: now - 3 * D },
    { storyId: "bone-garden-sonata", chapter: 40, at: now - 5 * D },
  ];
  theo.bookmarks = [{ id: "tb1", storyId: "neon-ronin-protocol", chapter: 60, pct: 0.6, label: "Tanaka's secret", at: now - 30 * D }];
  theo.collections = [
    { id: "tc1", name: "Best Fight Scenes", emoji: "⚔️", storyIds: ["neon-ronin-protocol", "ashfall-regalia", "skyforge-orphans"] },
    { id: "tc2", name: "Sleep Is Optional", emoji: "🌑", storyIds: ["crimson-theorem", "bone-garden-sonata", "saturday-with-a-void"] },
  ];
  theo.following = ["kaito-ryuzaki", "zhou-minxin", "seo-yeon-han"];
  theo.ratings = { "neon-ronin-protocol": 5, "crimson-theorem": 5, "bone-garden-sonata": 4 };
  theo.reviews = [{ id: "trv1", storyId: "crimson-theorem", rating: 5, text: "Real math, real dread. The 'proof by contradiction' arc is a masterclass in misdirection.", at: now - 20 * D }];
  theo.taste = { darkness: 8, pace: 8, romance: 2, mystery: 7, action: 9, humor: 3, depth: 6 };
  theo.profile = { name: "Theo Marchetti", bio: "Embedded-systems engineer who reads sci-fi action and slow dread. Mecha apologist.", accent: "#00b8a2", avatar: 1, genres: ["Sci-Fi", "Action", "Horror", "Thriller"] };
  theo.streak = 12;

  const ren = emptyData("Ren Akitsuki");
  ren.library = ["the-ninth-bell", "kintsugi-heart-clinic", "tidebound-cartographers"];
  ren.following = ["ume-kobayashi", "hana-mori", "seo-yeon-han"];
  ren.taste = { darkness: 6, pace: 4, romance: 4, mystery: 9, action: 3, humor: 4, depth: 9 };
  ren.profile = { name: "Ren Akitsuki", bio: CREATORS[0].bio, accent: "#ffb13b", avatar: 2, genres: ["Mystery", "Fantasy"] };
  ren.streak = 5;

  const hm = STORIES.find((s) => s.id === "hollow-moon-courier")!;
  const lt = STORIES.find((s) => s.id === "last-train-to-kasumi")!;
  const mk = (s: typeof hm, n: number, status: "published" | "scheduled" | "draft", ago: number, reads?: number) => ({
    id: `${s.id}-c${n}`,
    number: n,
    title: chapterTitle(s, n),
    status,
    updatedAt: now - ago,
    scheduledFor: status === "scheduled" ? new Date(now + 2 * D).toISOString().slice(0, 16) : undefined,
    pages: defaultPages(8, `${s.id}${n}`),
    reads,
  });
  const hmChapters = [
    ...Array.from({ length: 8 }, (_, i) => mk(hm, 184 - i, "published", (i * 7 + 6) * D / 7, 310000 - i * 9000 + (i % 3) * 7000)),
    mk(hm, 185, "scheduled", 6 * H),
    mk(hm, 186, "draft", 1 * H),
  ].sort((a, b) => b.number - a.number);
  const ltChapters = [
    ...Array.from({ length: 4 }, (_, i) => mk(lt, 33 - i, "published", (i * 14 + 60) * H, 72000 - i * 4000)),
    mk(lt, 34, "draft", 5 * D),
  ].sort((a, b) => b.number - a.number);

  const studio: StudioStory[] = [
    { id: hm.id, ownerId: "ren-akitsuki", title: hm.title, type: hm.type, synopsis: hm.synopsis, tagline: hm.tagline, genres: hm.genres, tags: hm.tags, palette: hm.palette, motif: hm.motif, mood: hm.mood, coverImage: hm.cover, status: "published", chapters: hmChapters, createdAt: now - 900 * D, mirror: true },
    { id: lt.id, ownerId: "ren-akitsuki", title: lt.title, type: lt.type, synopsis: lt.synopsis, tagline: lt.tagline, genres: lt.genres, tags: lt.tags, palette: lt.palette, motif: lt.motif, mood: lt.mood, status: "published", chapters: ltChapters, createdAt: now - 200 * D, mirror: true },
    {
      id: "salt-road-requiem", ownerId: "ren-akitsuki", title: "Salt Road Requiem", type: "light-novel",
      synopsis: "A courier of salt walks the white road between two dying cities, carrying a requiem that only grows heavier. A quiet, lyrical road story — currently in drafts.",
      tagline: "Every step is a note. Every grain is a grave.", genres: ["Fantasy", "Drama"], tags: ["Road trip", "Lyrical", "Grief"],
      palette: ["#1b2a49", "#ff4a22", "#fdf0d5"], motif: "wave", mood: "snow", status: "draft", createdAt: now - 10 * D,
      chapters: [
        { id: "srr-c1", number: 1, title: "The Weight of White", status: "draft", updatedAt: now - 2 * D, text: "The road began where the salt ended, and nobody in Haldre could say which came first.\n\nSelene shouldered the pack at dawn. Forty pounds of grey crystal, a flask of water, and a folded paper she had promised not to read until the first gate.\n\n---\n\nBy noon, the paper had begun to hum." },
        { id: "srr-c2", number: 2, title: "First Gate", status: "draft", updatedAt: now - 1 * D, text: "" },
      ],
    },
  ];

  const announcements: Announcement[] = [
    { id: "an1", authorId: "ren-akitsuki", text: "Chapter 185 of Hollow Moon Courier is scheduled for Friday 11:11 JST. Yes, it's the one with the postmark. Bring tissues and a very patient stationmaster.", at: now - 8 * H, likes: 3820, pinned: true },
    { id: "an2", authorId: "ren-akitsuki", text: "Quick studio update: Last Train to Kasumi chapter 34 is in thumbnails. The conductor finally gets a reflection... sort of.", at: now - 3 * D, likes: 1204 },
    { id: "an3", authorId: "ren-akitsuki", text: "Thank you for 900K followers! I'll answer ten questions in the next Q&A stream — send your wildest theories about the Stationmaster's shadow.", at: now - 11 * D, likes: 9102 },
    { id: "an4", authorId: "seo-yeon-han", text: "Ashfall Regalia takes a one-week break next Thursday. The Ash Ball needs more candles (and more knives).", at: now - 2 * D, likes: 5410, pinned: true },
    { id: "an5", authorId: "hana-mori", text: "I burned the broth again. Chapter 92 is still on time. Pray for my kitchen.", at: now - 1 * D, likes: 2240, pinned: true },
    { id: "an6", authorId: "ume-kobayashi", text: "Volume 10 of The Ninth Bell goes up for pre-order next month. The bell has a new sound.", at: now - 5 * D, likes: 3120, pinned: true },
  ];

  return {
    accountId: "guest",
    theme: "paper",
    prefs: DEFAULT_PREFS,
    data: { guest: emptyData("Guest"), mika, theo, "ren-akitsuki": ren },
    studio,
    announcements,
    echoes: {},
    hydrated: false,
  };
}
