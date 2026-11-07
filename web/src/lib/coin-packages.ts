/** Static coin packages. 1 coin = ฿1. Bonus coins are platform-funded and never count as creator revenue. */

export interface CoinPackage {
  id: string;
  coins: number;
  bonus: number;
  priceTHB: number;
  label: string;
}

export const COIN_PACKAGES: CoinPackage[] = [
  { id: "starter", coins: 35, bonus: 0, priceTHB: 35, label: "Starter" },
  { id: "popular", coins: 99, bonus: 11, priceTHB: 99, label: "Popular" },
  { id: "value", coins: 199, bonus: 31, priceTHB: 199, label: "Value" },
  { id: "whale", coins: 499, bonus: 101, priceTHB: 499, label: "Whale" },
];

export const PACKAGE_MAP: Record<string, CoinPackage> = Object.fromEntries(
  COIN_PACKAGES.map((p) => [p.id, p]),
);

/** Minimum chargeable amount. Below ฿35 the Stripe ฿10 fixed fee eats the margin. */
export const MIN_TOPUP_THB = 35;
