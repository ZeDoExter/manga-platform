import { NextRequest, NextResponse } from "next/server";
import { badGateway } from "@/lib/api-error";
import { getServerIdentity, stampGoHeaders } from "@/lib/identity-server";

const MODERATION_URL = (process.env.MODERATION_URL ?? "http://localhost:8085").replace(/\/+$/, "");

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // Moderation Go has no auth of its own: the BFF is the gate (admin only).
  const id = await getServerIdentity(req);
  if (!id) return NextResponse.json({ error: "Login required" }, { status: 401 });
  if (id.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { path } = await params;
  const target = `${MODERATION_URL}/${path.join("/")}${req.nextUrl.search}`;
  let body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();
  // Force admin attribution server-side; ignore client-supplied admin_id.
  if (body) {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      body = JSON.stringify({ ...parsed, admin_id: id.accountId });
    } catch {
      // Non-JSON passthrough.
    }
  }
  try {
    const headers = new Headers({ "content-type": "application/json" });
    stampGoHeaders(headers, id);
    const res = await fetch(target, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });
    if (res.status >= 500) return badGateway();
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return badGateway();
  }
}

export const GET = proxy;
export const POST = proxy;
