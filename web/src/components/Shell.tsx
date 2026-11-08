"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useApp } from "@/lib/store";
import { useEconomy } from "@/lib/economy-store";
import { DEMO_IDS, ACCOUNT_MAP } from "@/data/accounts";
import { useSession, signOut } from "@/lib/auth-client";
import { suggest } from "@/lib/search";
import { cx } from "@/lib/util";
import { TOP10 } from "@/data/stories";
import { Avatar, Icon } from "./ui";
import { Cover } from "./Cover";
import type { Story } from "@/lib/types";

const PUBLIC_LINKS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/discover", label: "Discover", icon: "compass" },
  { href: "/library", label: "Library", icon: "library" },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const immersive = path.startsWith("/read/");
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <>
      {!immersive && <TopNav path={path} onSearch={() => setPalette(true)} />}
      <main className={cx(!immersive && "min-h-[70vh] pb-24 md:pb-0")}>{children}</main>
      {!immersive && <Footer />}
      {!immersive && <BottomNav path={path} />}
      <Palette open={palette} onClose={() => setPalette(false)} />
    </>
  );
}

function TopNav({ path, onSearch }: { path: string; onSearch: () => void }) {
  const { account, state, act, me } = useApp();
  const { balance } = useEconomy();
  const { data: session } = useSession();
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setMenu(false);
    const k = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", h);
    window.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      window.removeEventListener("keydown", k);
    };
  }, [menu]);
  const night = state.theme === "night";
  const isCreator = account.role === "creator" || account.role === "admin";
  const isAdmin = account.role === "admin";
  const navLinks = [
    ...PUBLIC_LINKS,
    ...(isCreator ? [{ href: "/studio", label: "Studio", icon: "pen" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: "lock" }] : []),
  ];
  return (
    <header className="sticky top-0 z-[100] border-b-2 border-line bg-paper/90 backdrop-blur-md">
      <div className="wrap flex h-16 items-center gap-3">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="DOOTOON home">
          <span className="grid size-10 -rotate-3 place-items-center border-2 border-line bg-accent font-display text-xl text-white shadow-[3px_3px_0_var(--shadow)] transition-transform group-hover:rotate-0" style={{ fontFamily: "var(--font-thai)" }}>ด</span>
          <span className="hidden leading-none sm:block">
            <span className="h-display block text-[1.35rem]">DOOTOON</span>
            <span className="label block !text-[0.55rem] !tracking-[0.3em]" style={{ fontFamily: "var(--font-thai)" }}>ดูตูน</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 xl:flex" aria-label="Primary">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className={cx("rounded-md border-2 px-3 py-1.5 text-sm font-bold transition-all", isActive(path, l.href) ? "border-line bg-ink text-paper shadow-[2px_2px_0_var(--accent)]" : "border-transparent hover:border-line hover:bg-card")}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-1 md:block" />

        <button onClick={onSearch} className="panel-flat flex h-10 min-w-0 flex-1 items-center gap-2 px-3 text-left text-sm text-muted transition-shadow hover:shadow-[3px_3px_0_var(--shadow)] md:max-w-40 lg:max-w-xs lg:basis-72" aria-label="Search stories, creators, genres">
          <Icon name="search" size={16} />
          <span className="flex-1 truncate">Search stories, creators…</span>
          <kbd className="hidden rounded border border-line/40 px-1.5 font-mono text-[0.65rem] md:block">⌘K</kbd>
        </button>

        <Link href="/wallet" className="panel-flat hidden h-10 items-center gap-2 px-2.5 transition-shadow hover:shadow-[3px_3px_0_var(--shadow)] sm:flex" aria-label={`Wallet, ${balance} coins`}>
          <span className="grid size-6 place-items-center rounded-full border-2 border-line bg-hl text-[#15120f]"><Icon name="coin" size={13} /></span>
          <span className="font-mono text-xs font-extrabold tabular-nums">{balance.toLocaleString()}</span>
        </Link>

        <button className="btn btn-ghost btn-icon !p-2.5" onClick={() => act.setTheme(night ? "paper" : "night")} aria-label={night ? "Switch to paper theme" : "Switch to night theme"} title={night ? "Paper edition" : "Night edition"}>
          <Icon name={night ? "sun" : "moon"} size={18} />
        </button>

        <div className="relative" ref={ref}>
          <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-full border-2 border-line bg-card py-0.5 pl-0.5 pr-2 shadow-[2px_2px_0_var(--shadow)] md:pr-3" aria-expanded={menu} aria-haspopup="menu" aria-label="Account menu">
            <Avatar account={account} style={me.profile.avatar} size={34} />
            <span className="hidden text-left leading-tight md:block">
              <span className="block text-xs font-extrabold">{account.name.split(" ")[0]}</span>
              <span className={cx("block font-mono text-[0.58rem] font-bold uppercase tracking-wider", isAdmin ? "text-hl" : isCreator ? "text-accent" : "text-accent2")}>{isAdmin ? "Admin" : isCreator ? "Uploader" : "Reader"}</span>
            </span>
            <Icon name="down" size={14} />
          </button>
          {menu && (
            <div role="menu" className="panel anim-pop absolute right-0 top-[calc(100%+10px)] z-[110] w-72 p-2">
              {session?.user ? (
                <div className="mb-2 rounded-md border-2 border-line bg-paper2 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-extrabold">{session.user.name}</span>
                    <span className="chip chip-on !text-[0.55rem]">Signed in</span>
                  </div>
                  <div className="truncate font-mono text-[0.65rem] text-muted">{session.user.email}</div>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      act.switchAccount("mika");
                      setMenu(false);
                    }}
                    className="btn btn-sm mt-2 w-full justify-center"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenu(false)}
                  className="btn btn-accent mb-2 flex w-full items-center justify-center gap-2 !py-2 text-xs font-extrabold"
                >
                  <Icon name="user" size={14} /> Sign in / Google
                </Link>
              )}
              <Link href="/wallet" onClick={() => setMenu(false)} role="menuitem" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-bold hover:bg-paper2">
                <Icon name="coin" size={16} /> Wallet <span className="ml-auto font-mono text-xs font-extrabold">{balance.toLocaleString()}</span>
              </Link>
              <Link href="/profile" onClick={() => setMenu(false)} role="menuitem" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-bold hover:bg-paper2">
                <Icon name="user" size={16} /> My profile
              </Link>
              {isCreator && (
                <Link href="/studio" onClick={() => setMenu(false)} role="menuitem" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-bold hover:bg-paper2">
                  <Icon name="pen" size={16} /> Creator Studio
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" onClick={() => setMenu(false)} role="menuitem" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-bold text-accent hover:bg-paper2">
                  <Icon name="lock" size={16} /> Admin Dashboard
                </Link>
              )}
              <details className="mt-2 border-t-2 border-dashed border-line/30 pt-2">
                <summary className="label cursor-pointer px-2 py-1 select-none">Switch role (Reader / Creator / Admin)</summary>
                <div className="mt-1 space-y-1">
                  {DEMO_IDS.map((id) => {
                    const a = ACCOUNT_MAP[id];
                    const on = id === account.id;
                    return (
                      <button key={id} role="menuitem" onClick={() => { act.switchAccount(id); setMenu(false); }} className={cx("flex w-full items-center gap-2.5 rounded-md border-2 p-1.5 text-left transition-colors", on ? "border-line bg-paper2" : "border-transparent hover:border-line hover:bg-paper2")}>
                        <Avatar account={a} style={state.data[id]?.profile.avatar} size={28} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-extrabold">{a.name}</span>
                          <span className="block truncate text-[0.65rem] text-muted">{a.role === "admin" ? "Admin · KPI & Moderation" : a.role === "creator" ? "Uploader · Creator Studio" : "Reader · Library"}</span>
                        </span>
                        {on ? <Icon name="check" size={14} className="text-accent" /> : <span className={cx("chip !text-[0.52rem]", a.role !== "reader" && "chip-on")}>{a.role === "admin" ? "ADM" : a.role === "creator" ? "UP" : "RD"}</span>}
                      </button>
                    );
                  })}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function BottomNav({ path }: { path: string }) {
  const { account } = useApp();
  const creator = account.role === "creator" || account.role === "admin";
  const items = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/discover", label: "Discover", icon: "compass" },
    { href: "/library", label: "Library", icon: "library" },
    account.role === "admin"
      ? { href: "/admin", label: "Admin", icon: "lock" }
      : creator
        ? { href: "/studio", label: "Studio", icon: "pen" }
        : { href: "/profile", label: "Me", icon: "user" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[100] grid grid-cols-4 border-t-2 border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" aria-label="Mobile">
      {items.map((l) => {
        const on = isActive(path, l.href);
        return (
          <Link key={l.href} href={l.href} className={cx("flex flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-bold", on ? "text-accent" : "text-ink")} aria-current={on ? "page" : undefined}>
            <span className={cx("grid h-7 w-10 place-items-center rounded-md border-2 transition-all", on ? "border-line bg-ink text-paper" : "border-transparent")}>
              <Icon name={l.icon} size={17} />
            </span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t-2 border-line bg-ink pb-28 pt-14 text-paper lg:pb-14">
      <div className="tone-lg absolute inset-0 opacity-30" style={{ ["--tone" as string]: "rgba(255,255,255,.12)" }} />
      <div className="wrap relative grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="h-display text-6xl text-accent md:text-8xl">DOOTOON</div>
          <p className="mt-3 max-w-sm text-sm text-paper/70">
            DOOTOON is a next-generation reading platform for manga, manhwa, and light novels — supporting creators directly through instant chapter unlocks and transparent revenue splits.
          </p>
        </div>
        {[
          ["Read", [["Discover", "/discover"], ["Top 10", "/#top10"], ["Library", "/library"]]],
          ["Create", [["Creator Studio", "/studio"], ["New story", "/studio/new"], ["Uploader profile", "/u/ren-akitsuki"]]],
          ["Features", [["Living Reading Room", "/read/hollow-moon-courier/1"], ["Taste Lab", "/#taste"]]],
        ].map(([h, ls]) => (
          <div key={h as string}>
            <div className="label !text-paper/50">{h as string}</div>
            <ul className="mt-3 space-y-2 text-sm font-semibold">
              {(ls as string[][]).map(([l, href]) => (
                <li key={l}>
                  <Link href={href} className="hover:text-accent">{l}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="wrap relative mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-paper/20 pt-5 font-mono text-[0.7rem] text-paper/50">
        <span>© 2026 DOOTOON · All rights reserved.</span>
        <span>Press ⌘K / “/” to search anywhere</span>
      </div>
    </footer>
  );
}

interface PItem {
  id: string;
  label: string;
  sub?: string;
  icon: string;
  run: () => void;
  story?: Story;
}

function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { catalog, act, state, account } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo<PItem[]>(() => {
    const go = (href: string) => () => router.push(href);
    if (q.trim()) {
      const s = suggest(q, catalog, 9).map<PItem>((x) => ({ id: x.kind + x.id, label: x.label, sub: x.sub, icon: x.kind === "story" ? "book" : x.kind === "creator" ? "user" : "sparkles", run: go(x.href), story: x.story }));
      if (!s.length) return [{ id: "none", label: `Search Discover for “${q}”`, sub: "No quick matches — try the full search", icon: "search", run: go(`/discover?q=${encodeURIComponent(q)}`) }];
      return s;
    }
    const pages: PItem[] = [
      { id: "p-home", label: "Home", sub: "Go to", icon: "home", run: go("/") },
      { id: "p-disc", label: "Discover", sub: "Advanced search & filters", icon: "compass", run: go("/discover") },
      { id: "p-lib", label: "Smart Library", sub: "Collections, bookmarks, history", icon: "library", run: go("/library") },
      ...(account.role === "creator" || account.role === "admin" ? [{ id: "p-stu", label: "Creator Studio", sub: "Publish & manage stories", icon: "pen", run: go("/studio") }] : []),
      ...(account.role === "admin" ? [{ id: "p-adm", label: "Admin Dashboard", sub: "KPIs, revenue & moderation", icon: "lock", run: go("/admin") }] : []),
      { id: "p-me", label: "My profile", sub: account.role === "creator" ? "Uploader profile" : "Reader profile", icon: "user", run: go("/profile") },
    ];
    const actions: PItem[] = [
      { id: "a-theme", label: state.theme === "night" ? "Switch to Paper edition" : "Switch to Night edition", sub: "Toggle theme", icon: state.theme === "night" ? "sun" : "moon", run: () => act.setTheme(state.theme === "night" ? "paper" : "night") },
      ...DEMO_IDS.filter((id) => id !== account.id).map<PItem>((id) => ({ id: "sw-" + id, label: `Switch to ${ACCOUNT_MAP[id].name}`, sub: ACCOUNT_MAP[id].role === "creator" ? "Uploader demo account" : "Reader demo account", icon: "shuffle", run: () => act.switchAccount(id) })),
    ];
    const tops = TOP10.slice(0, 3).map<PItem>((s) => ({ id: "t-" + s.id, label: s.title, sub: `Top 10 · #${s.rank}`, icon: "flame", run: go(`/story/${s.id}`), story: s }));
    return [...pages, ...actions, ...tops];
  }, [q, catalog, router, state.theme, act, account]);

  if (!open) return null;
  const run = (i: number) => {
    items[i]?.run();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[260] flex items-start justify-center p-4 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="panel anim-pop relative w-full max-w-xl overflow-hidden">
        <div className="flex items-center gap-3 border-b-2 border-line px-4">
          <Icon name="search" size={18} />
          <input
            ref={input}
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              else if (e.key === "Enter") run(idx);
              else if (e.key === "Escape") onClose();
            }}
            placeholder="Search stories, creators, genres… or jump anywhere"
            className="h-14 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-muted"
            aria-label="Search"
          />
          <kbd className="rounded border border-line/40 px-1.5 font-mono text-[0.65rem]">ESC</kbd>
        </div>
        <ul className="scroll-y max-h-[56vh] p-2">
          {!q.trim() && <li className="label px-2 py-1">Quick jump</li>}
          {items.map((it, i) => (
            <li key={it.id}>
              <button onMouseEnter={() => setIdx(i)} onClick={() => run(i)} className={cx("flex w-full items-center gap-3 rounded-md border-2 px-2 py-2 text-left", i === idx ? "border-line bg-paper2" : "border-transparent")}>
                {it.story ? <Cover story={it.story} compact className="w-8 shrink-0 rounded border border-line" /> : <span className="grid size-8 shrink-0 place-items-center rounded border-2 border-line bg-card"><Icon name={it.icon} size={15} /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold">{it.label}</span>
                  {it.sub && <span className="block truncate text-xs text-muted">{it.sub}</span>}
                </span>
                {i === idx && <span className="font-mono text-[0.65rem] text-muted">↵</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
