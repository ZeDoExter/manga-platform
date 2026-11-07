"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { STORY_MAP } from "@/data/stories";
import { chapterNumberFromKey, type LedgerEntry } from "@/lib/economy";
import { COIN_PACKAGES, MIN_TOPUP_THB } from "@/lib/coin-packages";
import { useEconomy } from "@/lib/economy-store";
import { useApp } from "@/lib/store";
import type { StudioStory } from "@/lib/types";
import { cx } from "@/lib/util";
import { Empty, Icon } from "../ui";

const LEDGER_META: Record<LedgerEntry["type"], { label: string; icon: string; tone: string }> = {
  topup: { label: "Top-up", icon: "plus", tone: "bg-mint text-[#15120f]" },
  purchase_debit: { label: "Chapter purchase", icon: "lock", tone: "bg-accent text-white" },
  creator_earning: { label: "Creator earning", icon: "pen", tone: "bg-hl text-[#15120f]" },
  platform_fee: { label: "Platform fee", icon: "coin", tone: "bg-paper2" },
  refund_credit: { label: "Refund", icon: "check", tone: "bg-mint text-[#15120f]" },
  takedown_clawback: { label: "Takedown clawback", icon: "trash", tone: "bg-paper2" },
};

function storyTitle(id: string, studio: StudioStory[]): string {
  return STORY_MAP[id]?.title ?? studio.find((s) => s.id === id)?.title ?? id;
}

const BONUS_EVENT = "tsuzuku-bonus";

function useBonusClaimed(key: string, today: string): [boolean, () => void] {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener(BONUS_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(BONUS_EVENT, onChange);
    };
  }, []);
  const getSnapshot = useCallback(() => {
    try {
      return localStorage.getItem(key) === today;
    } catch {
      return false;
    }
  }, [key, today]);
  const claimed = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const markClaimed = useCallback(() => {
    try {
      localStorage.setItem(key, today);
      window.dispatchEvent(new Event(BONUS_EVENT));
    } catch {
      return;
    }
  }, [key, today]);
  return [claimed, markClaimed];
}

export function WalletView() {
  const { account, state, toast } = useApp();
  const { wallet, ledger, entitlements, creatorEarnings, loading, error, balance, topUp, refresh } = useEconomy();
  const [busy, setBusy] = useState<string | null>(null);
  const params = useSearchParams();
  const bonusKey = useMemo(() => `tsuzuku.bonus.${account.id}`, [account.id]);
  const today = new Date().toISOString().slice(0, 10);
  const [bonusClaimed, markBonusClaimed] = useBonusClaimed(bonusKey, today);

  const buy = async (packageId: string) => {
    setBusy(packageId);
    try {
      const res = await fetch("/api/economy/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId: account.id, packageId }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
      window.location.assign(data.url);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Checkout failed", "warn");
      setBusy(null);
    }
  };

  useEffect(() => {
    const status = params.get("topup");
    if (status === "cancelled") {
      toast("Checkout cancelled", "info");
      return;
    }
    if (status !== "success") return;
    const sessionId = params.get("session_id") ?? "";
    if (!sessionId.startsWith("cs_")) return; // spam URL without a real session: ignore silently
    (async () => {
      try {
        const res = await fetch("/api/economy/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) throw new Error("Payment not verified");
        toast("Payment confirmed — coins credited", "ok");
      } catch {
        toast("Payment not verified — coins arrive once confirmed", "warn");
      } finally {
        void refresh();
      }
    })();
  }, [params, refresh, toast]);


  const claimBonus = async () => {
    if (bonusClaimed) return;
    setBusy("bonus");
    try {
      await topUp(10, "bonus");
      markBonusClaimed();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Bonus claim failed", "warn");
    } finally {
      setBusy(null);
    }
  };

  if (error && !wallet) {
    return (
      <div className="wrap py-16">
        <Empty icon="zap" title="Wallet service offline" text={`${error}. Start the Go services and try again.`} action={<button className="btn" onClick={() => void refresh()}>Retry</button>} />
      </div>
    );
  }

  return (
    <div className="wrap py-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label">{"// your reading purse - "}{account.name}</div>
          <h1 className="h-display mt-1 text-4xl md:text-6xl">
            Wallet <Icon name="coin" size={26} className="inline-block align-top text-accent" />
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink2">Coins unlock chapters. Purchased coins support creators; bonus coins are on us. Sandbox checkout via Stripe test mode — no real card is charged.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {loading && <span className="chip">syncing</span>}
          <Link href="/discover" className="btn btn-accent"><Icon name="compass" size={15} /> Find a chapter</Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <section className="panel relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border-[18px] border-hl/30" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 size-56 rounded-full border-[14px] border-accent/15" />
          <div className="relative">
            <div className="label">Total balance</div>
            <div className="mt-1 flex items-end gap-3">
              <span className="h-display text-6xl leading-none md:text-7xl">{balance.toLocaleString()}</span>
              <span className="pb-2 font-mono text-sm font-bold text-muted">coins</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-md border-2 border-line bg-paper2 p-3">
                <div className="label">Purchased</div>
                <div className="mt-1 font-display text-2xl">{wallet?.purchased_coins ?? 0}</div>
                <div className="text-[0.65rem] text-muted">counts as creator revenue</div>
              </div>
              <div className="rounded-md border-2 border-line bg-paper2 p-3">
                <div className="label">Bonus</div>
                <div className="mt-1 font-display text-2xl">{wallet?.bonus_coins ?? 0}</div>
                <div className="text-[0.65rem] text-muted">spent first, never revenue</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/discover" className="btn btn-sm">Browse stories</Link>
              <button className="btn btn-ghost btn-sm" onClick={() => void refresh()} disabled={loading}><Icon name="shuffle" size={13} /> Refresh balance</button>
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="h-display text-xl">Add coins</h2>
            <span className="chip">Stripe sandbox</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {COIN_PACKAGES.map((p) => (
              <button key={p.id} className="btn btn-ghost flex-col !items-start !gap-0.5 !px-3 !py-2.5" onClick={() => void buy(p.id)} disabled={busy !== null}>
                <span className="flex items-center gap-1.5 font-display text-lg"><Icon name="coin" size={15} className="text-accent" /> {(p.coins + p.bonus).toLocaleString()}</span>
                <span className="font-mono text-[0.65rem] text-muted">฿{p.priceTHB}{p.bonus > 0 ? ` · +${p.bonus} bonus` : ""}</span>
                <span className="mt-1 font-mono text-[0.65rem] font-bold text-accent">{busy === p.id ? "Redirecting…" : p.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[0.7rem] text-muted">Sandbox: pay with test card 4242 4242 4242 4242 or PromptPay. Minimum ฿{MIN_TOPUP_THB}. Purchased coins fund creators; bonus coins are promotional.</p>
          <div className="mt-4 rounded-md border-2 border-dashed border-line/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-extrabold">Daily bonus</div>
                <div className="text-xs text-muted">10 bonus coins, once a day.</div>
              </div>
              <button className="btn btn-sm" disabled={bonusClaimed || busy !== null} onClick={() => void claimBonus()}>{bonusClaimed ? "Claimed" : "Claim 10"}</button>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-line px-4 py-3">
            <h2 className="h-display text-xl">Activity</h2>
            <span className="font-mono text-[0.65rem] text-muted">{ledger.length} entries</span>
          </div>
          {ledger.length ? (
            <ul className="divide-y-2 divide-line/15">
              {ledger.slice(0, 30).map((entry) => {
                const meta = LEDGER_META[entry.type] ?? { label: entry.type, icon: "coin", tone: "bg-paper2" };
                return (
                  <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={cx("grid size-9 shrink-0 place-items-center rounded-full border-2 border-line", meta.tone)}><Icon name={meta.icon} size={14} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold">{meta.label}{entry.type === "topup" ? ` - ${entry.coin_type}` : ""}</div>
                      <div className="font-mono text-[0.63rem] text-muted">{new Date(entry.created_at).toLocaleString()} - {entry.reference_id.slice(0, 18)}</div>
                    </div>
                    <span className={cx("shrink-0 font-mono text-sm font-extrabold tabular-nums", entry.amount > 0 ? "text-mint" : "text-accent")}>{entry.amount > 0 ? "+" : ""}{entry.amount.toLocaleString()}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-5"><Empty icon="list" title="No activity yet" text="Top up or unlock a chapter and the ledger will show it here." /></div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="panel p-4">
            <div className="flex items-center justify-between">
              <h2 className="h-display text-lg">Unlocked chapters</h2>
              <span className="chip">{entitlements.length}</span>
            </div>
            {entitlements.length ? (
              <ul className="mt-3 space-y-2">
                {entitlements.slice(0, 8).map((e) => {
                  const n = chapterNumberFromKey(e.story_id, e.chapter_id);
                  return (
                    <li key={e.id}>
                      <Link href={`/read/${e.story_id}/${n ?? 1}`} className="flex items-center gap-2 rounded-md border-2 border-line/20 p-2 hover:border-line hover:bg-paper2">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-line bg-hl text-[#15120f]"><Icon name="book" size={13} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-extrabold">{storyTitle(e.story_id, state.studio)}</span>
                          <span className="block font-mono text-[0.62rem] text-muted">{n ? `Chapter ${n}` : e.chapter_id}</span>
                        </span>
                        <Icon name="arrow" size={13} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">No paid chapters unlocked yet. Free chapters never need a purchase.</p>
            )}
            {entitlements.length > 8 && <p className="mt-3 font-mono text-[0.65rem] text-muted">+{entitlements.length - 8} more in your library.</p>}
          </section>

          {account.role === "creator" && (
            <section className="panel p-4">
              <div className="flex items-center justify-between">
                <h2 className="h-display text-lg">Creator earnings</h2>
                <span className="chip">Stripe test</span>
              </div>
              <div className="mt-2 flex items-end gap-2">
                <span className="h-display text-4xl">{creatorEarnings?.total_coins ?? 0}</span>
                <span className="pb-1 font-mono text-xs text-muted">coins</span>
              </div>
              <p className="mt-1 text-xs text-muted">Paid out to your wallet as purchased coins. Bonus coins never count.</p>
              {creatorEarnings?.entries.length ? (
                <ul className="mt-3 space-y-2">
                  {creatorEarnings.entries.slice(0, 4).map((e) => (
                    <li key={e.id} className="flex items-center gap-2 rounded-md border-2 border-line/20 p-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-line bg-hl text-[#15120f]"><Icon name="coin" size={12} /></span>
                      <span className="min-w-0 flex-1 truncate text-xs font-extrabold">{storyTitle(e.story_id, state.studio)}</span>
                      <span className="font-mono text-xs font-extrabold text-mint">+{e.coins_earned}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted">No sales yet. Publish a paid chapter to start earning.</p>
              )}
              <Link href="/studio" className="btn btn-ghost btn-sm mt-3 w-full">Open Studio</Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
