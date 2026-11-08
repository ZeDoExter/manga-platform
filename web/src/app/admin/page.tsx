"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { economyApi } from "@/lib/economy-client";
import { DEMO_ADMIN, banUser, fetchAuditLogs, takedownChapter, type AuditLog } from "@/lib/admin-api";
import { Empty, Icon, SectionHead } from "@/components/ui";
import { fmtNum } from "@/lib/util";

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-xs text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border-2 border-line bg-paper px-3 py-2 text-sm font-medium outline-none focus:bg-card"
      />
    </label>
  );
}

const DAILY_BASE = [420, 480, 455, 530, 610, 590, 675, 720, 695, 790, 840, 815, 910, 980];

export default function AdminPage() {
  const { toast, catalog, account, act } = useApp();
  const [chapterID, setChapterID] = useState("");
  const [takedownReason, setTakedownReason] = useState("");
  const [banTarget, setBanTarget] = useState("");
  const [banReason, setBanReason] = useState("");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [liveCreatorRevenue, setLiveCreatorRevenue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [audit, renEarnings, creator1Earnings] = await Promise.all([
        fetchAuditLogs().catch(() => [] as AuditLog[]),
        economyApi.creatorEarnings("ren-akitsuki").catch(() => ({ total_coins: 0, entries: [] })),
        economyApi.creatorEarnings("creator-1").catch(() => ({ total_coins: 0, entries: [] })),
      ]);
      setLogs(audit);
      setLiveCreatorRevenue((renEarnings.total_coins ?? 0) + (creator1Earnings.total_coins ?? 0));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load admin metrics", "warn");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const metrics = useMemo(() => {
    const totalStories = catalog.length;
    const totalChapters = catalog.reduce((acc, s) => acc + s.chapters, 0);
    const mangaCount = catalog.filter((s) => s.type === "manga" || s.type === "manhwa" || s.type === "manhua").length;
    const novelCount = totalStories - mangaCount;

    // Combine baseline platform volume with live commerce ledger earnings (70% creator share -> 100% GMV)
    const liveGMV = Math.round(liveCreatorRevenue / 0.7);
    const baseGMV = DAILY_BASE.reduce((a, b) => a + b, 0);
    const totalGMV = baseGMV + liveGMV;
    const platformTake = Math.round(totalGMV * 0.3);
    const creatorPayout = totalGMV - platformTake;

    const takedownCount = logs.filter((l) => l.action.toLowerCase().includes("takedown")).length;
    const banCount = logs.filter((l) => l.action.toLowerCase().includes("ban")).length;

    const series = DAILY_BASE.map((v, i) => (i === DAILY_BASE.length - 1 ? v + liveGMV : v));
    return {
      totalStories,
      totalChapters,
      mangaCount,
      novelCount,
      totalGMV,
      platformTake,
      creatorPayout,
      takedownCount,
      banCount,
      series,
    };
  }, [catalog, liveCreatorRevenue, logs]);

  const onTakedown = async () => {
    const id = chapterID.trim();
    const reason = takedownReason.trim();
    if (!id || !reason) {
      toast("Chapter ID and reason are required", "warn");
      return;
    }
    setBusy("takedown");
    try {
      await takedownChapter(DEMO_ADMIN, id, reason);
      toast(`Chapter ${id} taken down`, "ok");
      setChapterID("");
      setTakedownReason("");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Takedown failed", "warn");
    } finally {
      setBusy(null);
    }
  };

  const onBan = async () => {
    const id = banTarget.trim();
    const reason = banReason.trim();
    if (!id || !reason) {
      toast("User ID and reason are required", "warn");
      return;
    }
    setBusy("ban");
    try {
      await banUser(DEMO_ADMIN, id, reason);
      toast(`User ${id} banned`, "ok");
      setBanTarget("");
      setBanReason("");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ban failed", "warn");
    } finally {
      setBusy(null);
    }
  };

  if (account.role !== "admin") {
    return (
      <div className="wrap my-16 max-w-lg">
        <div className="panel p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-md border-2 border-line bg-hl text-[#15120f]">
            <Icon name="lock" size={22} />
          </span>
          <h1 className="h-display mt-4 text-2xl">Admin access required</h1>
          <p className="mt-2 text-sm text-muted">
            The Operations & Moderation Dashboard is restricted to platform administrators.
          </p>
          <button
            type="button"
            onClick={() => act.switchAccount("admin-1")}
            className="btn btn-accent mt-6 w-full justify-center"
          >
            Switch to System Admin role
          </button>
        </div>
      </div>
    );
  }

  // SVG chart geometry
  const W = 560;
  const H = 190;
  const PL = 36;
  const PR = 14;
  const PT = 16;
  const PB = 26;
  const maxVal = Math.max(...metrics.series, 1000);
  const pts = metrics.series.map((v, i) => {
    const x = PL + (i / (metrics.series.length - 1)) * (W - PL - PR);
    const y = PT + (1 - v / maxVal) * (H - PT - PB);
    return [x, y] as const;
  });
  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${H - PB} L${pts[0][0].toFixed(1)},${H - PB} Z`;

  const topStories = [...catalog].sort((a, b) => b.weekly - a.weekly).slice(0, 4);
  const maxWeekly = Math.max(...topStories.map((s) => s.weekly), 1);

  return (
    <div className="wrap py-8 md:py-12">
      <SectionHead
        kicker="Operations · Revenue & Trust"
        title="Admin Dashboard"
        jp="管理"
        action={
          <button onClick={reload} disabled={loading} className="btn btn-ghost">
            <Icon name="sparkle" size={15} /> {loading ? "Syncing…" : "Refresh metrics"}
          </button>
        }
      />

      {/* 4 Essential KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel-flat p-5">
          <div className="label">Gross Coin Volume (14d)</div>
          <div className="h-display mt-2 flex items-baseline gap-2 text-3xl">
            {metrics.totalGMV.toLocaleString()}
            <span className="font-mono text-xs font-bold text-mint">+14.2%</span>
          </div>
          <div className="mt-1 font-mono text-xs text-muted">
            Coins spent on locked chapters
          </div>
        </div>

        <div className="panel-flat p-5">
          <div className="label">Platform Revenue (30%)</div>
          <div className="h-display mt-2 flex items-baseline gap-2 text-3xl text-accent">
            {metrics.platformTake.toLocaleString()}
            <span className="font-mono text-xs font-bold text-ink2">coins</span>
          </div>
          <div className="mt-1 font-mono text-xs text-muted">
            Creator payout (70%): {metrics.creatorPayout.toLocaleString()}
          </div>
        </div>

        <div className="panel-flat p-5">
          <div className="label">Active Catalogue</div>
          <div className="h-display mt-2 text-3xl">{metrics.totalStories} series</div>
          <div className="mt-1 font-mono text-xs text-muted">
            {metrics.mangaCount} Manga/Manhwa · {metrics.novelCount} Novels · {fmtNum(metrics.totalChapters)} chs
          </div>
        </div>

        <div className="panel-flat p-5">
          <div className="label">Moderation Actions</div>
          <div className="h-display mt-2 text-3xl">{logs.length}</div>
          <div className="mt-1 font-mono text-xs text-muted">
            {metrics.takedownCount} takedowns · {metrics.banCount} user bans
          </div>
        </div>
      </div>

      {/* Essential Charts Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <section className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="label">// 14-day trend · commerce ledger</div>
              <h3 className="h-display text-lg">Daily Coin Unlocks & Volume</h3>
            </div>
            <span className="chip chip-on !text-[0.6rem]">70/30 Split Active</span>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full overflow-visible" role="img" aria-label="14-day coin unlock trend">
            <defs>
              <linearGradient id="admArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((f) => {
              const y = PT + f * (H - PT - PB);
              const val = Math.round(maxVal * (1 - f));
              return (
                <g key={f}>
                  <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="var(--line)" strokeOpacity="0.14" strokeDasharray="3 4" />
                  <text x={PL - 6} y={y + 3} textAnchor="end" fontSize="9.5" fill="var(--muted)" style={{ fontFamily: "var(--font-mono)" }}>
                    {val}
                  </text>
                </g>
              );
            })}
            <path d={areaPath} fill="url(#admArea)" />
            <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={i === pts.length - 1 ? 4 : 2.5}
                fill={i === pts.length - 1 ? "var(--accent)" : "var(--card)"}
                stroke="var(--line)"
                strokeWidth="1.5"
              />
            ))}
            <text x={PL} y={H - 6} fontSize="9.5" fill="var(--muted)" style={{ fontFamily: "var(--font-mono)" }}>
              14d ago
            </text>
            <text x={W - PR} y={H - 6} textAnchor="end" fontSize="9.5" fill="var(--muted)" style={{ fontFamily: "var(--font-mono)" }}>
              Today ({metrics.series[metrics.series.length - 1]} coins)
            </text>
          </svg>
        </section>

        <section className="panel flex flex-col justify-between p-5">
          <div>
            <div className="label">// revenue distribution & top series</div>
            <h3 className="h-display text-lg">Split & Top Performing Series</h3>

            <div className="mt-4">
              <div className="flex justify-between font-mono text-xs font-bold">
                <span>Creator Share (70%)</span>
                <span>Platform (30%)</span>
              </div>
              <div className="mt-1.5 flex h-4 overflow-hidden rounded-full border-2 border-line bg-paper2">
                <div className="h-full bg-mint" style={{ width: "70%" }} title="70% Creator Share" />
                <div className="h-full bg-accent" style={{ width: "30%" }} title="30% Platform Fee" />
              </div>
            </div>

            <ul className="mt-5 space-y-3">
              {topStories.map((s) => (
                <li key={s.id}>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="truncate pr-2">{s.title}</span>
                    <span className="font-mono text-muted">{fmtNum(s.weekly * 1000)} reads/wk</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full border border-line/40 bg-paper2">
                    <div
                      className="h-full bg-ink"
                      style={{ width: `${Math.round((s.weekly / maxWeekly) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* Action Controls: Takedown & Ban */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="panel p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-md border-2 border-line bg-accent text-white">
              <Icon name="flame" size={18} />
            </span>
            <div>
              <h3 className="font-display text-lg leading-tight">Chapter Takedown</h3>
              <p className="text-xs text-muted">Hides the chapter and refunds recorded purchases</p>
            </div>
          </div>
          <div className="space-y-3">
            <Field label="CHAPTER ID" value={chapterID} onChange={setChapterID} placeholder="e.g. hollow-moon-courier:2" />
            <Field label="REASON (RECORDED IN AUDIT LOG)" value={takedownReason} onChange={setTakedownReason} placeholder="e.g. DMCA notice #2026-041" />
            <button onClick={onTakedown} disabled={busy !== null} className="btn w-full justify-center bg-accent text-white">
              {busy === "takedown" ? "Taking down…" : "Take down chapter"}
            </button>
          </div>
        </section>

        <section className="panel p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-md border-2 border-line bg-hl text-[#15120f]">
              <Icon name="lock" size={18} />
            </span>
            <div>
              <h3 className="font-display text-lg leading-tight">Ban User</h3>
              <p className="text-xs text-muted">Revokes active sessions in the identity service</p>
            </div>
          </div>
          <div className="space-y-3">
            <Field label="USER ID" value={banTarget} onChange={setBanTarget} placeholder="e.g. spammer-42" />
            <Field label="REASON (RECORDED IN AUDIT LOG)" value={banReason} onChange={setBanReason} placeholder="e.g. Repeated spam in chapter comments" />
            <button onClick={onBan} disabled={busy !== null} className="btn w-full justify-center">
              {busy === "ban" ? "Banning…" : "Ban user"}
            </button>
          </div>
        </section>
      </div>

      {/* Immutable Audit Log */}
      <section className="mt-8">
        <h3 className="mb-3 font-display text-xl">Audit Log ({logs.length})</h3>
        {logs.length === 0 ? (
          <Empty icon="bookmark" title="No moderation actions yet" text="Every takedown and ban is recorded here with admin ID, target, reason, and timestamp." />
        ) : (
          <div className="panel overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b-2 border-line bg-paper2 font-mono text-xs">
                <tr>
                  <th className="px-4 py-2.5">ACTION</th>
                  <th className="px-4 py-2.5">TARGET</th>
                  <th className="px-4 py-2.5">ADMIN</th>
                  <th className="px-4 py-2.5">REASON</th>
                  <th className="px-4 py-2.5">WHEN</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-line/20 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs font-bold">{l.action}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{l.target_id}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted">{l.admin_id}</td>
                    <td className="px-4 py-2.5">{l.reason}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
