import { NextResponse } from "next/server";
import { routeError } from "@/lib/economy-route";
import { getCreatorEarnings } from "@/lib/economy-server";
import { getServerIdentity } from "@/lib/identity-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = await getServerIdentity(request);
  if (!id) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("creatorId")?.trim();
  const creatorId = id.role === "admin" && q ? q : id.accountId;
  try {
    return NextResponse.json(await getCreatorEarnings(creatorId));
  } catch (err) {
    return routeError(err);
  }
}
