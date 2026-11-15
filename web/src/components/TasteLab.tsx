"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import { TASTE_KEYS, type Taste } from "@/lib/types";
import { matchScore, explainMatch, TASTE_LABEL } from "@/lib/content";
import { makeInitialState } from "@/data/accounts";
import { useApp } from "@/lib/store";
import { Cover } from "./Cover";
import { Icon, TypeBadge, Avatar } from "./ui";
import { SSR_NOW } from "@/lib/util";

const N = TASTE_KEYS.length;
const CX = 150;
const CY = 150;
const R = 100;
const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;

function Radar({ t, onChange }: { t: Taste; onChange: (k: keyof Taste, v: number) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const drag = useRef(false);
  const set = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((e.clientX - r.left) / r.width) * 300 - CX;
    const y = ((e.clientY - r.top) / r.height) * 300 - CY;
    let best = 0;
    let bd = 9;
    const a = Math.atan2(y, x);
    for (let i = 0; i < N; i++) {
      const d = Math.abs(Math.atan2(Math.sin(a - ang(i)), Math.cos(a - ang(i))));
      if (d < bd) { bd = d; best = i; }
    }
    const proj = x * Math.cos(ang(best)) + y * Math.sin(ang(best));
    onChange(TASTE_KEYS[best], Math.max(0, Math.min(10, Math.round((proj / R) * 10))));
  };
  const pts = TASTE_KEYS.map((k, i) => [CX + Math.cos(ang(i)) * R * (t[k] / 10), CY + Math.sin(ang(i)) * R * (t[k] / 10)]);
  return (
    <svg
      ref={ref}
      viewBox="0 0 300 300"
      className="mx-auto aspect-square w-full max-w-[320px] cursor-crosshair touch-none select-none"
      onPointerDown={(e) => { drag.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); set(e); }}
      onPointerMove={(e) => drag.current && set(e)}
      onPointerUp={() => (drag.current = false)}
      role="group"
      aria-label="Taste radar. Drag to adjust."
    >
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={TASTE_KEYS.map((_, i) => `${CX + Math.cos(ang(i)) * R * f},${CY + Math.sin(ang(i)) * R * f}`).join(" ")} fill="none" stroke="var(--line)" strokeOpacity={f === 1 ? 0.9 : 0.25} strokeWidth={f === 1 ? 2 : 1} strokeDasharray={f === 1 ? "" : "3 3"} />
      ))}
      {TASTE_KEYS.map((k, i) => (
        <g key={k}>
          <line x1={CX} y1={CY} x2={CX + Math.cos(ang(i)) * R} y2={CY + Math.sin(ang(i)) * R} stroke="var(--line)" strokeOpacity=".3" />
          <text x={CX + Math.cos(ang(i)) * (R + 24)} y={CY + Math.sin(ang(i)) * (R + 24) + 4} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="var(--ink)" style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".05em" }}>
            {TASTE_LABEL[k]}
          </text>
        </g>
      ))}
      <polygon points={pts.map((p) => p.join(",")).join(" ")} fill="var(--accent)" fillOpacity=".3" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" style={{ transition: "all .2s" }} />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="7" fill="var(--card)" stroke="var(--line)" strokeWidth="2.5" style={{ transition: "all .2s" }} />
      ))}
    </svg>
  );
}

function Ring({ v }: { v: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg width="58" height="58" viewBox="0 0 58 58" aria-label={`${v}% match`}>
      <circle cx="29" cy="29" r={r} fill="none" stroke="var(--paper2)" strokeWidth="6" />
      <circle cx="29" cy="29" r={r} fill="none" stroke={v > 80 ? "var(--mint)" : "var(--hl)"} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} transform="rotate(-90 29 29)" style={{ transition: "stroke-dashoffset .5s" }} />
      <text x="29" y="33" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--ink)" style={{ fontFamily: "var(--font-display)" }}>{v}</text>
    </svg>
  );
}

export function TasteLab({ compact }: { compact?: boolean }) {
  const { me, act, catalog, account } = useApp();
  const t = me.taste;
  const recs = useMemo(
    () =>
      catalog
        .filter((s) => !me.library.includes(s.id) && !me.progress[s.id])
        .map((s) => ({ s, score: matchScore(s, t, me.profile.genres) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, compact ? 3 : 4)
        .map((x) => ({ ...x, why: explainMatch(x.s, t, me.profile.genres) })),
    [catalog, me.library, me.progress, me.profile.genres, t, compact],
  );
  const baseline = useMemo(() => makeInitialState(SSR_NOW).data[account.id]?.taste, [account.id]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]" id="taste">
      <div className="panel p-5">
        <div className="flex items-center gap-3">
          <Avatar account={account} style={me.profile.avatar} size={42} />
          <div className="min-w-0">
            <div className="label">Taste signature</div>
            <div className="truncate text-base font-extrabold">Tuned for {account.name.split(" ")[0]}</div>
          </div>
        </div>
        <Radar t={t} onChange={(k, v) => act.setTaste({ [k]: v })} />
        <p className="text-center font-mono text-[0.68rem] uppercase tracking-wider text-muted">Drag the points — recommendations re-rank live</p>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
          {TASTE_KEYS.map((k) => (
            <label key={k} className="block">
              <span className="flex items-center justify-between font-mono text-[0.65rem] font-bold uppercase tracking-wide"><span>{TASTE_LABEL[k]}</span><span>{t[k]}</span></span>
              <input type="range" min={0} max={10} value={t[k]} onChange={(e) => act.setTaste({ [k]: +e.target.value })} className="w-full" aria-label={TASTE_LABEL[k]} />
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => act.setTaste(Object.fromEntries(TASTE_KEYS.map((k) => [k, Math.floor(Math.random() * 11)])))}><Icon name="shuffle" size={14} /> Surprise me</button>
          {baseline && <button className="btn btn-ghost btn-sm" onClick={() => act.setTaste(baseline)}>Reset to my profile</button>}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Icon name="wand" size={18} className="text-accent" />
          <h3 className="h-display text-xl">Why these match you</h3>
        </div>
        <ul className="space-y-4">
          {recs.map(({ s, score, why }, i) => (
            <li key={s.id} className="panel panel-hover anim-fade-up flex gap-4 p-3 sm:p-4" style={{ animationDelay: `${i * 70}ms` }}>
              <Link href={`/story/${s.id}`} className="block w-20 shrink-0 sm:w-24">
                <Cover story={s} compact className="rounded border-2 border-line" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <TypeBadge type={s.type} />
                    <Link href={`/story/${s.id}`} className="mt-1 block truncate text-lg font-extrabold hover:underline">{s.title}</Link>
                  </div>
                  <Ring v={score} />
                </div>
                <ul className="mt-2 space-y-1.5">
                  {why.map((r, j) => (
                    <li key={j} className="flex gap-2 text-[0.82rem] leading-snug text-ink2">
                      <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-line bg-hl text-[0.7rem] font-bold text-[#15120f]">{r.icon}</span>
                      <span>{r.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
