import { auth } from "./auth";

export interface ServerIdentity {
  accountId: string;
  role: "reader" | "creator" | "admin";
  email: string;
  name: string;
}

/**
 * Resolve the caller's identity from the Better-Auth session cookie.
 * Returns null for guests/anonymous callers (never throws).
 */
export async function getServerIdentity(req: Request): Promise<ServerIdentity | null> {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    const u = session?.user as { id?: string; email?: string; name?: string; role?: string } | undefined;
    if (!u?.id || !u?.email) return null;
    // Same id formula as the client's sessionAccount bridge (store.tsx):
    // sanitized email local-part, so server ids match existing wallets/libraries.
    const accountId =
      (u.email.split("@")[0] ?? u.id).replace(/[^a-z0-9_-]/gi, "-").toLowerCase() || u.id;
    const role = u.role === "admin" ? "admin" : u.role === "creator" ? "creator" : "reader";
    return { accountId, role, email: u.email, name: u.name || accountId };
  } catch {
    return null;
  }
}

export type GoRole = "reader" | "uploader" | "admin";

/** Go services speak uploader/reader/admin (see services/identity). */
export function goRole(role: ServerIdentity["role"]): GoRole {
  return role === "creator" ? "uploader" : role;
}

/**
 * Stamp X-User-* from server identity. Client-supplied values are ALWAYS
 * discarded first: browsers must never control these headers (auth boundary).
 * Pass guestId (e.g. "guest") to preserve shared-guest behavior where safe.
 */
export function stampGoHeaders(headers: Headers, id: ServerIdentity | null, guestId = ""): void {
  headers.delete("x-user-id");
  headers.delete("x-user-role");
  if (id) {
    headers.set("X-User-ID", id.accountId);
    headers.set("X-User-Role", goRole(id.role));
  } else if (guestId) {
    headers.set("X-User-ID", guestId);
  }
}
