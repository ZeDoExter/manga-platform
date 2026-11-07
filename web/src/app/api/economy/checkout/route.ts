import { NextResponse } from "next/server";
import { PACKAGE_MAP } from "@/lib/coin-packages";
import { stripe } from "@/lib/stripe-server";
import { routeError } from "@/lib/economy-route";

export const dynamic = "force-dynamic";

function baseUrl(request: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/+$/, "");
  return new URL(request.url).origin;
}

/** Creates a Stripe Checkout session for a static coin package. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      accountId?: unknown;
      packageId?: unknown;
    } | null;
    const accountId = typeof body?.accountId === "string" ? body.accountId.trim() : "";
    const pkg = typeof body?.packageId === "string" ? PACKAGE_MAP[body.packageId] : undefined;
    if (!accountId || !pkg) {
      return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
    }
    const origin = baseUrl(request);
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      currency: "thb",
      customer_email: undefined,
      line_items: [
        {
          price_data: {
            currency: "thb",
            unit_amount: pkg.priceTHB * 100,
            product_data: { name: `TSUZUKU ${pkg.label} — ${pkg.coins + pkg.bonus} coins` },
          },
          quantity: 1,
        },
      ],
      metadata: {
        accountId,
        packageId: pkg.id,
        coins: String(pkg.coins),
        bonus: String(pkg.bonus),
        idempotencyKey: `stripe_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      },
      success_url: `${origin}/wallet?topup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/wallet?topup=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return routeError(err);
  }
}
