import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, stampGoHeaders } from "@/lib/identity-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MEDIA_URL = (process.env.MEDIA_URL ?? "http://localhost:8088").replace(/\/+$/, "");
async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = `${MEDIA_URL}/${path.join("/")}${req.nextUrl.search}`;
  const headers = new Headers();
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  // Identity is stamped from the session cookie; client X-User-* is dropped.
  stampGoHeaders(headers, await getServerIdentity(req));
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  try {
    const res = await fetch(target, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(300000),
    });
    const out = await res.arrayBuffer();
    return new NextResponse(out, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "media service unavailable" },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
