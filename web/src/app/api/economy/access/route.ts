import { NextResponse } from "next/server";
import { parseAccessInput } from "@/lib/economy-validate";
import { routeError } from "@/lib/economy-route";
import { checkAccess } from "@/lib/economy-server";
import { getServerIdentity } from "@/lib/identity-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const id = await getServerIdentity(request);
  const parsed = parseAccessInput(await request.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: "Invalid access request" }, { status: 400 });
  // Guests may evaluate free-chapter gates, but never choose their identity.
  const input = id
    ? { ...parsed, accountId: id.accountId, role: id.role }
    : { ...parsed, accountId: "guest", role: "guest" as const };
  try {
    return NextResponse.json(await checkAccess(input));
  } catch (err) {
    return routeError(err);
  }
}
