import { NextResponse } from "next/server";
import { parseAccessInput } from "@/lib/economy-validate";
import { routeError } from "@/lib/economy-route";
import { checkAccess } from "@/lib/economy-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const input = parseAccessInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Invalid access request" }, { status: 400 });
  try {
    return NextResponse.json(await checkAccess(input));
  } catch (err) {
    return routeError(err);
  }
}
