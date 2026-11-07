import { NextResponse } from "next/server";
import { routeError } from "@/lib/economy-route";
import { getCreatorEarnings } from "@/lib/economy-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const creatorId = new URL(request.url).searchParams.get("creatorId")?.trim();
  if (!creatorId) return NextResponse.json({ error: "creatorId is required" }, { status: 400 });
  try {
    return NextResponse.json(await getCreatorEarnings(creatorId));
  } catch (err) {
    return routeError(err);
  }
}
