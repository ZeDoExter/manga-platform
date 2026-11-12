import type { Account, Story, Taste, Mood, StoryType } from "@/lib/types";

const T = (a: number[]): Taste => ({
  darkness: a[0], pace: a[1], romance: a[2], mystery: a[3], action: a[4], humor: a[5], depth: a[6],
});

type Raw = Omit<Story, "taste"> & { t: number[] };

// All mockup stories completely wiped. The catalog starts empty, populated only by real creations.
const raw: Raw[] = [];

export const STORIES: Story[] = raw.map(({ t, ...s }) => ({ ...s, taste: T(t) }));
export const STORY_MAP: Record<string, Story> = Object.fromEntries(STORIES.map((s) => [s.id, s]));
export const TOP10: Story[] = [];

export const ALL_GENRES: string[] = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Gothic", "Horror", "Mystery", "Romance", "Sci-Fi",
  "Slice of Life", "Supernatural", "Thriller",
];

export const ALL_TAGS: string[] = [
  "Anti-hero", "Bells", "Cyberpunk", "Dystopia", "Goblin",
  "Isekai", "Magic", "Revenge", "Swords", "Trains",
];

export const CREATORS: Account[] = [
  {
    id: "creator",
    name: "Creator",
    role: "creator",
    verified: true,
    location: "Bangkok, TH",
    joined: "2026",
    followers: 0,
    following: 0,
    colors: ["#0b1033", "#ffd27a"],
    glyph: "ว",
    tagline: "Official creator.",
    bio: "Creator on DOOTOON platform.",
  },
  {
    id: "admin",
    name: "System Admin",
    role: "admin",
    verified: true,
    location: "Bangkok, TH",
    joined: "2026",
    followers: 0,
    following: 0,
    colors: ["#15120f", "#ff4a22"],
    glyph: "ส",
    tagline: "System administrator.",
    bio: "DOOTOON platform operations.",
  },
];

export const CREATOR_MAP: Record<string, Account> = Object.fromEntries(CREATORS.map((c) => [c.id, c]));

export const MOODS: Mood[] = ["dread", "rain", "neon", "ember", "petal", "calm", "stars", "tide", "snow"];
export const TYPES: StoryType[] = ["manga", "manhwa", "manhua", "light-novel", "web-novel", "original"];
