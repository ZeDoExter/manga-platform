import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Demo seed: 3 login users (reader / creator / admin).
// better-auth memory adapter loses data on restart — this re-seeds it.
// Password for all: dootoon123
const SEEDS = [
  { name: "Creator", email: "creator@dootoon.store", password: "dootoon123", role: "creator" },
  { name: "System Admin", email: "admin@dootoon.store", password: "dootoon123", role: "admin" },
] as const;

export async function POST() {
  const created: string[] = [];
  for (const s of SEEDS) {
    try {
      const res = await auth.api.signUpEmail({
        body: { name: s.name, email: s.email, password: s.password, role: s.role },
      });
      if (res) created.push(s.email);
    } catch {
      // Already seeded: signUp throws on duplicate — skip silently.
    }
  }
  return NextResponse.json({ seeded: created });
}
