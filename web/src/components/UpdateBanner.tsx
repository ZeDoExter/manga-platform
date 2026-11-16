"use client";

import { useEffect, useState } from "react";

const BAKED = process.env.NEXT_PUBLIC_APP_VERSION;

/** Shows a refresh prompt when the server runs a newer deploy than this tab. */
export function UpdateBanner() {
  const [stale, setStale] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!BAKED || BAKED === "dev") return;
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { sha?: string };
        if (alive && data.sha && data.sha !== "dev" && data.sha !== BAKED) {
          setStale(true);
        }
      } catch {
        // Offline: stay silent, retry on next trigger.
      }
    };
    void check();
    const timer = setInterval(() => void check(), 300000);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!stale || dismissed) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[400] flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:pb-3">
      <div className="panel anim-pop flex items-center gap-3 border-accent px-4 py-2.5 text-sm font-bold shadow-[3px_3px_0_var(--shadow)]">
        <span>DOOTOON updated — refresh for the latest.</span>
        <button className="btn btn-accent btn-sm" onClick={() => window.location.reload()}>
          Refresh
        </button>
        <button className="btn btn-ghost btn-sm btn-icon" aria-label="Dismiss" onClick={() => setDismissed(true)}>
          ✕
        </button>
      </div>
    </div>
  );
}
