import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DEMO_SEEDS } from "@/lib/demo-seeds";

export const dynamic = "force-dynamic";

const SEEDS = DEMO_SEEDS;

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
