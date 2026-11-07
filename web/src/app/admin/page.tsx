"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { DEMO_ADMIN, banUser, fetchAuditLogs, takedownChapter, type AuditLog } from "@/lib/admin-api";
import { Empty, Icon, SectionHead } from "@/components/ui";

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-xs text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border-2 border-line bg-card px-3 py-2 text-sm font-semibold outline-none placeholder:text-muted/60 focus:border-accent"
      />
    </label>
  );
}

export default function AdminPage() {
  const { toast } = useApp();
  const [chapterID, setChapterID] = useState("");
  const [takedownReason, setTakedownReason] = useState("");
  const [banTarget, setBanTarget] = useState("");
  const [banReason, setBanReason] = useState("");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAuditLogs();
      setLogs(rows.slice().reverse());
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load audit log", "warn");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onTakedown = async () => {
    if (!chapterID.trim() || !takedownReason.trim()) {
      toast("Chapter ID and reason are required", "warn");
      return;
    }
    setBusy("takedown");
    try {
      await takedownChapter(DEMO_ADMIN, chapterID.trim(), takedownReason.trim());
      toast("Takedown done — hidden + refunded + clawed back");
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
    if (!banTarget.trim() || !banReason.trim()) {
      toast("User ID and reason are required", "warn");
      return;
    }
    setBusy("ban");
    try {
      await banUser(DEMO_ADMIN, banTarget.trim(), banReason.trim());
      toast("User banned");
      setBanTarget("");
      setBanReason("");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ban failed", "warn");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="wrap py-8 md:py-12">
      <SectionHead kicker="// moderation console" title="Admin" jp="管理" />
      <p className="mt-2 font-mono text-xs text-muted">Takedown + bans + audit log (FR-D1..D4)</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="panel p-5">
          <h3 className="flex items-center gap-2 text-base font-extrabold">
            <Icon name="trash" size={16} className="text-accent" /> Takedown chapter
          </h3>
          <p className="mt-1 font-mono text-xs text-muted">FR-D2 · hides + reverses revenue (FR-M6)</p>
          <div className="mt-4 space-y-3">
            <Field label="CHAPTER ID" value={chapterID} onChange={setChapterID} placeholder="chap-abc123" />
            <Field label="REASON (REQUIRED)" value={takedownReason} onChange={setTakedownReason} placeholder="DMCA Notice #101" />
            <button className="btn w-full justify-center" onClick={() => void onTakedown()} disabled={busy === "takedown"}>
              {busy === "takedown" ? "Working…" : "Confirm takedown"}
            </button>
          </div>
        </section>

        <section className="panel p-5">
          <h3 className="flex items-center gap-2 text-base font-extrabold">
            <Icon name="lock" size={16} className="text-accent" /> Ban user
          </h3>
          <p className="mt-1 font-mono text-xs text-muted">FR-D3 · repeat offenders escalate</p>
          <div className="mt-4 space-y-3">
            <Field label="USER ID" value={banTarget} onChange={setBanTarget} placeholder="user-789" />
            <Field label="REASON (REQUIRED)" value={banReason} onChange={setBanReason} placeholder="repeat offender" />
            <button className="btn w-full justify-center" onClick={() => void onBan()} disabled={busy === "ban"}>
              {busy === "ban" ? "Working…" : "Confirm ban"}
            </button>
          </div>
        </section>
      </div>

      <section className="panel mt-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-extrabold">
            <Icon name="list" size={16} className="text-accent" /> Audit log
          </h3>
          <button className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => void reload()} disabled={loading}>
            Refresh
          </button>
        </div>
        <p className="mt-1 font-mono text-xs text-muted">FR-D4 · every admin action, newest first</p>
        {logs.length === 0 ? (
          <div className="mt-4">
            <Empty icon="book" title={loading ? "Loading…" : "No admin actions yet"} text="Takedowns and bans land here." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-line text-left font-mono text-xs text-muted">
                  <th className="px-2.5 py-2">TIME</th>
                  <th className="px-2.5 py-2">ADMIN</th>
                  <th className="px-2.5 py-2">ACTION</th>
                  <th className="px-2.5 py-2">TARGET</th>
                  <th className="px-2.5 py-2">REASON</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-line/60">
                    <td className="whitespace-nowrap px-2.5 py-2 font-mono text-xs text-muted">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="px-2.5 py-2 font-semibold">{l.admin_id}</td>
                    <td className="px-2.5 py-2"><span className="badge">{l.action}</span></td>
                    <td className="px-2.5 py-2 font-mono text-xs">{l.target_id}</td>
                    <td className="px-2.5 py-2">{l.reason}</td>
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
