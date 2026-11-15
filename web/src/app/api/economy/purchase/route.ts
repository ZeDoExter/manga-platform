import { NextResponse } from "next/server";
import { parsePurchaseInput } from "@/lib/economy-validate";
import { routeError } from "@/lib/economy-route";
import { purchaseChapter } from "@/lib/economy-server";
import { getServerIdentity } from "@/lib/identity-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const id = await getServerIdentity(request);
  if (!id) return NextResponse.json({ error: "Login required for purchase" }, { status: 401 });
  const parsed = parsePurchaseInput(await request.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: "Invalid purchase request" }, { status: 400 });
  const input = { ...parsed, accountId: id.accountId, role: id.role };
  try {
    return NextResponse.json(await purchaseChapter(input));
  } catch (err) {
    return routeError(err);
  }
}
