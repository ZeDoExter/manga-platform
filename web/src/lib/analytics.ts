import { rng } from "./util";

/** Deterministic simulated analytics. Everything is generated from a seed — no real readers involved. */
export function series(seed: string, days: number, base: number, trend = 0.011): number[] {
  const r = rng(seed);
  let v = base;
  return Array.from({ length: days }, (_, i) => {
    v *= 1 + trend + (r() - 0.5) * 0.1;
    const dow = i % 7;
    return Math.max(1, Math.round(v * (dow === 4 || dow === 5 ? 1.28 : dow === 1 ? 0.88 : 1)));
  });
}

export function retention(seed: string, chapters: number): number[] {
  const r = rng(seed + ":ret");
  let v = 100;
  return Array.from({ length: chapters }, (_, i) => {
    if (i === 0) return 100;
    v *= 0.9 + r() * 0.1 - (i === 3 || i === 7 ? 0.07 : 0);
    return Math.round(v * 10) / 10;
  });
}

export function heat(seed: string): number[][] {
  const r = rng(seed + ":heat");
  return Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => {
      const evening = Math.exp(-((h - 21) ** 2) / 14);
      const lunch = 0.45 * Math.exp(-((h - 12.5) ** 2) / 6);
      const commute = 0.35 * Math.exp(-((h - 8) ** 2) / 4);
      const weekend = d >= 5 ? 1.2 : 1;
      return Math.min(1, (evening + lunch + commute) * weekend * (0.8 + r() * 0.25));
    }),
  );
}

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function demographics(seed: string) {
  const r = rng(seed + ":demo");
  const raw = [0.12 + r() * 0.05, 0.34 + r() * 0.06, 0.28 + r() * 0.05, 0.14 + r() * 0.04, 0.06 + r() * 0.03];
  const s = raw.reduce((a, b) => a + b, 0);
  const ages = ["13–17", "18–24", "25–34", "35–44", "45+"].map((label, i) => ({ label, value: raw[i] / s }));
  const rr = [0.3 + r() * 0.1, 0.22 + r() * 0.06, 0.16 + r() * 0.05, 0.12 + r() * 0.04, 0.1 + r() * 0.04];
  const rs = rr.reduce((a, b) => a + b, 0);
  const regions = ["Japan", "United States", "South Korea", "Brazil", "Elsewhere"].map((label, i) => ({ label, value: rr[i] / rs }));
  return { ages, regions };
}

export function reactionMix(seed: string) {
  const r = rng(seed + ":mix");
  const raw = { gasp: 0.15 + r() * 0.2, cry: 0.15 + r() * 0.2, fire: 0.1 + r() * 0.15, heart: 0.1 + r() * 0.15, laugh: 0.05 + r() * 0.12, think: 0.1 + r() * 0.1 };
  const s = Object.values(raw).reduce((a, b) => a + b, 0);
  return Object.entries(raw).map(([k, v]) => ({ kind: k, value: v / s }));
}
