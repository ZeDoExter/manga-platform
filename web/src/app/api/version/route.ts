import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Build SHA baked into the image; clients compare it against their own
// bundle to detect a newer deploy and prompt a refresh (stale-tab guard).
export async function GET() {
  return NextResponse.json({ sha: process.env.APP_VERSION ?? "dev" });
}
