"use client";

import { memo, useId } from "react";
import { PAGE_H, PAGE_W, type BBox, type PageSpec, type Panel } from "@/lib/manga";
import { clamp, rng } from "@/lib/util";

export interface PageStyle {
  color: boolean;
  palette: [string, string, string];
  strip: boolean;
}

const INK = "#14110f";
const PAPER = "#fbfaf6";
const FONT_UI = "'Bricolage Grotesque Variable', system-ui, sans-serif";
const FONT_DISPLAY = "'Dela Gothic One', 'Hiragino Sans', sans-serif";

interface C {
  uid: string;
  color: boolean;
  p: [string, string, string];
  ink: string;
  paper: string;
  hi: string;
}

const R = (b: BBox) => ({ x: b.x, y: b.y, width: b.w, height: b.h });

function wrap(text: string, max = 14): string[] {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    if ((cur + " " + w).trim().length > max && cur) {
      out.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  return out;
}

function speedLines(r: () => number, cx: number, cy: number, rIn: number, rOut: number, n: number, fill: string) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.06;
    const w = 0.01 + r() * r() * 0.05;
    const ri = rIn * (0.85 + r() * 0.7);
    const pts = [[cx + Math.cos(a - w) * rOut, cy + Math.sin(a - w) * rOut], [cx + Math.cos(a + w) * rOut, cy + Math.sin(a + w) * rOut], [cx + Math.cos(a) * ri, cy + Math.sin(a) * ri]];
    return <polygon key={i} points={pts.map((p) => p.join(",")).join(" ")} fill={fill} />;
  });
}

function Figure({ cx, base, h, fill, flip, accent }: { cx: number; base: number; h: number; fill: string; flip?: boolean; accent?: string }) {
  const s = h / 100;
  const d = flip ? -1 : 1;
  const X = (v: number) => (cx + v * s * d).toFixed(1);
  const Y = (v: number) => (base - v * s).toFixed(1);
  return (
    <g>
      <path d={`M${X(-13)} ${Y(80)}L${X(13)} ${Y(80)}L${X(18)} ${Y(52)}L${X(27)} ${Y(12)}L${X(11)} ${Y(30)}L${X(10)} ${Y(0)}L${X(-1)} ${Y(0)}L${X(-2)} ${Y(30)}L${X(-10)} ${Y(0)}L${X(-22)} ${Y(0)}L${X(-17)} ${Y(42)}Z`} fill={fill} />
      <path d={`M${X(-13)} ${Y(72)}Q${X(-40)} ${Y(66)}${X(-58)} ${Y(40)}Q${X(-34)} ${Y(52)}${X(-14)} ${Y(52)}Z`} fill={accent ?? fill} />
      <rect x={X(-3)} y={Y(86)} width={6 * s} height={7 * s} transform={flip ? `translate(${-6 * s} 0)` : undefined} fill={fill} />
      <circle cx={X(0)} cy={Y(91)} r={8.2 * s} fill={fill} />
      <path d={`M${X(-9)} ${Y(94)}L${X(-14)} ${Y(103)}L${X(-3)} ${Y(98)}L${X(2)} ${Y(106)}L${X(6)} ${Y(98)}L${X(14)} ${Y(101)}L${X(9)} ${Y(93)}Z`} fill={fill} />
    </g>
  );
}

function Bubble({ lines, b, r, c }: { lines: string[]; b: BBox; r: () => number; c: C }) {
  const text = lines.flatMap((l) => wrap(l, 14));
  let fs = clamp(Math.min(b.w, b.h) * 0.075, 15, 27);
  const maxLen = Math.max(...text.map((t) => t.length));
  let rx = maxLen * fs * 0.33 + fs * 1.2;
  if (rx * 2 > b.w * 0.88) {
    fs *= (b.w * 0.88) / (rx * 2);
    rx = b.w * 0.44;
  }
  const lh = fs * 1.18;
  const ry = (text.length * lh) / 2 + fs * 0.9;
  const side = r() < 0.5;
  const bx = clamp(b.x + b.w * (side ? 0.7 : 0.3), b.x + rx + 8, b.x + b.w - rx - 8);
  const by = clamp(b.y + ry + 14 + r() * b.h * 0.12, b.y + ry + 8, b.y + b.h - ry - 24);
  const tipX = bx + (side ? -1 : 1) * rx * 0.35;
  return (
    <g>
      <ellipse cx={bx} cy={by} rx={rx} ry={ry} fill="#fff" stroke={INK} strokeWidth="3" />
      <path d={`M${tipX - 10} ${by + ry - 4}L${tipX + (side ? -14 : 14)} ${by + ry + 26}L${tipX + 12} ${by + ry - 6}`} fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx={bx} cy={by} rx={rx - 2} ry={ry - 2} fill="#fff" />
      {text.map((t, i) => (
        <text key={i} x={bx} y={by - ((text.length - 1) * lh) / 2 + i * lh + fs * 0.34} textAnchor="middle" fontSize={fs} fontWeight="800" fill={INK} style={{ fontFamily: FONT_UI, textTransform: "uppercase" }}>
          {t}
        </text>
      ))}
    </g>
  );
}

function Caption({ text, b }: { text: string; b: BBox }) {
  const lines = wrap(text, 20);
  const fs = clamp(Math.min(b.w, b.h) * 0.06, 14, 22);
  const w = Math.min(b.w - 20, Math.max(...lines.map((l) => l.length)) * fs * 0.5 + 24);
  const h = lines.length * fs * 1.2 + 16;
  return (
    <g>
      <rect x={b.x + 10} y={b.y + 10} width={w} height={h} fill="#fff8d6" stroke={INK} strokeWidth="2.5" />
      {lines.map((l, i) => (
        <text key={i} x={b.x + 22} y={b.y + 10 + fs * 1.05 + 8 + i * fs * 1.2} fontSize={fs} fontStyle="italic" fontWeight="700" fill={INK} style={{ fontFamily: FONT_UI }}>
          {l}
        </text>
      ))}
    </g>
  );
}

function SceneArt({ panel, c }: { panel: Panel; c: C }) {
  const b = panel.bbox;
  const r = rng(panel.seed);
  const { uid } = c;
  const bgMono = <rect {...R(b)} fill={c.paper} />;
  const bgSky = <rect {...R(b)} fill={c.color ? `url(#${uid}sky)` : c.paper} />;
  switch (panel.scene) {
    case "skyline": {
      const mx = b.x + b.w * (0.2 + r() * 0.6);
      const my = b.y + b.h * (0.2 + r() * 0.15);
      const mr = Math.min(b.w, b.h) * (0.12 + r() * 0.08);
      const n = 7 + Math.floor(r() * 5);
      const bw = b.w / n;
      return (
        <g>
          {bgSky}
          {!c.color && <rect {...R(b)} fill={`url(#${uid}d1)`} mask={`url(#${uid}mVr)`} />}
          <circle cx={mx} cy={my} r={mr * 1.6} fill="none" stroke={c.color ? c.hi : INK} strokeOpacity=".5" strokeDasharray="2 8" strokeWidth="2" />
          <circle cx={mx} cy={my} r={mr} fill={c.hi} stroke={INK} strokeWidth="3" />
          {Array.from({ length: n }, (_, i) => {
            const h = b.h * (0.18 + r() * 0.42);
            const x = b.x + i * bw - r() * bw * 0.2;
            const w = bw * (1.05 + r() * 0.3);
            return (
              <g key={i}>
                <rect x={x} y={b.y + b.h - h} width={w} height={h + 2} fill={c.ink} />
                {Array.from({ length: 3 }, (_, k) => (
                  <rect key={k} x={x + w * (0.2 + r() * 0.5)} y={b.y + b.h - h + 10 + r() * (h - 24)} width={4} height={6} fill={c.color ? c.hi : PAPER} opacity={r() < 0.6 ? 1 : 0} />
                ))}
              </g>
            );
          })}
        </g>
      );
    }
    case "figure": {
      const fh = Math.min(b.h * 0.94, b.w * 2.3);
      const cx = b.x + b.w * (0.32 + r() * 0.36);
      return (
        <g>
          {bgSky}
          {!c.color && <rect {...R(b)} fill={`url(#${uid}hatch)`} mask={`url(#${uid}mR)`} />}
          {c.color && <circle cx={cx} cy={b.y + b.h * 0.45} r={Math.min(b.w, b.h) * 0.42} fill={c.hi} opacity=".22" />}
          <Figure cx={cx} base={b.y + b.h + 6} h={fh} fill={c.ink} flip={r() < 0.5} accent={c.color ? c.p[1] : c.ink} />
        </g>
      );
    }
    case "speed": {
      const cx = b.x + b.w * (0.3 + r() * 0.4);
      const cy = b.y + b.h * (0.4 + r() * 0.2);
      const rin = Math.min(b.w, b.h) * 0.2;
      return (
        <g>
          <rect {...R(b)} fill={c.color ? c.p[0] : c.paper} />
          {speedLines(r, cx, cy, rin, Math.hypot(b.w, b.h), 70, c.color ? c.hi : INK)}
          <circle cx={cx} cy={cy} r={rin * 0.92} fill={c.color ? c.p[1] : c.paper} />
          <Figure cx={cx} base={b.y + b.h + 6} h={Math.min(b.h * 0.9, b.w * 1.5)} fill={c.ink} flip={r() < 0.5} />
        </g>
      );
    }
    case "eyes": {
      const cy = b.y + b.h * 0.52;
      const ew = Math.min(b.w * 0.34, b.h * 1.5);
      const eyes = [b.x + b.w * 0.27, b.x + b.w * 0.73];
      return (
        <g>
          {c.color ? <rect {...R(b)} fill={`url(#${uid}sky)`} /> : bgMono}
          {!c.color && <rect {...R(b)} fill={`url(#${uid}d2)`} mask={`url(#${uid}mV)`} />}
          {eyes.map((x, i) => (
            <g key={i}>
              <path d={`M${x - ew / 2} ${cy}Q${x} ${cy - ew * 0.4} ${x + ew / 2} ${cy}Q${x} ${cy + ew * 0.3} ${x - ew / 2} ${cy}Z`} fill="#fff" stroke={INK} strokeWidth="4" />
              <circle cx={x + (i ? -1 : 1) * ew * 0.05} cy={cy} r={ew * 0.2} fill={c.color ? c.p[1] : INK} stroke={INK} strokeWidth="3" />
              <circle cx={x + (i ? -1 : 1) * ew * 0.05} cy={cy} r={ew * 0.09} fill={INK} />
              <circle cx={x + ew * 0.08} cy={cy - ew * 0.08} r={ew * 0.055} fill="#fff" />
              <path d={`M${x - ew / 2 - 6} ${cy + 3}Q${x} ${cy - ew * 0.42} ${x + ew / 2 + 6} ${cy + 3}`} fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
              <path d={`M${x - ew * 0.52} ${cy - ew * 0.4}Q${x} ${cy - ew * 0.66} ${x + ew * 0.52} ${cy - ew * 0.34}`} fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
    }
    case "burst": {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const rr = Math.min(b.w, b.h);
      const pts = Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2;
        const rad = i % 2 ? rr * 0.27 : rr * (0.42 + r() * 0.08);
        return `${(cx + Math.cos(a) * rad * (b.w / rr) * 0.95).toFixed(1)},${(cy + Math.sin(a) * rad * (b.h / rr) * 0.95).toFixed(1)}`;
      }).join(" ");
      return (
        <g>
          <rect {...R(b)} fill={c.color ? c.p[0] : c.paper} />
          {speedLines(r, cx, cy, rr * 0.3, Math.hypot(b.w, b.h), 90, c.color ? c.hi : INK)}
          <polygon points={pts} fill={c.color ? c.hi : "#fff"} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <text x={cx} y={cy + rr * 0.07} textAnchor="middle" fontSize={rr * 0.2} fill={INK} transform={`rotate(-8 ${cx} ${cy})`} style={{ fontFamily: FONT_DISPLAY }}>
            {panel.sfx ?? "DON!"}
          </text>
        </g>
      );
    }
    case "dark": {
      return (
        <g>
          <rect {...R(b)} fill={c.color ? c.p[0] : INK} />
          <circle cx={b.x + b.w * (0.3 + r() * 0.4)} cy={b.y + b.h * 0.55} r={Math.min(b.w, b.h) * 0.3} fill={c.color ? c.p[1] : "#fff"} opacity=".14" />
          {Array.from({ length: 24 }, (_, i) => <circle key={i} cx={b.x + r() * b.w} cy={b.y + r() * b.h} r={0.8 + r() * 1.6} fill="#fff" opacity={0.3 + r() * 0.6} />)}
        </g>
      );
    }
    default: {
      return (
        <g>
          {c.color ? <rect {...R(b)} fill={`url(#${uid}sky)`} /> : bgMono}
          <rect {...R(b)} fill={`url(#${uid}d2)`} mask={`url(#${uid}${r() < 0.5 ? "mV" : "mR"})`} opacity={c.color ? 0.28 : 1} />
          <polygon points={`${b.x + b.w * 0.55},${b.y} ${b.x + b.w * 0.68},${b.y} ${b.x + b.w * 0.4},${b.y + b.h} ${b.x + b.w * 0.27},${b.y + b.h}`} fill={c.color ? c.hi : "#fff"} opacity={c.color ? 0.18 : 0.85} />
        </g>
      );
    }
  }
}

function PageSvg({ page, style, className, activePanel }: { page: PageSpec; style: PageStyle; className?: string; activePanel?: number | null }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const c: C = { uid, color: style.color, p: style.palette, ink: style.color ? "#0a0a12" : INK, paper: PAPER, hi: style.color ? style.palette[2] : "#fff" };
  const bg = style.strip ? "#0d0d12" : style.color ? "#f4f1ea" : PAPER;
  const pn = style.strip ? 0 : 4;

  if (page.kind === "title" || page.kind === "end") {
    const isEnd = page.kind === "end";
    const titleLines = wrap(page.title, 16);
    return (
      <svg viewBox={`0 0 ${PAGE_W} ${PAGE_H}`} className={className} role="img" aria-label={isEnd ? "End of chapter — to be continued" : `Chapter ${page.chapter}: ${page.title}`}>
        <Defs c={c} />
        {isEnd ? (
          <g>
            <rect width={PAGE_W} height={PAGE_H} fill={INK} />
            <rect width={PAGE_W} height={PAGE_H} fill={`url(#${uid}d2)`} opacity=".08" />
            <rect x="40" y="40" width={PAGE_W - 80} height={PAGE_H - 80} fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="3" />
            <text x={PAGE_W / 2} y={PAGE_H / 2 - 20} textAnchor="middle" fontSize="190" fill="#ff4a22" style={{ fontFamily: FONT_DISPLAY }}>つづく</text>
            <text x={PAGE_W / 2} y={PAGE_H / 2 + 70} textAnchor="middle" fontSize="28" letterSpacing="14" fill="#fff" style={{ fontFamily: "'JetBrains Mono Variable', monospace" }}>TO BE CONTINUED</text>
            <text x={PAGE_W / 2} y={PAGE_H / 2 + 130} textAnchor="middle" fontSize="20" fill="#fff" opacity=".5" style={{ fontFamily: FONT_UI }}>Chapter {page.chapter} · {page.title}</text>
          </g>
        ) : (
          <g>
            <SceneArt panel={page.panels[0]} c={c} />
            <rect width={PAGE_W} height={PAGE_H} fill={`url(#${uid}fade)`} />
            <text x="60" y="880" fontSize="38" letterSpacing="10" fill="#fff" style={{ fontFamily: "'JetBrains Mono Variable', monospace" }}>CHAPTER</text>
            <text x="52" y="1010" fontSize="150" fill="#fff" style={{ fontFamily: FONT_DISPLAY }}>{String(page.chapter).padStart(2, "0")}</text>
            {titleLines.map((l, i) => <text key={i} x="62" y={1070 + i * 52} fontSize="46" fontWeight="800" fill="#fff" style={{ fontFamily: FONT_UI, textTransform: "uppercase" }}>{l}</text>)}
            <rect x="60" y="1140" width="140" height="8" fill="#ff4a22" />
          </g>
        )}
      </svg>
    );
  }

  return (
    <svg viewBox={`0 0 ${PAGE_W} ${PAGE_H}`} className={className} role="img" aria-label={`Page ${page.n} of chapter ${page.chapter}`}>
      <Defs c={c} polys={page.panels} />
      <rect width={PAGE_W} height={PAGE_H} fill={bg} />
      {page.panels.map((p) => (
        <g key={p.id}>
          <g clipPath={`url(#${uid}c${p.id})`}>
            <SceneArt panel={p} c={c} />
            {p.caption && <Caption text={p.caption} b={p.bbox} />}
            {p.text && <Bubble lines={p.text} b={p.bbox} r={rng(p.seed + 7)} c={c} />}
            {p.sfx && p.scene === "speed" && (
              <text x={p.bbox.x + p.bbox.w * 0.7} y={p.bbox.y + p.bbox.h * 0.88} textAnchor="middle" fontSize={Math.min(p.bbox.w, p.bbox.h) * 0.17} fill={c.color ? c.hi : "#fff"} stroke={INK} strokeWidth="6" paintOrder="stroke" transform={`rotate(-6 ${p.bbox.x + p.bbox.w * 0.7} ${p.bbox.y + p.bbox.h * 0.88})`} style={{ fontFamily: FONT_DISPLAY }}>
                {p.sfx}
              </text>
            )}
          </g>
          {pn > 0 && <polygon points={p.poly.map((q) => q.join(",")).join(" ")} fill="none" stroke={INK} strokeWidth={pn} strokeLinejoin="miter" />}
          {activePanel === p.id && <polygon points={p.poly.map((q) => q.join(",")).join(" ")} fill="none" stroke="#ff4a22" strokeWidth="8" />}
        </g>
      ))}
    </svg>
  );
}

function Defs({ c, polys }: { c: C; polys?: Panel[] }) {
  const { uid } = c;
  return (
    <defs>
      <pattern id={`${uid}d1`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="4.5" cy="4.5" r="1.7" fill={INK} /></pattern>
      <pattern id={`${uid}d2`} width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="7.5" cy="7.5" r="3.4" fill={c.color ? c.p[2] : INK} /></pattern>
      <pattern id={`${uid}hatch`} width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V11" stroke={INK} strokeWidth="1.8" /></pattern>
      <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.p[0]} /><stop offset="1" stopColor={c.p[1]} /></linearGradient>
      <linearGradient id={`${uid}fade`} x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".88" /></linearGradient>
      <linearGradient id={`${uid}gV`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" /></linearGradient>
      <linearGradient id={`${uid}gVr`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <radialGradient id={`${uid}gR`}><stop offset=".25" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" /></radialGradient>
      <mask id={`${uid}mV`} maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill={`url(#${uid}gV)`} /></mask>
      <mask id={`${uid}mVr`} maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill={`url(#${uid}gVr)`} /></mask>
      <mask id={`${uid}mR`} maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill={`url(#${uid}gR)`} /></mask>
      {polys?.map((p) => (
        <clipPath key={p.id} id={`${uid}c${p.id}`}><polygon points={p.poly.map((q) => q.join(",")).join(" ")} /></clipPath>
      ))}
    </defs>
  );
}

export const MangaPageSvg = memo(PageSvg);
