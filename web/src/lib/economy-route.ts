import { NextResponse } from "next/server";
import { UpstreamError } from "./economy-server";

const PASS_THROUGH = new Set([400, 401, 402, 404, 409, 410]);

export function routeError(err: unknown): NextResponse {
  if (err instanceof UpstreamError) {
    const status = PASS_THROUGH.has(err.status) ? err.status : 502;
    return NextResponse.json({ error: err.message }, { status });
  }
  const message = err instanceof Error ? err.message : "Economy service unavailable";
  return NextResponse.json({ error: message }, { status: 502 });
}
