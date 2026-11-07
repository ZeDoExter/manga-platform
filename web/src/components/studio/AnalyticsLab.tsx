"use client";

import { useMemo, useState } from "react";
import type { StudioStory } from "@/lib/types";
import { STORY_MAP } from "@/data/stories";
import { DAYS, demographics, heat, reactionMix, retention, series } from "@/lib/analytics";
import { ECHO_EMOJI, type EchoKind } from "@/lib/content";
import { cx, fmtNum } from "@/lib/util";
import { useApp } from "@/lib/store";
import { Icon, Tabs } from "../ui";
import { SimBanner } from "./common";

const W = 720;
const H = 250;
const PL = 44;
const PR = 12;
const PT = 14;
const PB = 28;
const AGE_COL = ["#ff4a22", "#3340ff", "#ffd43b", "#12b58b", "#ff4fa3"];

function localInput(t: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:00`;
}

export function AnalyticsLab({ story }: { story: StudioStory }) {
  const { act, now, toast } = useApp();
  const pub = story.chapters.filter((c) => c.status === "published").sort((a, b) => a.number - b.number);
  const base = STORY_MAP[story.id] ? STORY_MAP[story.id].weekly * 95 : 60 + pub.length * 45;
  const [metric, setMetric] = useState<"readers" | "follows" | "likes">("readers");
  const [days, setDays] = useState(30);
  const [hov, setHov] = useState<number | null>(null);
  const [selBar, setSelBar] = useState<number | null>(null);
  const [slot, setSlot] = useState<{ d: number; h: number }>({ d: 4, h: 21 });
  const [ageHover, setAgeHover] = useState<number | null>(null);

  const scale = { readers: 1, follows: 0.05, likes: 0.2 }[metric];
  const all = useMemo(() => series(story.id + metric, days * 2, Math.max(2, base * scale)), [story.id, metric, days, base, scale]);
  const cur = all.slice(days);
  const prev = all.slice(0, days);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const delta = Math.round(((sum(cur) - sum(prev)) / sum(prev)) * 100);
  const max = Math.max(...cur) * 1.08;
  const X = (i: number) => PL + (i / (cur.length - 1)) * (W - PL - PR);
  const Y = (v: number) => PT + (1 - v / max) * (H - PT - PB);
  const line = cur.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${X(cur.length - 1)} ${H - PB} L${X(0)} ${H - PB}Z`;

  const nRet = Math.min(12, Math.max(6, pub.length || 8));
  const ret = useMemo(() => retention(story.id, nRet), [story.id, nRet]);
  const retLabels = Array.from({ length: nRet }, (_, i) => (pub.length >= nRet ? pub[pub.length - nRet + i].number : i + 1));
  const drops = ret.map((v, i) => (i ? ret[i - 1] - v : 0));
  const worst = drops.indexOf(Math.max(...drops));

  const hm = useMemo(() => heat(story.id), [story.id]);
  const flat = hm.flat();
  const avgHeat = flat.reduce((a, b) => a + b, 0) / flat.length;
  let best = { d: 0, h: 0, v: 0 };
  hm.forEach((row, d) => row.forEach((v, h) => v > best.v && (best = { d, h, v })));
  const projOf = (d: number, h: number) => Math.round(base * 9 * (0.35 + 1.5 * hm[d][h]));
  const proj = projOf(slot.d, slot.h);
  const vsAvg = Math.round(((0.35 + 1.5 * hm[slot.d][slot.h]) / (0.35 + 1.5 * avgHeat) - 1) * 100);

  const demo = useMemo(() => demographics(story.id), [story.id]);
  const mix = useMemo(() => reactionMix(story.id), [story.id]);
  const R = 62;
  const C = 2 * Math.PI * R;
  let off = 0;

  const applySlot = () => {
    const target = [...story.chapters].filter((c) => c.status !== "published").sort((a, b) => a.number - b.number)[0];
    if (!target) return toast("No draft to schedule — create a chapter first", "warn");
    let when = "";
    for (let i = 1; i <= 7; i++) {
      const t = new Date(now + i * 86400000);
      if ((t.getDay() + 6) % 7 === slot.d) {
        t.setHours(slot.h, 0, 0, 0);
        when = localInput(t);
        break;
      }
    }
    act.upsertChapter(story.id, { ...target, status: "scheduled", scheduledFor: when, updatedAt: Date.now() });
    toast(`Chapter ${target.number} scheduled for ${DAYS[slot.d]} ${String(slot.h).padStart(2, "0")}:00 ✓`);
  };

  return (
    <div className="space-y-6">
      <SimBanner>Analytics Lab is a simulation — every number is generated from your story’s seed. Nothing here is real reader data.{pub.length === 0 && " Publish a chapter to start the (simulated) clock; this is sample data."}</SimBanner>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={metric} onChange={setMetric} tabs={[{ id: "readers", label: "Readers", icon: "eye" }, { id: "follows", label: "New followers", icon: "user" }, { id: "likes", label: "Likes", icon: "heart" }]} />
            <div className="flex gap-1">{[7, 30, 90].map((d) => <button key={d} className={cx("chip", days === d && "chip-on")} onClick={() => { setDays(d); setHov(null); }}>{d}d</button>)}</div>
          </div>
          <div className="mt-3 flex items-end gap-4">
            <div><div className="h-display text-4xl">{fmtNum(sum(cur))}</div><div className="font-mono text-[0.68rem] text-muted">{metric} · last {days} days</div></div>
            <span className={cx("chip", delta >= 0 ? "!border-line !bg-mint !text-[#15120f]" : "!border-line !bg-accent !text-white")}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs previous</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full touch-none" onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * W; setHov(Math.max(0, Math.min(cur.length - 1, Math.round(((x - PL) / (W - PL - PR)) * (cur.length - 1))))); }} onPointerLeave={() => setHov(null)} role="img" aria-label={`${metric} over the last ${days} days`}>
            <defs><linearGradient id="alg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".4" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => <g key={f}><line x1={PL} x2={W - PR} y1={PT + f * (H - PT - PB)} y2={PT + f * (H - PT - PB)} stroke="var(--line)" strokeOpacity=".15" strokeDasharray="3 4" /><text x={PL - 6} y={PT + f * (H - PT - PB) + 3} textAnchor="end" fontSize="9.5" fill="var(--muted)" style={{ fontFamily: "var(--font-mono)" }}>{fmtNum(max * (1 - f))}</text></g>)}
            <path d={area} fill="url(#alg)" />
            <path d={line} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            <text x={PL} y={H - 8} fontSize="9.5" fill="var(--muted)" style={{ fontFamily: "var(--font-mono)" }}>{days}d ago</text>
            <text x={W - PR} y={H - 8} textAnchor="end" fontSize="9.5" fill="var(--muted)" style={{ fontFamily: "var(--font-mono)" }}>today</text>
            {hov !== null && (
              <g>
                <line x1={X(hov)} x2={X(hov)} y1={PT} y2={H - PB} stroke="var(--line)" strokeWidth="1.5" />
                <circle cx={X(hov)} cy={Y(cur[hov])} r="6" fill="var(--card)" stroke="var(--accent)" strokeWidth="3" />
                <g transform={`translate(${Math.min(W - 130, Math.max(PL, X(hov) - 56))} ${Math.max(PT, Y(cur[hov]) - 52)})`}>
                  <rect width="112" height="40" rx="6" fill="var(--ink)" /><text x="10" y="17" fontSize="10" fill="var(--paper)" style={{ fontFamily: "var(--font-mono)" }}>{days - 1 - hov === 0 ? "today" : `${days - 1 - hov}d ago`}</text><text x="10" y="33" fontSize="14" fontWeight="800" fill="var(--paper)">{cur[hov].toLocaleString()}</text>
                </g>
              </g>
            )}
          </svg>
        </div>

        <div className="space-y-4">
          <div className="panel p-4">
            <h3 className="h-display text-lg">Audience</h3>
            <div className="mt-2 flex items-center gap-4">
              <svg viewBox="0 0 160 160" className="w-36 shrink-0 -rotate-90" role="img" aria-label="Age distribution">
                {demo.ages.map((a, i) => { const len = a.value * C; const el = <circle key={a.label} cx="80" cy="80" r={R} fill="none" stroke={AGE_COL[i]} strokeWidth={ageHover === i ? 30 : 24} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} onMouseEnter={() => setAgeHover(i)} onMouseLeave={() => setAgeHover(null)} style={{ transition: "stroke-width .15s", cursor: "pointer" }} />; off += len; return el; })}
                <g className="rotate-90" style={{ transformOrigin: "80px 80px" }}><text x="80" y="78" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--ink)" style={{ fontFamily: "var(--font-display)" }}>{ageHover !== null ? `${Math.round(demo.ages[ageHover].value * 100)}%` : "Age"}</text><text x="80" y="95" textAnchor="middle" fontSize="10" fill="var(--muted)" style={{ fontFamily: "var(--font-mono)" }}>{ageHover !== null ? demo.ages[ageHover].label : "hover"}</text></g>
              </svg>
              <ul className="flex-1 space-y-1.5 text-xs font-bold">{demo.ages.map((a, i) => <li key={a.label} className="flex items-center gap-2" onMouseEnter={() => setAgeHover(i)} onMouseLeave={() => setAgeHover(null)}><span className="size-2.5 rounded-sm" style={{ background: AGE_COL[i] }} />{a.label}<span className="ml-auto font-mono">{Math.round(a.value * 100)}%</span></li>)}</ul>
            </div>
            <div className="mt-3 space-y-1.5">{demo.regions.map((r) => <div key={r.label} className="flex items-center gap-2 font-mono text-[0.68rem]"><span className="w-24 truncate">{r.label}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-paper2"><div className="h-full bg-accent2" style={{ width: `${r.value * 100}%` }} /></div><span className="w-8 text-right">{Math.round(r.value * 100)}%</span></div>)}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-4">
          <h3 className="h-display text-lg">Chapter retention</h3>
          <p className="text-xs text-muted">Share of readers who made it to each chapter. Click a bar.</p>
          <div className="mt-4 flex h-44 items-end gap-1.5" role="group" aria-label="Retention by chapter">
            {ret.map((v, i) => (
              <button key={i} onClick={() => setSelBar(i)} className="group relative flex h-full flex-1 flex-col justify-end" aria-label={`Chapter ${retLabels[i]}: ${v}% retention`}>
                <span className="mb-1 text-center font-mono text-[0.58rem] opacity-0 transition-opacity group-hover:opacity-100">{v}%</span>
                <span className={cx("block w-full rounded-t border-2 border-b-0 border-line transition-all", i === worst ? "bg-accent" : "bg-ink", selBar === i && "!bg-hl")} style={{ height: `${v}%` }} />
                <span className="mt-1 text-center font-mono text-[0.6rem] text-muted">{retLabels[i]}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-md border-2 border-dashed border-line/50 bg-paper2 p-3 text-sm">
            {selBar !== null ? (
              <><b>Ch. {retLabels[selBar]}</b> keeps <b>{ret[selBar]}%</b> of first-chapter readers{selBar > 0 && <> — {drops[selBar].toFixed(1)} points lost vs. the previous chapter</>}.</>
            ) : (
              <><Icon name="zap" size={13} className="mr-1 inline text-accent" /><b>Biggest drop-off:</b> Ch. {retLabels[worst]} (−{drops[worst].toFixed(1)} pts). Try a stronger cliffhanger at the end of Ch. {retLabels[Math.max(0, worst - 1)]}.</>
            )}
          </div>
          <div className="mt-4"><div className="label mb-1">Reaction mix</div><div className="flex h-7 overflow-hidden rounded-md border-2 border-line">{mix.map((m, i) => <div key={m.kind} className="grid place-items-center text-xs" title={`${m.kind} ${Math.round(m.value * 100)}%`} style={{ width: `${m.value * 100}%`, background: AGE_COL[i % 5], opacity: 0.9 }}>{ECHO_EMOJI[m.kind as EchoKind]}</div>)}</div></div>
        </div>

        <div className="panel p-4">
          <div className="flex items-start justify-between gap-3"><div><h3 className="h-display text-lg">Release Oracle</h3><p className="text-xs text-muted">When do your readers read? Click any slot to forecast a release.</p></div><span className="chip chip-on">simulated</span></div>
          <div className="mt-3 overflow-x-auto">
            <div className="min-w-[440px]">
              <div className="ml-9 grid grid-cols-24 gap-[2px]" style={{ gridTemplateColumns: "repeat(24, minmax(0,1fr))" }}>{Array.from({ length: 24 }, (_, h) => <span key={h} className="text-center font-mono text-[0.5rem] text-muted">{h % 3 === 0 ? h : ""}</span>)}</div>
              {hm.map((row, d) => (
                <div key={d} className="mt-[2px] flex items-center gap-1">
                  <span className="w-8 font-mono text-[0.62rem] text-muted">{DAYS[d]}</span>
                  <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: "repeat(24, minmax(0,1fr))" }}>
                    {row.map((v, h) => <button key={h} onClick={() => setSlot({ d, h })} aria-label={`${DAYS[d]} ${h}:00`} aria-pressed={slot.d === d && slot.h === h} title={`${DAYS[d]} ${h}:00`} className={cx("aspect-square rounded-[3px] border", slot.d === d && slot.h === h ? "border-line ring-2 ring-accent" : "border-transparent")} style={{ background: "var(--accent)", opacity: 0.08 + v * 0.92 }} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-md border-2 border-line bg-card p-3">
            <div className="label">Forecast · {DAYS[slot.d]} {String(slot.h).padStart(2, "0")}:00</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3"><span className="h-display text-3xl">{fmtNum(proj)}</span><span className="text-sm text-muted">first-24h readers</span><span className={cx("chip", vsAvg >= 0 ? "!border-line !bg-mint !text-[#15120f]" : "!border-line !bg-accent !text-white")}>{vsAvg >= 0 ? "+" : ""}{vsAvg}% vs average slot</span></div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn btn-sm btn-ghost" onClick={() => setSlot({ d: best.d, h: best.h })}><Icon name="wand" size={13} /> Jump to best slot ({DAYS[best.d]} {best.h}:00)</button>
              <button className="btn btn-sm" onClick={applySlot}><Icon name="calendar" size={13} /> Schedule next chapter here</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
