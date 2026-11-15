import { NextResponse } from "next/server";
import { routeError } from "@/lib/economy-route";
import { getLedger } from "@/lib/economy-server";
import { getServerIdentity } from "@/lib/identity-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = await getServerIdentity(request);
  if (!id) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const accountId = id.accountId;
  try {
    return NextResponse.json({ entries: await getLedger(accountId) });
  } catch (err) {
    return routeError(err);
  }
}
