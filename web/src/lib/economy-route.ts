import { NextResponse } from "next/server";
import { badGateway } from "./api-error";
import { UpstreamError } from "./economy-server";

const PASS_THROUGH = new Set([400, 401, 402, 409, 410]);

export function routeError(err: unknown): NextResponse {
  if (err instanceof UpstreamError) {
    if (err.status === 404) {
      return NextResponse.json({ error: "This chapter is unavailable" }, { status: 404 });
    }
    if (PASS_THROUGH.has(err.status)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return badGateway();
  }
  return badGateway();
}
