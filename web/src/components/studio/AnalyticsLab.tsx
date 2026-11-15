"use client";

import { useEffect, useMemo } from "react";
import type { StudioStory } from "@/lib/types";
import { chapterNumberFromKey } from "@/lib/economy";
import { useEconomy } from "@/lib/economy-store";
import { fmtNum } from "@/lib/util";
import { Empty, Stat } from "../ui";

export function AnalyticsLab({ story }: { story: StudioStory }) {
  const { creatorEarnings, refreshCreatorEarnings } = useEconomy();
  useEffect(() => {
    void refreshCreatorEarnings();
  }, [refreshCreatorEarnings]);

  const pub = story.chapters.filter((c) => c.status === "published").sort((a, b) => a.number - b.number);
  const entries = useMemo(
    () =>
      (creatorEarnings?.entries ?? [])
        .filter((e) => e.story_id === story.id)
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    [creatorEarnings, story.id],
  );
  const earned = entries.reduce((a, e) => a + e.coins_earned, 0);
  const paid = pub.filter((c) => (c.priceCoins ?? 0) > 0).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Coins earned" value={fmtNum(earned)} sub="100% of paid sales" />
        <Stat label="Sales" value={entries.length} sub="paid unlocks" />
        <Stat label="Published" value={pub.length} sub={`of ${story.chapters.length} chapters`} />
        <Stat label="Paid chapters" value={paid} sub={paid ? "priced in coins" : "all chapters free"} />
      </div>

      <div className="panel p-4">
        <h3 className="h-display text-lg">Sales history</h3>
        {entries.length === 0 ? (
          <div className="mt-3"><Empty icon="coin" title="No sales yet" text="Publish a paid chapter and share it — every unlock lands here." /></div>
        ) : (
          <ul className="mt-3 space-y-2">
            {entries.slice(0, 30).map((e) => {
              const n = chapterNumberFromKey(e.story_id, e.chapter_id);
              return (
                <li key={e.id} className="flex items-center gap-2 rounded-md border-2 border-line/20 p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-extrabold">{n ? `Chapter ${n}` : e.chapter_id}</div>
                    <div className="font-mono text-[0.62rem] text-muted">{new Date(e.created_at).toLocaleString()}</div>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-mint">+{e.coins_earned}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
