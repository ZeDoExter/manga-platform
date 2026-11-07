"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { STORY_MAP, CREATOR_MAP } from "@/data/stories";
import { TYPE_LABEL } from "@/lib/types";
import { cx, fmtNum } from "@/lib/util";
import { useApp } from "@/lib/store";
import { Cover } from "./Cover";
import { Icon, Stars } from "./ui";

const FEATURED = ["hollow-moon-courier", "ashfall-regalia", "the-ninth-bell", "neon-ronin-protocol", "lighthouse-at-the-end-of-every-door"].map((id) => STORY_MAP[id]);

export function Hero() {
  const { me, act } = useApp();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const s = FEATURED[i];
  const n = FEATURED.length;
  const saved = me.library.includes(s.id);
  const prog = me.progress[s.id];

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setI((x) => (x + 1) % n), 8000);
    return () => clearTimeout(t);
  }, [i, paused, n]);

  return (
    <section className="wrap pt-5 md:pt-8" aria-roledescription="carousel" aria-label="Featured stories">
      <div
        className="panel relative isolate overflow-hidden !rounded-xl text-white"
        style={{ background: s.palette[0], transition: "background .8s" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* backdrop */}
        <div key={s.id} className="absolute inset-0 -z-10 anim-fade-up" style={{ animationDuration: "1s" }}>
          {s.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.cover} alt="" decoding="async" onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-full w-full scale-125 transform-gpu object-cover opacity-45 blur-2xl" />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(100deg, ${s.palette[0]} 8%, ${s.palette[0]}cc 45%, transparent 100%)` }} />
          <div className="tone-lg absolute inset-0 opacity-50 [mask-image:linear-gradient(90deg,transparent,#000_70%)]" style={{ ["--tone" as string]: "rgba(255,255,255,.14)" }} />
        </div>
        <div className="pointer-events-none absolute -right-24 top-0 h-full w-48 -skew-x-12 bg-accent/90 mix-blend-multiply" />

        <div className="grid items-center gap-4 px-5 py-6 md:gap-6 md:px-10 md:py-12 lg:grid-cols-[1.25fr_1fr] lg:py-14">
          <div key={s.id + "t"} className="anim-fade-up relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip !border-white/70 !bg-white/10 !text-white">Featured {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
              <span className="chip !border-white/70 !bg-white/10 !text-white">{TYPE_LABEL[s.type]}</span>
              {s.rank && <span className="chip !border-hl !bg-hl !text-[#15120f]">Top 10 · #{s.rank}</span>}
            </div>
            <h1 className="h-display mt-4 text-[clamp(1.9rem,9vw,2.6rem)] [overflow-wrap:anywhere] uppercase [text-shadow:4px_4px_0_rgba(0,0,0,.35)] md:mt-5 md:text-[clamp(2.3rem,6vw,5rem)]">{s.title}</h1>
            <p className="mt-2 hidden font-display text-lg tracking-[0.25em] text-white/60 sm:block">{s.alt.length < 16 ? s.alt : ""}</p>
            <p className="mt-3 max-w-xl font-serif text-lg italic text-white/90 md:mt-4 md:text-2xl">“{s.tagline}”</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5"><Stars value={s.rating} size={15} /> <b>{s.rating.toFixed(1)}</b> <span className="text-white/60">({fmtNum(s.votes)})</span></span>
              <span className="text-white/70">by <Link href={`/u/${s.creator}`} className="font-bold text-white underline decoration-accent decoration-2 underline-offset-4">{CREATOR_MAP[s.creator]?.name}</Link></span>
              <span className="hidden text-white/70 sm:inline">{s.genres.join(" · ")}</span>
            </div>
            <p className="mt-4 hidden max-w-xl text-[0.95rem] leading-relaxed text-white/80 md:line-clamp-3">{s.synopsis}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/read/${s.id}/${prog?.chapter ?? 1}`} className="btn btn-accent !px-5 !py-3">
                <Icon name="play" size={15} fill /> {prog ? `Continue Ch. ${prog.chapter}` : "Read Chapter 1"}
              </Link>
              <button className="btn btn-ghost hidden !border-white/80 !bg-transparent !text-white !shadow-none md:inline-flex" onClick={() => act.toggleLibrary(s.id)} aria-pressed={saved}>
                <Icon name={saved ? "check" : "plus"} size={15} /> {saved ? "In library" : "Library"}
              </button>
              <Link href={`/story/${s.id}`} className="btn btn-ghost !border-white/80 !bg-transparent !text-white !shadow-none">
                Details <Icon name="arrow" size={15} />
              </Link>
            </div>
          </div>

          {/* cover fan */}
          <div className="relative mx-auto mt-2 h-[240px] w-full max-w-[340px] sm:h-[420px] sm:max-w-[460px] lg:mt-4 lg:h-[470px]" role="group" aria-label="Pick a featured story">
            {FEATURED.map((f, idx) => {
              const rel = (idx - i + n) % n;
              const pos = rel === 0 ? 0 : rel === 1 ? 1 : rel === 2 ? 2 : rel === n - 1 ? -1 : 9;
              const T: Record<number, string> = {
                0: "translate(0,0) rotate(0deg) scale(1)",
                1: "translate(46%,5%) rotate(7deg) scale(.8)",
                2: "translate(82%,10%) rotate(13deg) scale(.62)",
                "-1": "translate(-46%,5%) rotate(-7deg) scale(.8)",
                9: "translate(0,20%) scale(.5)",
              };
              return (
                <button
                  key={f.id}
                  onClick={() => setI(idx)}
                  className="absolute left-1/2 top-1/2 w-[46%] max-w-[230px] transition-all duration-700 [transition-timing-function:cubic-bezier(.2,.8,.2,1)]"
                  style={{ transform: `translate(-50%,-50%) ${T[pos]}`, zIndex: pos === 0 ? 30 : 20 - Math.abs(pos), opacity: pos === 9 ? 0 : 1, pointerEvents: pos === 9 ? "none" : "auto" }}
                  aria-label={`Show ${f.title}`}
                  tabIndex={pos === 9 ? -1 : 0}
                >
                  <div className={cx("rounded-md border-2 border-white/90 shadow-[8px_10px_0_rgba(0,0,0,.45)]", rel === 0 && "anim-float")}>
                    <Cover story={f} className="rounded-[4px]" priority={idx === 0} />
                  </div>
                </button>
              );
            })}
            <div className="absolute -bottom-1 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2">
              {FEATURED.map((f, idx) => (
                <button key={f.id} aria-label={`Go to ${f.title}`} onClick={() => setI(idx)} className="relative h-2 overflow-hidden rounded-full bg-white/30 transition-all" style={{ width: idx === i ? 36 : 12 }}>
                  {idx === i && !paused && <span key={i} className="absolute inset-y-0 left-0 bg-white" style={{ animation: "heroBar 8s linear forwards" }} />}
                  {idx === i && paused && <span className="absolute inset-0 bg-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes heroBar{from{width:0}to{width:100%}}`}</style>
    </section>
  );
}
