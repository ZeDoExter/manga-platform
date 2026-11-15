"use client";

import { useEffect, useId, useMemo, type ReactNode } from "react";
import type { Account, StoryType } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/types";
import { cx } from "@/lib/util";

/* ------------------------------ icons ------------------------------ */
const ICONS: Record<string, ReactNode> = {
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 5 5 9-10" />,
  play: <path d="M7 4v16l13-8z" />,
  book: (<><path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z" /><path d="M4 20a2 2 0 0 1 2-2h13v3H6a2 2 0 0 1-2-1z" /></>),
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  star: <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2-5.5-3-5.5 3 1-6.2L3 9.7l6.2-.9z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  left: <path d="m15 5-7 7 7 7" />,
  right: <path d="m9 5 7 7-7 7" />,
  down: <path d="m5 9 7 7 7-7" />,
  up: <path d="m5 15 7-7 7 7" />,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>),
  home: <path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z" />,
  compass: (<><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>),
  library: <path d="M4 4h4v16H4zM10 4h4v16h-4zM16.5 5.5l3.8-1 3.2 14.6-3.8 1z" />,
  pen: <path d="M4 20l1-5L16 4l4 4L9 19zM14 6l4 4" />,
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>),
  sparkles: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  fullscreen: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  sliders: <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  share: (<><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" /></>),
  flame: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 2.5 1.5 2.5C10 9 11 6 12 3z" />,
  eye: (<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  mute: <path d="M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6" />,
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  lock: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  coin: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9M9 10h6M9 14h6" /></>),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  out: <path d="M7 17 17 7M8 7h9v9" />,
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />,
  copy: (<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  image: (<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>),
  type: <path d="M5 6V4h14v2M12 4v16M9 20h6" />,
  pin: <path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  wand: <path d="M5 19 17 7l-2-2L3 17zM15 5l4 4M19 3v2M20 4h-2M6 5v2M7 6H5" />,
  shuffle: <path d="M3 7h4c4 0 6 10 10 10h4M3 17h4c1.5 0 2.7-1.2 3.7-2.8M21 7h-4c-1.5 0-2.7 1.2-3.7 2.8M18 4l3 3-3 3M18 14l3 3-3 3" />,
};

export function Icon({ name, size = 18, className, stroke = 2, fill }: { name: keyof typeof ICONS | string; size?: number; className?: string; stroke?: number; fill?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ICONS[name] ?? null}
    </svg>
  );
}

/* ------------------------------ small pieces ------------------------------ */
const BADGE: Record<StoryType, string> = {
  manga: "bg-ink text-paper",
  manhwa: "bg-accent2 text-white",
  manhua: "bg-accent text-white",
  "light-novel": "bg-hl text-[#15120f]",
  "web-novel": "bg-mint text-[#15120f]",
  original: "bg-[#ff8ac2] text-[#15120f]",
};

export function TypeBadge({ type, className }: { type: StoryType; className?: string }) {
  return (
    <span className={cx("inline-flex items-center rounded-[4px] border-[1.5px] border-line px-1.5 py-0.5 font-mono text-[0.62rem] font-bold uppercase tracking-wider", BADGE[type], className)}>
      {TYPE_LABEL[type]}
    </span>
  );
}

export function Stars({ value, size = 14, onChange, className, light }: { value: number; size?: number; onChange?: (n: number) => void; className?: string; light?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-0.5", className)} role={onChange ? "radiogroup" : "img"} aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value >= n - 0.25;
        const half = !on && value >= n - 0.75;
        const star = (
          <span className="relative inline-block" style={{ width: size, height: size }}>
            <Icon name="star" size={size} stroke={1.6} className={cx("absolute inset-0", light ? "text-white/40" : "text-line/40")} />
            {(on || half) && (
              <span className="absolute inset-0 overflow-hidden text-hl" style={{ width: half ? "50%" : "100%" }}>
                <Icon name="star" size={size} stroke={1.6} fill className="text-hl [filter:drop-shadow(0_0_0.5px_var(--line))]" />
              </span>
            )}
          </span>
        );
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={Math.round(value) === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange(n)} className="transition-transform hover:scale-125">
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </span>
  );
}

export const AVATAR_STYLES: [string, string, string][] = [
  ["#0b1033", "#ffd27a", "月"],
  ["#09090f", "#00e5c7", "刀"],
  ["#2a0a08", "#ff8a3d", "炎"],
  ["#1b2a49", "#f4a259", "灯"],
  ["#2b0f2e", "#ff4fa3", "夜"],
  ["#0c3b2e", "#35d07f", "葉"],
];

export function Avatar({ account, size = 40, style, className, ring }: { account?: Pick<Account, "colors" | "glyph" | "name">; size?: number; style?: number; className?: string; ring?: boolean }) {
  const s = style !== undefined ? AVATAR_STYLES[style % AVATAR_STYLES.length] : undefined;
  const c1 = s ? s[0] : account?.colors[0] ?? "#222";
  const c2 = s ? s[1] : account?.colors[1] ?? "#fff";
  const g = s ? s[2] : account?.glyph ?? "?";
  return (
    <span
      className={cx("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-line font-display", ring && "ring-2 ring-accent ring-offset-2 ring-offset-paper", className)}
      style={{ width: size, height: size, background: `radial-gradient(circle at 30% 25%, ${c2}55, transparent 60%), linear-gradient(135deg, ${c1}, ${c1}dd)`, color: c2, fontSize: size * 0.5 }}
      aria-label={account?.name}
      role="img"
    >
      <span className="leading-none">{g}</span>
      <span className="tone absolute inset-0 opacity-30" style={{ ["--tone" as string]: `${c2}66` }} />
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide, className }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cx("panel anim-pop relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-lg", wide ? "max-w-4xl" : "max-w-md", className)}>
        <div className="flex shrink-0 items-center justify-between border-b-2 border-line bg-card px-4 py-3">
          <h3 className="h-display text-lg text-ink">{title}</h3>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="scroll-y p-4 text-ink sm:p-5">{children}</div>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: string; icon?: string; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cx("scroll-x -mx-2 -my-2 flex w-full max-w-full gap-1.5 overflow-x-auto px-2 py-2", className)}>
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={cx(
              "inline-flex shrink-0 items-center gap-2 rounded-md border-2 border-line px-3.5 py-2 text-sm font-bold transition-all",
              on ? "bg-ink text-paper shadow-[3px_3px_0_var(--accent)]" : "bg-card text-ink hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--shadow)]",
            )}
          >
            {t.icon && <Icon name={t.icon} size={15} />}
            {t.label}
            {t.count !== undefined && <span className={cx("rounded-full px-1.5 font-mono text-[0.65rem]", on ? "bg-paper text-ink" : "bg-ink text-paper")}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SectionHead({ kicker, title, jp, action, className }: { kicker?: string; title: string; jp?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("mb-5 flex items-end justify-between gap-4", className)}>
      <div>
        {kicker && <div className="label">{kicker}</div>}
        <h2 className="h-display mt-1 text-[1.7rem] md:text-4xl">
          {title}
          {jp && <span className="ml-3 align-top font-sans text-sm font-extrabold text-accent">{jp}</span>}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function Empty({ icon = "sparkles", title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="panel-flat tone flex flex-col items-center gap-3 border-dashed px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full border-2 border-line bg-card">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="h-display text-xl">{title}</h3>
      {text && <p className="max-w-md text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}

export function ProgressBar({ value, className, color = "var(--accent)" }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full border border-line/50 bg-paper2", className)} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: color }} />
    </div>
  );
}

export function Sparkline({ data, width = 120, height = 36, color = "var(--accent)", fill = true, className }: { data: number[]; width?: number; height?: number; color?: string; fill?: boolean; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const path = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - 3 - ((v - min) / (max - min || 1)) * (height - 6)]);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    return { line, area: `${line} L${width} ${height} L0 ${height}Z` };
  }, [data, width, height]);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cx("overflow-visible", className)} style={className?.includes("w-full") ? { width: "100%", height: "auto" } : undefined} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={path.area} fill={`url(#${id})`} />}
      <path d={path.line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}


export function Stat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cx("panel-flat p-3.5", className)}>
      <div className="label">{label}</div>
      <div className="h-display mt-1 text-2xl">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
