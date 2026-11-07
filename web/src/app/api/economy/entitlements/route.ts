import { NextResponse } from "next/server";
import { routeError } from "@/lib/economy-route";
import { getEntitlements } from "@/lib/economy-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const accountId = new URL(request.url).searchParams.get("accountId")?.trim();
  if (!accountId) return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  try {
    return NextResponse.json({ entitlements: await getEntitlements(accountId) });
  } catch (err) {
    return routeError(err);
  }
}
