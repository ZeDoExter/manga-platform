import { NextRequest, NextResponse } from "next/server";

const LIBRARY_URL = (process.env.LIBRARY_URL ?? "http://localhost:8087").replace(/\/+$/, "");

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = `${LIBRARY_URL}/${path.join("/")}${req.nextUrl.search}`;
  const headers = new Headers();
  const userId = req.headers.get("x-user-id");
  if (userId) headers.set("X-User-ID", userId);
  const ct = req.headers.get("content-type");
  if (ct) headers.set("Content-Type", ct);

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();
  try {
    const res = await fetch(target, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "library service unavailable" },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const PUT = proxy;
export const POST = proxy;
export const DELETE = proxy;
