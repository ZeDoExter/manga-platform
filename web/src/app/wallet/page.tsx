import { Suspense } from "react";
import { WalletView } from "@/components/economy/WalletView";

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="wrap my-12 text-sm text-muted">Loading wallet…</div>}>
      <WalletView />
    </Suspense>
  );
}
