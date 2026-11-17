"use client";

import Link from "next/link";
import type { AccessResult } from "@/lib/economy";
import type { Story } from "@/lib/types";
import { cx } from "@/lib/util";
import { Cover } from "../Cover";
import { Icon } from "../ui";

interface PaywallProps {
  story: Story;
  chapter: number;
  chapterLabel: string;
  access: AccessResult | null;
  checking: boolean;
  buying: boolean;
  error: string | null;
  onUnlock: () => void;
  onRetry: () => void;
}

export function Paywall({ story, chapter, chapterLabel, access, checking, buying, error, onUnlock, onRetry }: PaywallProps) {
  const price = access?.price ?? 0;
  const balance = access?.balance ?? 0;
  const affordable = balance >= price;
  const unavailable = access?.reason === "unavailable";
  const login = access?.reason === "login";

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-5">
        <Link href={`/story/${story.id}`} className="btn btn-ghost btn-sm">
          <Icon name="left" size={13} /> {story.title}
        </Link>
        <Link href="/wallet" className="panel-flat flex h-10 items-center gap-2 px-2.5 transition-shadow hover:shadow-[3px_3px_0_var(--shadow)]" aria-label={`Wallet, ${balance} coins`}>
          <span className="grid size-6 place-items-center rounded-full border-2 border-line bg-hl text-[#15120f]"><Icon name="coin" size={13} /></span>
          <span className="font-mono text-xs font-extrabold tabular-nums">{balance.toLocaleString()}</span>
        </Link>
      </header>

      <main className="mx-auto grid max-w-5xl items-center gap-8 px-4 pb-24 pt-4 md:grid-cols-[220px_1fr] md:pt-14">
        <div className="mx-auto w-40 md:w-full">
          <div className="overflow-hidden rounded border-2 border-line shadow-[8px_8px_0_var(--shadow)]">
            <Cover story={story} compact />
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 font-mono text-[0.68rem] text-muted">
            <Icon name="lock" size={12} /> Chapter {chapter}
          </div>
        </div>

        <div className="min-w-0">
          <div className="label">{"// chapter locked"}</div>
          <h1 className="h-display mt-2 text-4xl leading-[0.95] md:text-6xl">
            Keep reading <span className="text-accent">{story.title}</span>
          </h1>
          <p className="mt-2 text-sm font-bold text-muted">{chapterLabel}</p>

          <div className="panel mt-6 max-w-xl p-5">
            {checking ? (
              <div className="space-y-3" aria-live="polite">
                <div className="label">Checking your library.</div>
                <div className="skeleton h-12" />
                <div className="skeleton h-10" />
              </div>
            ) : error ? (
              /not found/i.test(error) ? (
                <div>
                  <div className="text-sm font-extrabold">Coming soon</div>
                  <p className="mt-2 text-sm text-ink2">This chapter hasn&apos;t been published yet. Check back later.</p>
                  <Link href={`/story/${story.id}`} className="btn mt-4">Back to the story</Link>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-extrabold">Something went wrong</div>
                  <p className="mt-2 text-sm text-ink2">Please try again in a moment.</p>
                  <button className="btn btn-accent mt-4" onClick={onRetry}>Try again</button>
                </div>
              )
            ) : unavailable ? (
              <div>
                <div className="flex items-center gap-2 text-sm font-extrabold"><Icon name="lock" size={16} className="text-accent" /> This chapter is unavailable</div>
                <p className="mt-2 text-sm text-ink2">It may have been taken down while you were reading. Your purchase, if any, is refunded automatically.</p>
                <Link href={`/story/${story.id}`} className="btn mt-4">Back to the story</Link>
              </div>
            ) : login ? (
              <div>
                <div className="flex items-center gap-2 text-sm font-extrabold"><Icon name="user" size={16} /> Sign in to continue</div>
                <p className="mt-2 text-sm text-ink2">Free chapters are open to everyone. Paid chapters need an account so your library can follow you.</p>
                <Link href="/" className="btn mt-4">Choose an account</Link>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="label">Unlock this chapter</div>
                    <div className="mt-1 flex items-end gap-2">
                      <Icon name="coin" size={22} className="mb-1 text-accent" />
                      <span className="h-display text-4xl leading-none">{price}</span>
                      <span className="pb-1 font-mono text-xs font-bold text-muted">coins</span>
                    </div>
                  </div>
                  <span className={cx("chip", affordable ? "chip-on" : "")}>{balance.toLocaleString()} in wallet</span>
                </div>

                <button className="btn btn-accent mt-4 w-full !py-3" onClick={onUnlock} disabled={buying || !affordable}>
                  {buying ? "Unlocking." : affordable ? <>Unlock for {price} coins <Icon name="arrow" size={15} /></> : "Not enough coins"}
                </button>
                {!affordable && (
                  <Link href="/wallet" className="btn btn-ghost mt-2 w-full">
                    <Icon name="plus" size={14} /> Top up your wallet
                  </Link>
                )}
                <p className="mt-3 text-xs text-muted">One-time purchase. This chapter stays in your library forever, even after you close the tab.</p>
              </>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[0.68rem] text-muted">
            <Link href={`/read/${story.id}/1`} className="hover:text-accent">Read chapter 1 free</Link>
            <Link href={`/story/${story.id}`} className="hover:text-accent">All chapters</Link>
            <Link href="/wallet" className="hover:text-accent">Wallet &amp; activity</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
