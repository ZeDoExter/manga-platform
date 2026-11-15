"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { studioContent } from "@/lib/content";
import { recordRead } from "@/lib/reads";
import { chapterPrice, storySyncFromStory, type AccessResult, walletTotal } from "@/lib/economy";
import { useEconomy } from "@/lib/economy-store";
import { useApp } from "@/lib/store";
import { Empty } from "../ui";
import { Paywall } from "../economy/Paywall";
import { MangaReader } from "./MangaReader";
import { NovelReader } from "./NovelReader";

type Gate =
  | { key: string; status: "allowed"; access: AccessResult }
  | { key: string; status: "locked"; access: AccessResult }
  | { key: string; status: "error"; message: string };

export function ReaderPage({ id, ch }: { id: string; ch: string }) {
  const { getStory, state, account, toast } = useApp();
  const { checkAccess, buy } = useEconomy();
  const story = getStory(id);
  const n = parseInt(ch, 10);
  const studio = state.studio.find((s) => s.id === id && !s.mirror);
  const [gate, setGate] = useState<Gate | null>(null);
  const [buying, setBuying] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const data = useMemo(() => {
    if (!story || !Number.isFinite(n)) return null;
    if (studio) {
      const pub = studio.chapters.filter((c) => c.status === "published").sort((a, b) => a.number - b.number);
      const cur = pub.find((c) => c.number === n);
      if (!cur) return null;
      const content = studioContent(studio, cur.id);
      if (!content) return null;
      return {
        content,
        price: chapterPrice(studio.type, n, Math.max(pub.length, n), cur.priceCoins),
        nav: { count: pub.length, numbers: pub.map((c) => c.number), titleOf: (x: number) => pub.find((c) => c.number === x)?.title ?? `Chapter ${x}` },
      };
    }
    return null;
  }, [story, studio, n]);

  const chapterId = !!story && Number.isFinite(n) ? `${story.id}:${n}` : "";
  const savedGate = gate?.key === chapterId ? gate : null;
  const status = savedGate?.status ?? "checking";

  useEffect(() => {
    if (!story || !data) return;
    let alive = true;
    checkAccess({
      accountId: account.id,
      role: account.role,
      story: storySyncFromStory(story),
      chapter: { number: n, title: data.content.title, price: data.price },
    })
      .then((access) => {
        if (!alive) return;
        setGate({ key: chapterId, status: access.allowed ? "allowed" : "locked", access });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setGate({ key: chapterId, status: "error", message: err instanceof Error ? err.message : "The reading service is unavailable" });
      });

    return () => {
      alive = false;
    };
  }, [story, data, n, account.id, account.role, chapterId, checkAccess, retryKey]);
  const firedRef = useRef("");
  useEffect(() => {
    if (status !== "allowed" || !story || !Number.isFinite(n)) return;
    const key = `${story.id}:${n}`;
    if (firedRef.current === key) return;
    firedRef.current = key;
    recordRead(story.id, n);
  }, [status, story, n]);

  if (!story) {
    return (
      <div className="wrap py-24">
        {state.hydrated ? <Empty icon="search" title="Story not found" action={<Link href="/discover" className="btn">Discover stories</Link>} /> : <div className="skeleton h-96" />}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="wrap py-24">
        <Empty icon="book" title="Chapter not available" text="This chapter doesn't exist or hasn't been published." action={<Link href={`/story/${id}`} className="btn">Back to {story.title}</Link>} />
      </div>
    );
  }

  const chapterLabel = `Chapter ${n} · ${data.content.title}`;

  if (status !== "allowed") {
    return (
      <Paywall
        story={story}
        chapter={n}
        chapterLabel={chapterLabel}
        access={savedGate?.status === "locked" ? savedGate.access : null}
        checking={status === "checking"}
        buying={buying}
        error={savedGate?.status === "error" ? savedGate.message : null}
        onRetry={() => {
          setGate(null);
          setRetryKey((k) => k + 1);
        }}
        onUnlock={async () => {
          setBuying(true);
          try {
            const result = await buy({
              accountId: account.id,
              role: account.role,
              story: storySyncFromStory(story),
              chapter: { number: n, title: data.content.title, price: data.price },
              idempotencyKey: `web_purchase_${story.id}_${n}_${Date.now()}`,
            });
            setGate({ key: chapterId, status: "allowed", access: { allowed: true, price: result.purchase.total_coins, balance: walletTotal(result.wallet) } });
            toast(`Chapter ${n} unlocked`, "ok");
          } catch (err) {
            toast(err instanceof Error ? err.message : "Could not unlock this chapter", "warn");
            setGate(null);
            setRetryKey((k) => k + 1);
          } finally {
            setBuying(false);
          }
        }}
      />
    );
  }

  const rs = { id: story.id, title: story.title, type: story.type, mood: story.mood, palette: story.palette };
  return data.content.kind === "manga" ? (
    <MangaReader key={`${id}-${n}`} story={rs} chapter={n} title={data.content.title} nav={data.nav} content={data.content} />
  ) : (
    <NovelReader key={`${id}-${n}`} story={rs} chapter={n} title={data.content.title} nav={data.nav} paragraphs={data.content.paragraphs} />
  );
}
