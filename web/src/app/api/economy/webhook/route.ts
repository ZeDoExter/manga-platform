import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { PACKAGE_MAP } from "@/lib/coin-packages";
import { stripe, stripeWebhookSecret } from "@/lib/stripe-server";
import { topUp } from "@/lib/economy-server";

export const dynamic = "force-dynamic";

/** Stripe webhook: credits coins once per checkout session (idempotent via commerce). */
export async function POST(request: Request) {
  let event: Stripe.Event;
  try {
    const raw = await request.text();
    const signature = request.headers.get("stripe-signature") ?? "";
    event = stripe().webhooks.constructEvent(raw, signature, stripeWebhookSecret());
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata ?? {};
  const accountId = meta.accountId ?? "";
  const pkg = meta.packageId ? PACKAGE_MAP[meta.packageId] : undefined;
  const key = (meta.idempotencyKey || session.id) ?? "";
  if (!accountId || !pkg || !key) {
    return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 });
  }
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  try {
    await topUp({ accountId, amount: pkg.coins, coinType: "purchased", idempotencyKey: `stripe_p_${key}` });
    if (pkg.bonus > 0) {
      await topUp({ accountId, amount: pkg.bonus, coinType: "bonus", idempotencyKey: `stripe_b_${key}` });
    }
  } catch (err) {
    // Return 500 so Stripe retries; commerce idempotency makes retries safe.
    const message = err instanceof Error ? err.message : "Top-up failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
