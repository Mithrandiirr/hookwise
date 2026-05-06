"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell, AuthField, AuthError, Icon } from "@/components/hw";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleGitHubLogin() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <AuthShell
      kicker="SIGN IN"
      title="Welcome back."
      subtitle="Pick up where you left off."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            style={{ color: "var(--hw-indigo-ink)" }}
          >
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <AuthError message={error} />}

        <AuthField label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="hw-input hw-mono"
            placeholder="you@example.com"
          />
        </AuthField>

        <AuthField label="Password" htmlFor="password">
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="hw-input hw-mono"
            placeholder="••••••••"
          />
        </AuthField>

        <div
          className="flex justify-end"
          style={{ marginBottom: 14 }}
        >
          <Link
            href="/forgot-password"
            className="hw-mono"
            style={{ fontSize: 11, color: "var(--hw-indigo-ink)" }}
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="hw-btn hw-btn-primary"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "12px 16px",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <div
          className="flex items-center"
          style={{ gap: 12, margin: "20px 0" }}
        >
          <div style={{ flex: 1, height: 1, background: "var(--hw-line)" }} />
          <span
            className="hw-mono"
            style={{ fontSize: 10, color: "var(--hw-ink-5)" }}
          >
            OR
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--hw-line)" }} />
        </div>

        <button
          type="button"
          onClick={handleGitHubLogin}
          className="hw-btn hw-btn-ghost"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "11px 16px",
          }}
        >
          <Icon name="terminal" size={13} /> Continue with GitHub
        </button>
      </form>
      <style jsx>{`
        :global(.hw-input) {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--hw-bg-3);
          border: 1px solid var(--hw-line-2);
          color: var(--hw-ink);
          font-size: 13px;
          transition: all 150ms;
        }
        :global(.hw-input:focus) {
          outline: none;
          border-color: rgba(129, 140, 248, 0.4);
          box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.08);
        }
        :global(.hw-input::placeholder) {
          color: var(--hw-ink-5);
        }
      `}</style>
    </AuthShell>
  );
}
