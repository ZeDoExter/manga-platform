import { NextResponse } from "next/server";
import { parseTopUpInput } from "@/lib/economy-validate";
import { routeError } from "@/lib/economy-route";
import { topUp } from "@/lib/economy-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const input = parseTopUpInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Invalid top-up request" }, { status: 400 });
  try {
    return NextResponse.json(await topUp(input));
  } catch (err) {
    return routeError(err);
  }
}
