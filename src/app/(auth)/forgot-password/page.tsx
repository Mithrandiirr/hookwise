"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell, AuthField, AuthError, Icon } from "@/components/hw";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <AuthShell kicker="CHECK YOUR EMAIL" title="Reset link sent.">
        <div style={{ textAlign: "center" }}>
          <Icon
            name="check"
            size={28}
            color="var(--hw-green)"
            style={{ display: "inline-block" }}
          />
          <div
            style={{
              marginTop: 14,
              fontSize: 13,
              color: "var(--hw-ink-2)",
              lineHeight: 1.6,
            }}
          >
            We sent a password reset link to{" "}
            <span className="hw-mono" style={{ color: "var(--hw-ink)" }}>
              {email}
            </span>
            .
          </div>
          <Link
            href="/login"
            className="hw-mono"
            style={{
              marginTop: 18,
              display: "inline-block",
              fontSize: 12,
              color: "var(--hw-indigo-ink)",
            }}
          >
            ← Back to login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      kicker="RESET PASSWORD"
      title="Forgot it?"
      subtitle="Enter your email and we'll send a reset link."
      footer={
        <>
          Remember it?{" "}
          <Link href="/login" style={{ color: "var(--hw-indigo-ink)" }}>
            Sign in
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

        <button
          type="submit"
          disabled={loading}
          className="hw-btn hw-btn-primary"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "12px 16px",
            opacity: loading ? 0.6 : 1,
            marginTop: 4,
          }}
        >
          {loading ? "Sending…" : "Send reset link"}
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
