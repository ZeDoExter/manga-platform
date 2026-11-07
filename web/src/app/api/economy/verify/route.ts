import { NextResponse } from "next/server";
import { PACKAGE_MAP } from "@/lib/coin-packages";
import { stripe } from "@/lib/stripe-server";
import { topUp } from "@/lib/economy-server";
import { routeError } from "@/lib/economy-route";

export const dynamic = "force-dynamic";

/**
 * Verifies a Checkout session server-side and credits coins as a safety net.
 * The webhook is the primary path; this covers events lost while no listener ran.
 * Idempotent: replaying the same session_id never double-credits.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { sessionId?: unknown };
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed", paid: false }, { status: 402 });
    }
    const meta = session.metadata ?? {};
    const accountId = meta.accountId ?? "";
    const pkg = meta.packageId ? PACKAGE_MAP[meta.packageId] : undefined;
    const key = meta.idempotencyKey || session.id;
    if (!accountId || !pkg || !key) {
      return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 });
    }
    const wallet = await (async () => {
      const first = await topUp({ accountId, amount: pkg.coins, coinType: "purchased", idempotencyKey: `stripe_p_${key}` });
      if (pkg.bonus > 0) {
        const second = await topUp({ accountId, amount: pkg.bonus, coinType: "bonus", idempotencyKey: `stripe_b_${key}` });
        return second.wallet;
      }
      return first.wallet;
    })();
    return NextResponse.json({ paid: true, wallet });
  } catch (err) {
    return routeError(err);
  }
}
