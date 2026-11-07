import type {
  AccessInput,
  AccessResult,
  CoinType,
  CreatorEarnings,
  Entitlement,
  LedgerEntry,
  PurchaseInput,
  PurchaseResult,
  TopUpInput,
  Wallet,
} from "./economy";

function post(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const data = (await res.json().catch(() => ({}))) as { error?: unknown };
  if (!res.ok) {
    const message = typeof data.error === "string" ? data.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const economyApi = {
  wallet(accountId: string): Promise<Wallet> {
    return api<Wallet>(`/api/economy/wallet?accountId=${encodeURIComponent(accountId)}`);
  },

  ledger(accountId: string): Promise<LedgerEntry[]> {
    return api<{ entries: LedgerEntry[] }>(`/api/economy/ledger?accountId=${encodeURIComponent(accountId)}`).then((d) => d.entries ?? []);
  },

  entitlements(accountId: string): Promise<Entitlement[]> {
    return api<{ entitlements: Entitlement[] }>(`/api/economy/entitlements?accountId=${encodeURIComponent(accountId)}`).then((d) => d.entitlements ?? []);
  },

  access(input: AccessInput): Promise<AccessResult> {
    return api<AccessResult>("/api/economy/access", post(input));
  },

  purchase(input: PurchaseInput): Promise<PurchaseResult> {
    return api<PurchaseResult>("/api/economy/purchase", post(input));
  },

  topup(input: TopUpInput & { coinType: CoinType }): Promise<{ entry: LedgerEntry; wallet: Wallet }> {
    return api<{ entry: LedgerEntry; wallet: Wallet }>("/api/economy/topup", post(input));
  },

  creatorEarnings(creatorId: string): Promise<CreatorEarnings> {
    return api<CreatorEarnings>(`/api/economy/creator/earnings?creatorId=${encodeURIComponent(creatorId)}`);
  },
};
