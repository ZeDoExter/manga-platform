import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MEDIA_URL = (process.env.MEDIA_URL ?? "http://localhost:8088").replace(/\/+$/, "");
async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = `${MEDIA_URL}/${path.join("/")}${req.nextUrl.search}`;
  const headers = new Headers();
  for (const h of ["content-type", "x-user-id", "x-user-role"]) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
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
