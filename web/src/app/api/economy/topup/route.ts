import { NextResponse } from "next/server";
import { parseTopUpInput } from "@/lib/economy-validate";
import { routeError } from "@/lib/economy-route";
import { topUp } from "@/lib/economy-server";
import { getServerIdentity } from "@/lib/identity-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const id = await getServerIdentity(request);
  if (!id) return NextResponse.json({ error: "Login required for top-up" }, { status: 401 });
  const parsed = parseTopUpInput(await request.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: "Invalid top-up request" }, { status: 400 });
  const input = { ...parsed, accountId: id.accountId };
  try {
    return NextResponse.json(await topUp(input));
  } catch (err) {
    return routeError(err);
  }
}
