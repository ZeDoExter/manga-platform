"use client";

import { useEffect, useRef } from "react";
import type { Mood } from "@/lib/types";

type Kind = "dot" | "line" | "petal" | "bubble" | "ember" | "snow";
interface Cfg {
  n: number;
  kind: Kind;
  color: string;
  vy: [number, number];
  vx: [number, number];
  size: [number, number];
  tint: string;
  vignette?: number;
  scan?: boolean;
  flicker?: boolean;
}

const CFG: Record<Mood, Cfg> = {
  dread: { n: 26, kind: "dot", color: "200,200,210", vy: [-0.05, 0.1], vx: [-0.05, 0.05], size: [0.6, 1.8], tint: "rgba(20,0,10,.28)", vignette: 0.75, flicker: true },
  rain: { n: 120, kind: "line", color: "190,215,235", vy: [9, 14], vx: [-1.8, -1.2], size: [8, 18], tint: "rgba(10,30,40,.22)", vignette: 0.45 },
  neon: { n: 44, kind: "dot", color: "0,229,199", vy: [-0.2, 0.3], vx: [-0.15, 0.15], size: [0.8, 2.4], tint: "rgba(255,46,136,.07)", scan: true, vignette: 0.35 },
  ember: { n: 60, kind: "ember", color: "255,140,60", vy: [-1.6, -0.5], vx: [-0.5, 0.6], size: [0.8, 2.6], tint: "rgba(80,20,0,.18)", vignette: 0.5 },
  petal: { n: 34, kind: "petal", color: "255,170,185", vy: [0.5, 1.3], vx: [0.2, 1], size: [4, 8], tint: "rgba(255,150,170,.05)" },
  calm: { n: 28, kind: "dot", color: "255,235,200", vy: [-0.18, 0.05], vx: [-0.1, 0.12], size: [0.8, 2], tint: "rgba(255,220,170,.04)" },
  stars: { n: 70, kind: "dot", color: "255,245,210", vy: [0.02, 0.1], vx: [-0.03, 0.03], size: [0.5, 1.8], tint: "rgba(10,10,60,.2)", vignette: 0.4 },
  tide: { n: 36, kind: "bubble", color: "170,235,245", vy: [-0.9, -0.3], vx: [-0.2, 0.2], size: [2, 6], tint: "rgba(0,70,90,.14)", vignette: 0.3 },
  snow: { n: 90, kind: "snow", color: "245,250,255", vy: [0.5, 1.4], vx: [-0.3, 0.4], size: [1, 3.2], tint: "rgba(120,160,220,.07)" },
};

interface Pt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  p: number;
}

export function AtmosLayer({ mood, strength = 1, className }: { mood: Mood; strength?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cfg = CFG[mood];
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
  const ro = new ResizeObserver(() => {
    resize();
    if (reduce) requestAnimationFrame(draw);
  });
    ro.observe(cv);
    const R = (a: number, b: number) => a + Math.random() * (b - a);
    const pts: Pt[] = Array.from({ length: Math.round(cfg.n * strength) }, () => ({ x: Math.random() * (w || 800), y: Math.random() * (h || 600), vx: R(cfg.vx[0], cfg.vx[1]), vy: R(cfg.vy[0], cfg.vy[1]), s: R(cfg.size[0], cfg.size[1]), p: Math.random() * 6.28 }));
    let raf = 0;
    let running = false;
    let visible = true;
    let t = 0;
    const draw = () => {
      if (!running) return;
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        if (!reduce) {
          p.x += p.vx + (cfg.kind === "petal" || cfg.kind === "snow" ? Math.sin(t + p.p) * 0.4 : 0);
          p.y += p.vy;
        }
        if (p.y > h + 20) p.y = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.x < -20) p.x = w + 20;
        const tw = cfg.kind === "dot" ? 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + p.p)) : 0.85;
        ctx.fillStyle = `rgba(${cfg.color},${0.75 * tw})`;
        ctx.strokeStyle = `rgba(${cfg.color},0.45)`;
        if (cfg.kind === "line") {
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 1.4, p.y - p.s * 0.9);
          ctx.stroke();
        } else if (cfg.kind === "petal") {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(t * 0.8 + p.p);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 6.28);
          ctx.fill();
          ctx.restore();
        } else if (cfg.kind === "bubble") {
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, 6.28);
          ctx.stroke();
        } else if (cfg.kind === "ember") {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 4);
          g.addColorStop(0, `rgba(${cfg.color},.9)`);
          g.addColorStop(1, `rgba(${cfg.color},0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s * 4, 0, 6.28);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, 6.28);
          ctx.fill();
        }
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    const syncRun = () => {
      const want = visible && document.visibilityState === "visible";
      if (want && !running) {
        running = true;
        raf = requestAnimationFrame(draw);
      } else if (!want && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e?.isIntersecting ?? true;
        syncRun();
      },
      { threshold: 0.01 },
    );
    io.observe(cv);
    document.addEventListener("visibilitychange", syncRun);
    syncRun();
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", syncRun);
    };
  }, [cfg, strength]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden="true">
      <div className="absolute inset-0" style={{ background: cfg.tint }} />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      {cfg.vignette && <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${cfg.vignette}) 100%)` }} />}
      {cfg.scan && <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,.5) 0 1px, transparent 1px 3px)" }} />}
      {cfg.flicker && <div className="anim-flicker absolute inset-0 bg-white/20 mix-blend-overlay" />}
    </div>
  );
}
