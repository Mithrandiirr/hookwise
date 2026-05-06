"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, AuthField, AuthError } from "@/components/hw";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      kicker="NEW PASSWORD"
      title="Set a new password."
      subtitle="Use something memorable but not guessable."
    >
      <form onSubmit={handleSubmit}>
        {error && <AuthError message={error} />}

        <AuthField label="New password" htmlFor="password">
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="hw-input hw-mono"
            placeholder="min. 8 characters"
          />
        </AuthField>

        <AuthField label="Confirm password" htmlFor="confirm">
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="hw-input hw-mono"
            placeholder="repeat password"
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
          {loading ? "Updating…" : "Update password"}
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
