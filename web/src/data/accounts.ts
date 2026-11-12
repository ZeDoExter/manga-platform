import type { Account, AccountData, Announcement, Prefs, StudioStory, Taste } from "@/lib/types";
import { CREATORS, STORIES } from "./stories";

export const GUEST_ACCOUNT: Account = {
  id: "guest",
  name: "Guest",
  role: "guest",
  bio: "Browsing without an account.",
  location: "DOOTOON",
  joined: "2026",
  tagline: "Sign in to save your library.",
  colors: ["#8d889b", "#e8e1d1"],
  glyph: "?",
  followers: 0,
  following: 0,
};

export const READERS: Account[] = [
  GUEST_ACCOUNT,
];

export const ACCOUNTS: Account[] = [GUEST_ACCOUNT, ...CREATORS];
export const ACCOUNT_MAP: Record<string, Account> = Object.fromEntries(ACCOUNTS.map((a) => [a.id, a]));

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

// Real data only: no randomized reader history or fake progress generation.
export function genReaderData(id: string, now: number): AccountData {
  const acc = ACCOUNT_MAP[id];
  return emptyData(acc?.name ?? id);
}

// Clean initial state: no mock stories, no simulated history, fresh start.
export function makeInitialState(now: number): AppState {
  return {
    accountId: "guest",
    theme: "paper",
    prefs: DEFAULT_PREFS,
    data: {
      guest: emptyData("Guest"),
      creator: emptyData("Creator"),
      admin: emptyData("System Admin"),
    },
    studio: [],
    announcements: [],
    echoes: {},
    hydrated: false,
  };
}
