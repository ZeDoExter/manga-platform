"use client";

import { memo, useState, type ReactNode } from "react";
import type { Motif, Story } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/types";
import { cx, hash, rng } from "@/lib/util";
import { resolveImageUrl } from "@/lib/content";

type P = { a: string; b: string; c: string; d: string };

const gearPath = (cx0: number, cy0: number, r1: number, r2: number, n: number) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const ang = (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 ? r2 : r1;
    return `${i ? "L" : "M"}${(cx0 + Math.cos(ang) * rr).toFixed(1)} ${(cy0 + Math.sin(ang) * rr).toFixed(1)}`;
  }).join(" ") + "Z";

const MOTIFS: Record<Motif, (p: P) => ReactNode> = {
  moon: ({ a, c }) => (
    <g>
      <circle cx="100" cy="125" r="64" fill={c} />
      <circle cx="126" cy="108" r="58" fill={a} />
      <path d="M10 296 L100 200 L190 296" stroke={c} strokeWidth="3" fill="none" opacity=".8" />
      <path d="M40 296 L100 228 L160 296" stroke={c} strokeWidth="2" fill="none" opacity=".5" />
    </g>
  ),
  blade: ({ b, c, d }) => (
    <g>
      <circle cx="100" cy="140" r="72" fill="none" stroke={b} strokeWidth="3" />
      <g transform="rotate(35 100 150)">
        <rect x="96" y="30" width="8" height="190" fill={c} />
        <rect x="82" y="220" width="36" height="7" fill={d} />
        <rect x="96" y="227" width="8" height="46" fill={d} />
      </g>
    </g>
  ),
  flame: ({ b, c }) => (
    <g>
      <path d="M100 52C132 108 156 130 146 178C138 220 66 220 56 178C49 142 86 122 100 52Z" fill={c} />
      <path d="M100 118C118 150 128 160 122 188C116 210 84 210 78 188C74 168 92 156 100 118Z" fill={b} />
    </g>
  ),
  bell: ({ c, d }) => (
    <g>
      <path d="M100 60C70 60 62 100 60 140L46 182H154L140 140C138 100 130 60 100 60Z" fill={c} />
      <circle cx="100" cy="194" r="11" fill={d} />
      <path d="M100 30V60" stroke={c} strokeWidth="4" />
      {[30, 60, 150, 170].map((x) => <path key={x} d={`M${x} ${60 + (x % 40)}v26`} stroke={c} strokeWidth="1.5" opacity=".5" />)}
    </g>
  ),
  needle: ({ b, c }) => (
    <g>
      <path d="M46 226 L152 58" stroke={c} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="148" cy="64" rx="5" ry="10" transform="rotate(32 148 64)" fill="none" stroke={c} strokeWidth="3" />
      <path d="M150 62C210 100 30 130 100 200S140 262 52 276" stroke={b} strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  eye: ({ a, b, c, d }) => (
    <g>
      <path d="M20 150Q100 70 180 150Q100 230 20 150Z" fill={c} />
      <circle cx="100" cy="150" r="36" fill={b} />
      <circle cx="100" cy="150" r="16" fill={d} />
      <circle cx="110" cy="140" r="6" fill="#fff" />
      <path d="M20 150Q100 70 180 150" stroke={a} strokeWidth="4" fill="none" />
    </g>
  ),
  lighthouse: ({ a, b, c, d }) => (
    <g>
      <path d="M100 96L220 52V140Z" fill={c} opacity=".28" />
      <path d="M84 250L92 104H108L116 250Z" fill={c} />
      <rect x="88" y="150" width="24" height="14" fill={d} opacity=".7" />
      <rect x="86" y="196" width="28" height="14" fill={d} opacity=".7" />
      <rect x="88" y="86" width="24" height="18" fill={b} />
      <path d="M86 86L100 66L114 86Z" fill={d} />
      <path d="M0 262Q25 250 50 262T100 262T150 262T200 262V300H0Z" fill={a} opacity=".6" />
    </g>
  ),
  wave: ({ b, c }) => (
    <g>
      <circle cx="100" cy="100" r="42" fill={c} />
      {[150, 178, 206].map((y, i) => <path key={y} d={`M-10 ${y}Q15 ${y - 20} 40 ${y}T90 ${y}T140 ${y}T190 ${y}T240 ${y}`} stroke={i % 2 ? b : c} strokeWidth="5" fill="none" />)}
      <path d="M80 140L120 140L110 156L90 156Z" fill={c} />
    </g>
  ),
  cloud: ({ b, c, d }) => (
    <g>
      <ellipse cx="60" cy="200" rx="52" ry="22" fill={b} opacity=".5" />
      <ellipse cx="140" cy="214" rx="56" ry="20" fill={b} opacity=".5" />
      <rect x="56" y="104" width="88" height="78" fill={c} />
      <rect x="48" y="96" width="104" height="14" fill={d} />
      {[0, 1, 2].map((i) => <rect key={i} x={64 + i * 26} y="124" width="16" height="36" fill={d} opacity=".8" />)}
      <ellipse cx="100" cy="190" rx="90" ry="14" fill={c} opacity=".5" />
    </g>
  ),
  bowl: ({ b, c }) => (
    <g>
      <path d="M34 156H166A66 66 0 0 1 34 156Z" fill={c} />
      <path d="M72 140Q60 118 74 100T74 66M100 140Q88 112 102 92T102 52M128 140Q116 118 130 100T130 66" stroke={b} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M140 60L176 140M154 56L186 130" stroke={c} strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  note: ({ b, c }) => (
    <g>
      <ellipse cx="70" cy="206" rx="22" ry="16" fill={c} />
      <ellipse cx="144" cy="188" rx="22" ry="16" fill={c} />
      <path d="M90 206V80L164 62V188" stroke={c} strokeWidth="7" fill="none" />
      <path d="M90 100L164 82" stroke={c} strokeWidth="12" />
      <circle cx="100" cy="60" r="3" fill={b} />
    </g>
  ),
  flower: ({ b, c, d }) => (
    <g>
      {Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx="100" cy="100" rx="15" ry="36" fill={i % 2 ? b : c} transform={`rotate(${i * 45} 100 140)`} opacity=".92" />)}
      <circle cx="100" cy="140" r="16" fill={d} />
    </g>
  ),
  key: ({ b, c }) => (
    <g>
      <circle cx="100" cy="90" r="38" fill="none" stroke={c} strokeWidth="14" />
      <rect x="94" y="126" width="12" height="110" fill={c} />
      <rect x="106" y="198" width="26" height="10" fill={c} />
      <rect x="106" y="218" width="18" height="10" fill={c} />
      <circle cx="100" cy="90" r="8" fill={b} />
    </g>
  ),
  gear: ({ a, b, c }) => (
    <g>
      <path d={gearPath(100, 140, 78, 62, 12)} fill={c} />
      <circle cx="100" cy="140" r="38" fill={a} />
      <circle cx="100" cy="140" r="16" fill={b} />
    </g>
  ),
  wolf: ({ a, b, c, d }) => (
    <g>
      <circle cx="140" cy="90" r="30" fill={c} opacity=".9" />
      <path d="M48 220L58 96L92 134H108L142 96L152 220L100 252Z" fill={b} />
      <path d="M48 220L58 96L92 134L80 220Z" fill={d} opacity=".25" />
      <path d="M78 176L94 184M122 176L106 184" stroke={a} strokeWidth="5" strokeLinecap="round" />
      <path d="M92 214H108L100 228Z" fill={d} />
    </g>
  ),
  crane: ({ b, c, d }) => (
    <g>
      <path d="M30 150L112 126L96 178Z" fill={c} />
      <path d="M170 110L112 126L96 178L150 190Z" fill={b} />
      <path d="M112 126L96 178L40 210Z" fill={d} opacity=".5" />
      <path d="M150 190L96 178L116 236Z" fill={c} opacity=".8" />
      <path d="M170 110L190 90L176 120Z" fill={d} />
    </g>
  ),
  void: ({ b, c, d }) => (
    <g>
      {[78, 62, 46, 30].map((r, i) => <circle key={r} cx="100" cy="140" r={r} fill="none" stroke={i % 2 ? b : c} strokeWidth="2" opacity={0.9 - i * 0.15} />)}
      <circle cx="100" cy="140" r="20" fill={d} />
      <path d="M10 140H190" stroke={c} strokeWidth="1" opacity=".5" />
    </g>
  ),
  eclipse: ({ a, b, c }) => (
    <g>
      <circle cx="100" cy="130" r="74" fill="none" stroke={b} strokeWidth="2" opacity=".6" />
      <circle cx="100" cy="130" r="62" fill={c} />
      <circle cx="114" cy="122" r="58" fill={a} />
      <circle cx="100" cy="130" r="62" fill="none" stroke={c} strokeWidth="4" />
    </g>
  ),
  bone: ({ b, c }) => (
    <g transform="rotate(-38 100 140)">
      <rect x="40" y="132" width="120" height="16" rx="5" fill={c} />
      {[[40, 128], [40, 152], [160, 128], [160, 152]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="14" fill={c} />)}
      <circle cx="100" cy="140" r="4" fill={b} />
    </g>
  ),
  train: ({ b, c, d }) => (
    <g>
      <path d="M10 296L88 170M190 296L112 170" stroke={c} strokeWidth="4" />
      {[200, 226, 256].map((y) => <path key={y} d={`M${100 - (y - 160) * 0.62} ${y}H${100 + (y - 160) * 0.62}`} stroke={c} strokeWidth="2" opacity=".6" />)}
      <rect x="72" y="86" width="56" height="74" rx="14" fill={c} />
      <rect x="80" y="96" width="40" height="26" rx="5" fill={d} />
      <circle cx="84" cy="144" r="5" fill={b} />
      <circle cx="116" cy="144" r="5" fill={b} />
    </g>
  ),
  airship: ({ b, c, d }) => (
    <g>
      <ellipse cx="100" cy="110" rx="76" ry="38" fill={c} />
      <path d="M30 110H170" stroke={d} strokeWidth="3" opacity=".4" />
      <path d="M64 142L80 172M136 142L120 172" stroke={d} strokeWidth="2" />
      <rect x="70" y="170" width="60" height="22" rx="5" fill={b} />
      <path d="M176 100L196 88V132L176 120Z" fill={b} />
      <ellipse cx="60" cy="230" rx="40" ry="10" fill={c} opacity=".35" />
    </g>
  ),
  tower: ({ b, c, d }) => (
    <g>
      <path d="M72 262L84 76H116L128 262Z" fill={c} />
      <path d="M78 76L100 36L122 76Z" fill={b} />
      <path d="M92 150Q100 120 108 150V176H92Z" fill={d} />
      {[0, 1, 2].map((i) => <circle key={i} cx={40 + i * 60} cy={60 + i * 18} r="2.5" fill={c} />)}
    </g>
  ),
  sun: ({ b, c }) => (
    <g>
      {Array.from({ length: 16 }, (_, i) => <path key={i} d="M100 52V30" stroke={b} strokeWidth="6" strokeLinecap="round" transform={`rotate(${i * 22.5} 100 130)`} />)}
      <circle cx="100" cy="130" r="48" fill={c} />
      <circle cx="84" cy="122" r="5" fill={b} />
      <circle cx="116" cy="122" r="5" fill={b} />
      <path d="M82 144Q100 158 118 144" stroke={b} strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  ),
  city: ({ b, c, d }) => (
    <g>
      <circle cx="140" cy="80" r="30" fill={c} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const h = 70 + ((i * 53) % 90);
        return <rect key={i} x={10 + i * 26} y={270 - h} width="24" height={h} fill={i % 2 ? d : b} />;
      })}
    </g>
  ),
};

const CoverArt = memo(function CoverArt({ story, className }: { story: Pick<Story, "id" | "palette" | "motif">; className?: string }) {
  const [a, b, c] = story.palette;
  const d = "#0a0a12";
  const r = rng(story.id);
  const gid = `g${hash(story.id)}`;
  const dots = Array.from({ length: 26 }, () => [r() * 200, r() * 300, 0.6 + r() * 1.6] as const);
  return (
    <svg viewBox="0 0 200 300" className={cx("absolute inset-0 h-full w-full", className)} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} stopOpacity=".55" />
        </linearGradient>
        <pattern id={`${gid}p`} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="1.3" fill={c} opacity=".28" />
        </pattern>
        <radialGradient id={`${gid}r`}>
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </radialGradient>
        <mask id={`${gid}m`}>
          <rect width="200" height="300" fill={`url(#${gid}r)`} />
        </mask>
      </defs>
      <rect width="200" height="300" fill={a} />
      <rect width="200" height="300" fill={`url(#${gid})`} />
      <rect width="200" height="300" fill={`url(#${gid}p)`} mask={`url(#${gid}m)`} />
      {dots.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={p[2]} fill={c} opacity=".7" />)}
      {MOTIFS[story.motif]({ a, b, c, d })}
      <path d="M0 300V268Q50 252 100 266T200 258V300Z" fill={d} opacity=".55" />
      <rect x="6" y="6" width="188" height="288" fill="none" stroke={c} strokeWidth="1" opacity=".55" />
    </svg>
  );
});

/** Unified cover: AI art or procedural poster, with typographic overlay. */
export const Cover = memo(function Cover({ story, className, compact, rank, priority }: { story: Pick<Story, "id" | "title" | "alt" | "type" | "palette" | "motif" | "cover">; className?: string; compact?: boolean; rank?: number; priority?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const finalSrc = story.cover ? resolveImageUrl(story.cover) : null;
  const useImg = Boolean(finalSrc && failedSrc !== finalSrc);
  return (
    <div className={cx("relative isolate aspect-[2/3] overflow-hidden bg-ink [container-type:inline-size]", className)} style={{ background: story.palette[0] }}>
      {useImg && finalSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={finalSrc} alt={`Cover of ${story.title}`} loading={priority ? "eager" : "lazy"} decoding="async" onError={() => setFailedSrc(finalSrc)} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <CoverArt story={story} />
      )}
      {!compact && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/45 to-transparent" />
          {rank === undefined && <span className="absolute left-[5cqw] top-[5cqw] rounded-[3px] border border-white/70 bg-black/40 px-[3cqw] py-[1cqw] font-mono text-[4.2cqw] font-bold uppercase tracking-wider text-white backdrop-blur-sm">{TYPE_LABEL[story.type]}</span>}
          <span className="vtext absolute right-[5cqw] top-[5cqw] font-display text-[6cqw] leading-none text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,.6)]">{story.alt.length < 14 ? story.alt : ""}</span>
          <div className="absolute inset-x-[6cqw] bottom-[6cqw]">
            <div className="h-display text-[10.5cqw] uppercase leading-[0.98] text-white [text-shadow:0_2px_10px_rgba(0,0,0,.7)]">{story.title}</div>
          </div>
        </>
      )}
      {rank !== undefined && (
        <span className="absolute left-0 top-0 grid h-[20cqw] min-w-[20cqw] place-items-center bg-accent px-[4cqw] font-display text-[11cqw] text-white [clip-path:polygon(0_0,100%_0,82%_100%,0_100%)]">{rank}</span>
      )}
    </div>
  );
});
