import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";

const handler = toNextJsHandler(auth);

const SEEDS = [
  { name: "Mika Tanabe", email: "reader@dootoon.store", password: "dootoon123", role: "reader" },
  { name: "Ren Akitsuki", email: "creator@dootoon.store", password: "dootoon123", role: "creator" },
  { name: "System Admin", email: "admin@dootoon.store", password: "dootoon123", role: "admin" },
] as const;

let seedPromise: Promise<void> | null = null;
function ensureSeed() {
  if (!seedPromise) {
    seedPromise = (async () => {
      for (const s of SEEDS) {
        try {
          await auth.api.signUpEmail({
            body: { name: s.name, email: s.email, password: s.password, role: s.role },
          });
        } catch {
          // already exists or duplicate
        }
      }
    })();
  }
  return seedPromise;
}

export async function GET(req: NextRequest) {
  await ensureSeed();
  return handler.GET(req);
}

export async function POST(req: NextRequest) {
  await ensureSeed();
  return handler.POST(req);
}
