import { NextResponse } from "next/server";
import { parsePurchaseInput } from "@/lib/economy-validate";
import { routeError } from "@/lib/economy-route";
import { purchaseChapter } from "@/lib/economy-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const input = parsePurchaseInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Invalid purchase request" }, { status: 400 });
  if (input.accountId === "guest" || input.role === "guest") {
    return NextResponse.json({ error: "Login required for purchase" }, { status: 401 });
  }
  try {
    return NextResponse.json(await purchaseChapter(input));
  } catch (err) {
    return routeError(err);
  }
}
