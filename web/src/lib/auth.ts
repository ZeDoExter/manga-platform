import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { memoryAdapter } from "better-auth/adapters/memory";

const IDENTITY_URL = (process.env.IDENTITY_URL ?? "http://localhost:8081").replace(/\/+$/, "");

declare global {
  var __dootoonAuthMemDB:
    | {
        user: unknown[];
        session: unknown[];
        account: unknown[];
        verification: unknown[];
      }
    | undefined;
}

function getMemDB() {
  if (!globalThis.__dootoonAuthMemDB) {
    globalThis.__dootoonAuthMemDB = {
      user: [],
      session: [],
      account: [],
      verification: [],
    };
  }
  return globalThis.__dootoonAuthMemDB;
}

async function syncIdentityUser(email: string, role = "reader") {
  try {
    await fetch(`${IDENTITY_URL}/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password: "better-auth-managed-user",
        role: role === "creator" ? "uploader" : "reader",
      }),
    });
  } catch {
    // Identity service offline in local standalone dev: continue gracefully
  }
}

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

export const auth = betterAuth({
  // Stateless JWT sessions: survive web restarts/redeploys (memory adapter
  // wipes on restart). Trade-off: no server-side revocation until expiry —
  // banned users keep access until their token expires (max 7 days).
  plugins: [jwt()],
  database: memoryAdapter(getMemDB()),
  secret: process.env.BETTER_AUTH_SECRET ?? "dootoon-better-auth-secret-key-2026-production",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  trustedOrigins: [
    "https://dootoon.store",
    "http://localhost:3125",
    "http://localhost:3130",
    "http://localhost:3000",
    "http://127.0.0.1:3125",
    "http://127.0.0.1:3130",
    "http://127.0.0.1:3000",
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {},
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "reader",
        input: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const role = "role" in user && typeof user.role === "string" ? user.role : "reader";
          await syncIdentityUser(user.email, role);
        },
      },
    },
  },
});
