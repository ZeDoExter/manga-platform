"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TOP10 } from "@/data/stories";
import type { Story } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/types";
import { cx, fmtNum } from "@/lib/util";
import { useApp } from "@/lib/store";
import { Cover } from "./Cover";
import { Icon, Stars, TypeBadge } from "./ui";

const SK = 28;

function Delta({ d }: { d: Story["delta"] }) {
  if (d === "new") return <span className="chip !border-hl !bg-hl !text-[#15120f]">New entry</span>;
  if (!d) return <span className="chip !border-white/50 !bg-white/10 !text-white">— steady</span>;
  return <span className={cx("chip !text-[#15120f]", d > 0 ? "!border-mint !bg-mint" : "!border-accent !bg-accent !text-white")}>{d > 0 ? "▲" : "▼"} {Math.abs(d)} this week</span>;
}

function Heat({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Popularity ${Math.round(value * 100)} out of 100`}>
      <Icon name="flame" size={14} className="text-accent" />
      <div className="h-2 w-32 overflow-hidden rounded-full border border-white/50 bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-hl to-accent" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

export function Top10() {
  const [active, setActive] = useState(0);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { me, act } = useApp();

  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  const onEnter = (i: number) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setActive(i), 35);
  };

  return (
    <div id="top10" aria-label="Top 10 titles this week">
      {/* desktop: expanding panel strip */}
      <ol className="hidden h-[600px] list-none md:flex" onMouseLeave={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }}>
        {TOP10.map((s, i) => {
          const on = i === active;
          const rank = s.rank ?? i + 1;
          const poly = i === 0 ? `polygon(0 0,100% 0,calc(100% - ${SK}px) 100%,0 100%)` : i === TOP10.length - 1 ? `polygon(${SK}px 0,100% 0,100% 100%,0 100%)` : `polygon(${SK}px 0,100% 0,calc(100% - ${SK}px) 100%,0 100%)`;
          const saved = me.library.includes(s.id);
          return (
            <li
              key={s.id}
              className="relative min-w-0 overflow-hidden will-change-[flex]"
              style={{ flex: on ? 9 : 1, marginLeft: i ? -(SK - 4) : 0, clipPath: poly, transition: "flex .48s cubic-bezier(.2,.8,.2,1)", zIndex: on ? 5 : 1 }}
              onMouseEnter={() => onEnter(i)}
            >
              <button className="absolute inset-0 z-20 h-full w-full cursor-pointer text-left" onFocus={() => setActive(i)} onClick={() => setActive(i)} aria-expanded={on} aria-label={`#${rank} ${s.title}${on ? "" : " — expand"}`} tabIndex={on ? -1 : 0} />
              <Cover story={s} compact className="!absolute inset-0 !aspect-auto h-full w-full" />
              <div className={cx("absolute inset-0 transition-all duration-500", on ? "bg-gradient-to-r from-black/90 via-black/55 to-black/5" : "bg-gradient-to-t from-black/85 via-black/30 to-black/50")} />
              <div className="absolute inset-0 border-y-2 border-line" />

              {/* collapsed label */}
              <div className={cx("pointer-events-none absolute inset-0 flex flex-col items-center justify-between py-5 text-white transition-opacity duration-300", on ? "opacity-0" : "opacity-100")}>
                <span className="vtext rotate-180 text-sm font-extrabold uppercase tracking-wider [text-shadow:0_1px_6px_#000]">{s.title.length > 26 ? s.title.slice(0, 24) + "…" : s.title}</span>
                <span className="h-display text-4xl [text-shadow:0_2px_0_#000]" style={{ WebkitTextStroke: "1.5px #fff", color: "transparent" }}>{rank}</span>
              </div>

              {/* expanded content */}
              <div className={cx("absolute inset-0 flex items-end gap-6 overflow-hidden px-[52px] pb-8 pt-8 text-white transition-opacity", on ? "opacity-100 delay-300 duration-500" : "pointer-events-none opacity-0 duration-150")} aria-hidden={!on} inert={!on}>
                <span className="h-display pointer-events-none absolute -bottom-10 right-2 select-none text-[18rem] leading-none opacity-30 xl:text-[22rem]" style={{ WebkitTextStroke: "3px #fff", color: "transparent" }}>{rank}</span>
                <div className="relative hidden w-[210px] shrink-0 xl:block">
                  <div className="-rotate-3 rounded-md border-2 border-white shadow-[8px_8px_0_rgba(0,0,0,.5)]">
                    <Cover story={s} className="rounded-[4px]" />
                  </div>
                </div>
                <div className="relative z-30 min-w-0 max-w-[27rem]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="h-display bg-accent px-3 py-1 text-2xl text-white [clip-path:polygon(0_0,100%_0,88%_100%,0_100%)]">#{rank}</span>
                    <TypeBadge type={s.type} />
                    <Delta d={s.delta} />
                  </div>
                  <h3 className="h-display mt-3 text-3xl uppercase leading-[0.98] xl:text-[2.6rem]">{s.title}</h3>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                    <span className="flex items-center gap-1.5"><Stars value={s.rating} size={14} /> <b>{s.rating.toFixed(1)}</b></span>
                    <span className="flex items-center gap-1.5 font-semibold"><Icon name="eye" size={14} /> {fmtNum(s.weekly * 1000)} weekly</span>
                    <Heat value={s.weekly / 3120} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.genres.map((g) => <span key={g} className="chip !border-white/60 !bg-white/10 !text-white">{g}</span>)}
                  </div>
                  <p className="mt-3 font-mono text-xs text-white/75">LATEST · Ch. {s.chapters} — “{s.latest}”</p>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/85">{s.synopsis}</p>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <Link href={`/story/${s.id}`} className="btn btn-accent">Open details <Icon name="arrow" size={15} /></Link>
                    <Link href={`/read/${s.id}/1`} className="btn !border-white !bg-white !text-[#15120f]"><Icon name="play" size={14} fill /> Read</Link>
                    <button className="btn btn-ghost !border-white/80 !bg-transparent !text-white !shadow-none" onClick={() => act.toggleLibrary(s.id)} aria-pressed={saved}>
                      <Icon name={saved ? "check" : "bookmark"} size={14} /> {saved ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* mobile: snap carousel */}
      <ol className="scroll-x -mx-4 flex snap-x list-none gap-4 px-4 pb-4 md:hidden">
        {TOP10.map((s) => (
          <li key={s.id} className="w-[60vw] max-w-[240px] shrink-0 snap-center">
            <Link href={`/story/${s.id}`} className="block" aria-label={`#${s.rank} ${s.title}`}>
              <div className="flex items-center gap-2.5">
                <span className="h-display bg-accent px-2.5 py-0.5 pr-4 text-2xl text-white [clip-path:polygon(0_0,100%_0,88%_100%,0_100%)]">#{s.rank}</span>
                <TypeBadge type={s.type} />
              </div>
              <div className="relative mt-2 rounded-md border-2 border-line shadow-[5px_5px_0_var(--shadow)]">
                <Cover story={s} compact className="rounded-[4px]" />
              </div>
              <div className="mt-2 line-clamp-1 text-sm font-extrabold">{s.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="flex items-center gap-1 font-mono text-xs font-bold"><Icon name="star" size={12} fill className="text-hl" /> {s.rating.toFixed(1)}</span>
                <span className="flex items-center gap-1 font-mono text-xs text-muted"><Icon name="flame" size={12} className="text-accent" /> {fmtNum(s.weekly * 1000)}</span>
              </div>
              <p className="mt-1 line-clamp-1 font-mono text-[0.68rem] text-muted">Ch. {s.chapters} · {s.latest}</p>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
