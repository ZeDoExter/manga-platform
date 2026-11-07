"use client";

import { useState } from "react";
import type { StoryDetail } from "@/lib/types";
import { cx } from "@/lib/util";
import { Icon } from "./ui";

const KIND_COLOR: Record<string, string> = { ally: "#12b58b", rival: "#ff4a22", family: "#ffd43b", love: "#ff6fb1", mentor: "#4f6bff", secret: "#9b6bff" };

export function CharacterWeb({ detail, maxCh, initial }: { detail: StoryDetail; maxCh: number; initial: number }) {
  const [ch, setCh] = useState(Math.max(1, Math.min(maxCh, initial)));
  const [sel, setSel] = useState<string>(detail.characters[0].id);
  const chars = detail.characters;
  const pos = (i: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / chars.length;
    return [180 + Math.cos(a) * 118, 160 + Math.sin(a) * 104] as const;
  };
  const idx = (id: string) => chars.findIndex((c) => c.id === id);
  const visible = (c: (typeof chars)[number]) => c.firstCh <= ch;
  const me = chars.find((c) => c.id === sel) ?? chars[0];
  const rels = detail.relations.filter((r) => r.a === me.id || r.b === me.id);
  const events = detail.timeline.filter((e) => e.who.includes(me.id));
  const hiddenCount = detail.timeline.filter((e) => e.ch > ch).length;

  return (
    <div>
      <div className="panel-flat tone mb-5 flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full border-2 border-line bg-hl text-[#15120f]"><Icon name="lock" size={16} /></span>
          <div>
            <div className="text-sm font-extrabold">Spoiler shield</div>
            <div className="text-xs text-muted">Only what you’d know by chapter <b className="text-ink">{ch}</b></div>
          </div>
        </div>
        <input type="range" min={1} max={maxCh} value={ch} onChange={(e) => setCh(+e.target.value)} className="min-w-[160px] flex-1" aria-label="Chapters read" />
        <span className="chip chip-on">Ch. {ch} / {maxCh}</span>
        {hiddenCount > 0 && <span className="chip">{hiddenCount} events hidden</span>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="panel relative overflow-hidden p-2">
          <svg viewBox="0 0 360 320" className="w-full" role="group" aria-label="Character relationship web">
            {detail.relations.map((r, i) => {
              const a = idx(r.a);
              const b = idx(r.b);
              const show = r.since <= ch && visible(chars[a]) && visible(chars[b]);
              if (!show) return null;
              const [x1, y1] = pos(a);
              const [x2, y2] = pos(b);
              const on = r.a === me.id || r.b === me.id;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={KIND_COLOR[r.kind]} strokeWidth={on ? 4 : 2} strokeDasharray={r.kind === "secret" ? "6 5" : ""} opacity={on ? 1 : 0.4} />;
            })}
            {chars.map((c, i) => {
              const [x, y] = pos(i);
              const vis = visible(c);
              const on = c.id === me.id;
              return (
                <g key={c.id} transform={`translate(${x} ${y})`} onClick={() => vis && setSel(c.id)} style={{ cursor: vis ? "pointer" : "not-allowed" }} tabIndex={vis ? 0 : -1} role="button" aria-label={vis ? c.name : "Hidden character"} onKeyDown={(e) => e.key === "Enter" && vis && setSel(c.id)}>
                  {on && <circle r="36" fill="none" stroke="var(--accent)" strokeWidth="3" strokeDasharray="5 4" className="anim-spin-slow" />}
                  <circle r="28" fill={vis ? c.color : "var(--paper2)"} stroke="var(--line)" strokeWidth="2.5" opacity={vis ? 1 : 0.7} />
                  <text textAnchor="middle" dy="7" fontSize="22" fontWeight="800" fill={vis ? "#15120f" : "var(--muted)"} style={{ fontFamily: "var(--font-display)" }}>{vis ? c.name[0] : "?"}</text>
                  <text textAnchor="middle" y="46" fontSize="10.5" fontWeight="800" fill="var(--ink)">{vis ? c.name.split(" ").slice(-1)[0].replace(/[“”]/g, "") : "???"}</text>
                </g>
              );
            })}
          </svg>
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 pb-2">
            {Object.entries(KIND_COLOR).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1.5 font-mono text-[0.62rem] uppercase"><span className="h-1 w-4 rounded" style={{ background: c }} />{k}</span>
            ))}
          </div>
        </div>

        <div className="panel p-5" key={me.id}>
          <div className="anim-fade-up">
            <div className="flex items-center gap-3">
              <span className="grid size-14 place-items-center rounded-full border-2 border-line font-display text-2xl text-[#15120f]" style={{ background: me.color }}>{me.name[0]}</span>
              <div>
                <h3 className="h-display text-xl">{me.name}</h3>
                <div className="font-mono text-[0.68rem] uppercase tracking-wider text-muted">{me.role} · {me.faction}</div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink2">{me.bio}</p>
            <div className="label mt-4">Relationships</div>
            <ul className="mt-2 space-y-1.5">
              {rels.map((r, i) => {
                const other = chars.find((c) => c.id === (r.a === me.id ? r.b : r.a))!;
                const open = r.since <= ch && visible(other);
                return (
                  <li key={i} className={cx("flex items-start gap-2 rounded-md border-2 border-line/30 p-2 text-sm", !open && "opacity-60")}>
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[r.kind] }} />
                    {open ? (
                      <span><b>{other.name}</b> <span className="font-mono text-[0.62rem] uppercase text-muted">· {r.kind}</span><br /><span className="text-xs text-ink2">{r.note}</span></span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-muted"><Icon name="lock" size={12} /> Revealed in chapter {r.since}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="label mt-4">Timeline</div>
            <ol className="mt-2 space-y-2 border-l-2 border-dashed border-line/40 pl-4">
              {events.map((e) => (
                <li key={e.ch} className="relative">
                  <span className={cx("absolute -left-[1.4rem] top-1 size-3 rounded-full border-2 border-line", e.ch <= ch ? "bg-accent" : "bg-paper2")} />
                  {e.ch <= ch ? (
                    <div className="text-sm"><span className="font-mono text-[0.65rem] font-bold text-accent">CH. {e.ch}</span> <b>{e.title}</b><div className="text-xs text-ink2">{e.text}</div></div>
                  ) : (
                    <div className="select-none text-sm text-muted blur-[3px]" aria-hidden="true">CH. {e.ch} Spoiler hidden until you read this chapter.</div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
