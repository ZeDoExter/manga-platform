import { auth } from "@/lib/auth";
import { DEMO_SEEDS } from "@/lib/demo-seeds";
import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";

const handler = toNextJsHandler(auth);

const SEEDS = DEMO_SEEDS;

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
