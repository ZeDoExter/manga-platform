"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { economyApi } from "./economy-client";
import {
  chapterKey,
  walletTotal,
  type AccessInput,
  type AccessResult,
  type CoinType,
  type CreatorEarnings,
  type Entitlement,
  type LedgerEntry,
  type PurchaseInput,
  type PurchaseResult,
  type Wallet,
} from "./economy";
import { useApp } from "./store";

interface EconomyCtx {
  wallet: Wallet | null;
  ledger: LedgerEntry[];
  entitlements: Entitlement[];
  creatorEarnings: CreatorEarnings | null;
  loading: boolean;
  error: string | null;
  balance: number;
  refresh: () => Promise<void>;
  refreshCreatorEarnings: () => Promise<void>;
  topUp: (amount: number, coinType?: CoinType) => Promise<void>;
  buy: (input: PurchaseInput) => Promise<PurchaseResult>;
  checkAccess: (input: AccessInput) => Promise<AccessResult>;
  hasEntitlement: (storyId: string, chapterNumber: number) => boolean;
}

const EconomyContext = createContext<EconomyCtx | null>(null);

export function useEconomy(): EconomyCtx {
  const ctx = useContext(EconomyContext);
  if (!ctx) throw new Error("useEconomy outside provider");
  return ctx;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "The economy service is unavailable";
}

export function EconomyProvider({ children }: { children: ReactNode }) {
  const { account, state, toast } = useApp();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [creatorEarnings, setCreatorEarnings] = useState<CreatorEarnings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accountRef = useRef(account.id);
  useEffect(() => {
    accountRef.current = account.id;
  }, [account.id]);

  const refresh = useCallback(async () => {
    const id = account.id;
    setLoading(true);
    try {
      const [nextWallet, nextLedger, nextEntitlements] = await Promise.all([
        economyApi.wallet(id),
        economyApi.ledger(id),
        economyApi.entitlements(id),
      ]);
      if (accountRef.current !== id) return;
      setWallet(nextWallet);
      setLedger(nextLedger);
      setEntitlements(nextEntitlements);
      setError(null);
    } catch (err) {
      if (accountRef.current !== id) return;
      setWallet(null);
      setLedger([]);
      setEntitlements([]);
      setError(messageOf(err));
    } finally {
      if (accountRef.current === id) setLoading(false);
    }
  }, [account.id]);

  const refreshCreatorEarnings = useCallback(async () => {
    const id = account.id;
    if (account.role !== "creator") {
      setCreatorEarnings(null);
      return;
    }
    try {
      const data = await economyApi.creatorEarnings(id);
      if (accountRef.current !== id) return;
      setCreatorEarnings(data);
    } catch {
      if (accountRef.current !== id) return;
      setCreatorEarnings(null);
    }
  }, [account.id, account.role]);

  useEffect(() => {
    if (!state.hydrated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial remote wallet hydration
    void refresh();
  }, [state.hydrated, refresh]);

  useEffect(() => {
    if (!state.hydrated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial remote earnings hydration
    void refreshCreatorEarnings();
  }, [state.hydrated, refreshCreatorEarnings]);

  const topUp = useCallback(
    async (amount: number, coinType: CoinType = "purchased") => {
      if (account.role === "guest") {
        toast("Please sign in to top up coins", "warn");
        throw new Error("Login required for top-up");
      }
      const id = account.id;
      const idempotencyKey =
        coinType === "bonus"
          ? `web_bonus_${id}_${new Date().toISOString().slice(0, 10)}`
          : `web_topup_${id}_${coinType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const result = await economyApi.topup({ accountId: id, amount, coinType, idempotencyKey });
      if (accountRef.current !== id) return;
      setWallet(result.wallet);
      setLedger((rows) => (rows.some((row) => row.id === result.entry.id) ? rows : [result.entry, ...rows]));
      setError(null);
      toast(`${amount.toLocaleString()} ${coinType === "bonus" ? "bonus " : ""}coins added`, "ok");
    },
    [account.id, account.role, toast],
  );

  const buy = useCallback(
    async (input: PurchaseInput) => {
      if (account.role === "guest") {
        toast("Please sign in to unlock chapters", "warn");
        throw new Error("Login required for purchase");
      }
      const result = await economyApi.purchase(input);
      if (accountRef.current === input.accountId) {
        setWallet(result.wallet);
        setEntitlements((rows) => [result.entitlement, ...rows.filter((e) => e.chapter_id !== result.entitlement.chapter_id)]);
        void refresh();
      }
      return result;
    },
    [account.role, refresh],
  );

  const checkAccess = useCallback((input: AccessInput) => economyApi.access(input), []);

  const entitledChapters = useMemo(() => new Set(entitlements.map((e) => e.chapter_id)), [entitlements]);

  const hasEntitlement = useCallback(
    (storyId: string, chapterNumber: number) => entitledChapters.has(chapterKey(storyId, chapterNumber)),
    [entitledChapters],
  );

  const value = useMemo<EconomyCtx>(
    () => ({
      wallet,
      ledger,
      entitlements,
      creatorEarnings,
      loading,
      error,
      balance: walletTotal(wallet),
      refresh,
      refreshCreatorEarnings,
      topUp,
      buy,
      checkAccess,
      hasEntitlement,
    }),
    [wallet, ledger, entitlements, creatorEarnings, loading, error, refresh, refreshCreatorEarnings, topUp, buy, checkAccess, hasEntitlement],
  );

  return <EconomyContext.Provider value={value}>{children}</EconomyContext.Provider>;
}
