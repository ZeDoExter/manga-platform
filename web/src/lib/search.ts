import type { Story } from "./types";
import { TYPE_LABEL } from "./types";
import { ACCOUNTS } from "@/data/accounts";
import { ALL_GENRES, ALL_TAGS } from "@/data/stories";

export interface Suggestion {
  kind: "story" | "creator" | "genre" | "tag";
  id: string;
  label: string;
  sub: string;
  href: string;
  story?: Story;
}

export function suggest(q: string, catalog: Story[], limit = 8): Suggestion[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const out: (Suggestion & { score: number })[] = [];
  for (const st of catalog) {
    const creator = ACCOUNTS.find((a) => a.id === st.creator)?.name.toLowerCase() ?? "";
    let score = 0;
    const t = st.title.toLowerCase();
    if (t.startsWith(s)) score += 12;
    else if (t.includes(s)) score += 8;
    if (st.alt.toLowerCase().includes(s)) score += 5;
    if (creator.includes(s)) score += 4;
    if (st.tags.some((x) => x.toLowerCase().includes(s))) score += 3;
    if (st.genres.some((x) => x.toLowerCase().includes(s))) score += 2;
    if (TYPE_LABEL[st.type].toLowerCase().includes(s)) score += 1;
    if (score) out.push({ kind: "story", id: st.id, label: st.title, sub: `${TYPE_LABEL[st.type]} · ${st.genres.slice(0, 2).join(", ")}`, href: `/story/${st.id}`, story: st, score: score + st.rating / 10 });
  }
  for (const a of ACCOUNTS) {
    if (a.role === "creator" && (a.name.toLowerCase().includes(s) || (a.native ?? "").includes(s))) out.push({ kind: "creator", id: a.id, label: a.name, sub: `Creator · ${a.location}`, href: `/u/${a.id}`, score: 7 });
  }
  for (const g of ALL_GENRES) if (g.toLowerCase().includes(s)) out.push({ kind: "genre", id: g, label: g, sub: "Genre", href: `/discover?genre=${encodeURIComponent(g)}`, score: 4 });
  for (const g of ALL_TAGS) if (g.toLowerCase().includes(s)) out.push({ kind: "tag", id: g, label: `#${g}`, sub: "Tag", href: `/discover?q=${encodeURIComponent(g)}`, score: 2 });
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
