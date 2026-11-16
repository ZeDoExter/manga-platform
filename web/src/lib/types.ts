export type StoryType = "manga" | "manhwa" | "manhua" | "light-novel" | "web-novel" | "original";

export type ColorMode = "color" | "mono";
export const COLOR_LABEL: Record<ColorMode, string> = { color: "ภาพสี", mono: "ขาวดำ" };

export const TYPE_LABEL: Record<StoryType, string> = {
  manga: "Manga",
  manhwa: "Manhwa",
  manhua: "Manhua",
  "light-novel": "Light Novel",
  "web-novel": "Web Novel",
  original: "Original Fiction",
};
export const isVisual = (t: StoryType) => t === "manga" || t === "manhwa" || t === "manhua";

export type Mood = "dread" | "rain" | "neon" | "ember" | "petal" | "calm" | "stars" | "tide" | "snow";

export type Motif =
  | "moon" | "blade" | "flame" | "bell" | "needle" | "eye" | "lighthouse" | "wave" | "cloud" | "bowl"
  | "note" | "flower" | "key" | "gear" | "wolf" | "crane" | "void" | "eclipse" | "bone" | "train"
  | "airship" | "tower" | "sun" | "city";

export interface Taste {
  darkness: number;
  pace: number;
  romance: number;
  mystery: number;
  action: number;
  humor: number;
  depth: number;
}
export const TASTE_KEYS: (keyof Taste)[] = ["darkness", "pace", "romance", "mystery", "action", "humor", "depth"];

export interface Story {
  id: string;
  title: string;
  alt: string;
  type: StoryType;
  colorMode: ColorMode;
  creator: string;
  genres: string[];
  tags: string[];
  status: "Ongoing" | "Completed" | "Hiatus" | "Draft";
  rating: number;
  votes: number;
  followers: number;
  weekly: number; // thousands of weekly readers
  chapters: number;
  latest: string;
  first: string;
  updatedHours: number;
  year: number;
  age: "All" | "13+" | "16+" | "18+";
  tagline: string;
  synopsis: string;
  palette: [string, string, string];
  motif: Motif;
  mood: Mood;
  cover?: string;
  taste: Taste;
  rank?: number;
  delta?: number | "new";
  user?: boolean;
}

export interface Account {
  id: string;
  name: string;
  role: "guest" | "reader" | "creator" | "admin";
  bio: string;
  location: string;
  joined: string;
  tagline: string;
  colors: [string, string];
  glyph: string;
  followers: number;
  following: number;
  native?: string;
  verified?: boolean;
  image?: string;
}

/* ---------- personal state ---------- */
export interface Bookmark {
  id: string;
  storyId: string;
  chapter: number;
  pct: number;
  label: string;
  at: number;
}
export interface Collection {
  id: string;
  name: string;
  emoji: string;
  storyIds: string[];
}
export interface Review {
  id: string;
  storyId: string;
  rating: number;
  text: string;
  at: number;
  editedAt?: number;
}
export interface Prefs {
  fontSize: number;
  lineHeight: number;
  font: "serif" | "sans" | "mono";
  readerTheme: "paper" | "sepia" | "night" | "ink" | "mint";
  width: number;
  focusLens: boolean;
  atmos: boolean;
  quiet: boolean;
  mangaMode: "scroll" | "page" | "book";
}
export interface ProfileSettings {
  name: string;
  bio: string;
  accent: string;
  avatar: number;
  genres: string[];
}
export interface AccountData {
  library: string[];
  progress: Record<string, { chapter: number; pct: number; at: number }>;
  history: { storyId: string; chapter: number; at: number }[];
  bookmarks: Bookmark[];
  collections: Collection[];
  following: string[];
  reviews: Review[];
  ratings: Record<string, number>;
  taste: Taste;
  profile: ProfileSettings;
  streak: number;
}

/* ---------- studio ---------- */
export type PagePreset = "action" | "dialogue" | "establishing" | "closeup" | "splash" | "blank";
export interface StudioPage {
  id: string;
  kind: "preset" | "upload";
  preset?: PagePreset;
  src?: string;
  label?: string;
}
export interface StudioChapter {
  id: string;
  number: number;
  title: string;
  status: "draft" | "scheduled" | "published";
  scheduledFor?: string;
  updatedAt: number;
  text?: string;
  pages?: StudioPage[];
  reads?: number;
  priceCoins?: number;
  /** Last successful server sync (ms). Absent = never confirmed (local draft). */
  syncedAt?: number;
}
export interface StudioStory {
  id: string;
  ownerId: string;
  title: string;
  type: StoryType;
  colorMode?: ColorMode;
  synopsis: string;
  tagline: string;
  genres: string[];
  tags: string[];
  palette: [string, string, string];
  motif: Motif;
  mood: Mood;
  coverImage?: string;
  status: "draft" | "published" | "unpublished";
  chapters: StudioChapter[];
  createdAt: number;
  /** Last successful server sync (ms). Absent = never confirmed (local draft). */
  syncedAt?: number;
  mirror?: boolean;
}
export interface Announcement {
  id: string;
  authorId: string;
  text: string;
  at: number;
  likes: number;
  liked?: boolean;
  pinned?: boolean;
}

/* ---------- details ---------- */
export interface Character {
  id: string;
  name: string;
  role: string;
  bio: string;
  faction: string;
  color: string;
  firstCh: number;
}
export interface Relation {
  a: string;
  b: string;
  kind: "ally" | "rival" | "family" | "love" | "mentor" | "secret";
  since: number;
  note: string;
}
export interface TLEvent {
  ch: number;
  title: string;
  text: string;
  who: string[];
}
export interface StoryDetail {
  characters: Character[];
  relations: Relation[];
  timeline: TLEvent[];
}
