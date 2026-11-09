"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, signUp, useSession, signOut } from "@/lib/auth-client";
import { useApp } from "@/lib/store";
import { cx } from "@/lib/util";
import { Icon } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useApp();
  const { data: session } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"reader" | "creator">("reader");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleGoogle() {
    setErr(null);
    setBusy(true);
    try {
      const res = await signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (res?.error) {
        setErr(res.error.message ?? "Google sign-in failed");
        setBusy(false);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Google sign-in failed");
      setBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split("@")[0] || "Reader",
          // @ts-expect-error additionalField role configured on server
          role,
        });
        if (res.error) {
          setErr(res.error.message ?? "Could not create account");
          setBusy(false);
          return;
        }
        toast("Account created — welcome to DOOTOON!");
      } else {
        const res = await signIn.email({
          email: email.trim(),
          password,
        });
        if (res.error) {
          setErr(res.error.message ?? "Invalid email or password");
          setBusy(false);
          return;
        }
        toast("Signed in ✓");
      }
      router.push("/");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  if (session?.user) {
    return (
      <div className="wrap my-16 max-w-md">
        <div className="panel p-6 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full border-2 border-line bg-accent font-display text-2xl text-white shadow-[3px_3px_0_var(--shadow)]">
            {(session.user.name?.[0] ?? session.user.email[0] ?? "U").toUpperCase()}
          </div>
          <h1 className="h-display mt-4 text-2xl">{session.user.name}</h1>
          <p className="mt-1 font-mono text-xs text-muted">{session.user.email}</p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link href="/" className="btn btn-accent w-full justify-center">
              Continue reading
            </Link>
            <button
              type="button"
              className="btn btn-ghost w-full justify-center"
              onClick={async () => {
                await signOut();
                toast("Signed out", "info");
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap my-12 max-w-md">
      <div className="panel p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span
            className="grid size-10 -rotate-3 place-items-center border-2 border-line bg-accent font-display text-xl text-white shadow-[3px_3px_0_var(--shadow)]"
            style={{ fontFamily: "var(--font-thai)" }}
          >
            ด
          </span>
          <div>
            <div className="label">// google & email</div>
            <h1 className="h-display text-2xl">
              {mode === "signin" ? "Sign in to DOOTOON" : "Create your account"}
            </h1>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleGoogle}
          className="btn mt-6 flex w-full items-center justify-center gap-2.5 !py-3 text-sm font-extrabold"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.7-.2-2.5H12v4.8h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-line/20" />
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">or email</span>
          <div className="h-px flex-1 bg-line/20" />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-md border-2 border-line bg-paper2 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErr(null);
            }}
            className={cx(
              "rounded py-1.5 text-xs font-extrabold transition-colors",
              mode === "signin" ? "bg-ink text-paper" : "text-muted hover:text-ink",
            )}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErr(null);
            }}
            className={cx(
              "rounded py-1.5 text-xs font-extrabold transition-colors",
              mode === "signup" ? "bg-ink text-paper" : "text-muted hover:text-ink",
            )}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "signup" && (
            <>
              <div>
                <label className="label block pb-1">Display name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mika, Ren, ..."
                  className="field"
                />
              </div>
              <div>
                <label className="label block pb-1">Account role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("reader")}
                    className={cx(
                      "rounded-md border-2 p-2.5 text-left text-xs font-bold",
                      role === "reader" ? "border-line bg-hl/40" : "border-line/30 bg-card",
                    )}
                  >
                    <div className="font-extrabold">Reader</div>
                    <div className="text-[0.68rem] text-muted">Read, follow & collect</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("creator")}
                    className={cx(
                      "rounded-md border-2 p-2.5 text-left text-xs font-bold",
                      role === "creator" ? "border-line bg-accent/15" : "border-line/30 bg-card",
                    )}
                  >
                    <div className="font-extrabold">Uploader</div>
                    <div className="text-[0.68rem] text-muted">Publish in Creator Studio</div>
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="label block pb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="field"
            />
          </div>

          <div>
            <label className="label block pb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="field"
            />
          </div>

          {err && (
            <div className="rounded-md border-2 border-accent bg-accent/10 px-3 py-2 text-xs font-bold text-accent">
              {err}
            </div>
          )}

          <button type="submit" disabled={busy} className="btn btn-accent w-full justify-center !py-3">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            <Icon name="arrow" size={14} />
          </button>
        </form>
        <p className="mt-4 rounded-md border-2 border-dashed border-line/40 p-2.5 text-center font-mono text-[0.68rem] text-muted">
          Demo: reader@ / creator@ / admin@ + dootoon.store · pass dootoon123
        </p>
      </div>
    </div>
  );
}
