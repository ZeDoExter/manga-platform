import { NextResponse } from "next/server";

// Generic 502 for downstream failures. Production must never leak service
// names ("catalog service unavailable") or raw fetch/upstream errors
// ("Failed to fetch", "Reader returned 500") to readers.
export function badGateway(): NextResponse {
  return NextResponse.json({ error: "Couldn't reach the server. Please try again." }, { status: 502 });
}
