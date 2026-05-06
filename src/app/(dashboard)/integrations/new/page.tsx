"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Provider } from "@/types";
import {
  Dot,
  Icon,
  ProviderMark,
  DashTopbar,
} from "@/components/hw";

const providers: {
  value: Provider;
  label: string;
  secretPlaceholder: string;
  hint: string;
}[] = [
  {
    value: "stripe",
    label: "Stripe",
    secretPlaceholder: "whsec_...",
    hint: "Dashboard → Developers → Webhooks → signing secret",
  },
  {
    value: "shopify",
    label: "Shopify",
    secretPlaceholder: "your-shopify-secret",
    hint: "Admin → Settings → Notifications → Webhooks",
  },
  {
    value: "github",
    label: "GitHub",
    secretPlaceholder: "your-webhook-secret",
    hint: "Set when creating the webhook in repository settings",
  },
];

export default function NewIntegrationPage() {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<Provider>("stripe");
  const [signingSecret, setSigningSecret] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [providerDomain, setProviderDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const selectedProvider = providers.find((p) => p.value === provider)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        provider,
        signingSecret,
        destinationUrl,
        ...(apiKey ? { apiKey } : {}),
        ...(providerDomain ? { providerDomain } : {}),
      }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Failed to create integration");
      setLoading(false);
      return;
    }

    router.push("/integrations");
    router.refresh();
  }

  return (
    <>
      <DashTopbar
        title={
          <span className="flex items-center" style={{ gap: 10 }}>
            <a
              href="/integrations"
              style={{ color: "var(--hw-ink-4)", fontWeight: 500, fontSize: 14 }}
            >
              Integrations /
            </a>
            <span>New</span>
          </span>
        }
        subtitle="connect a webhook source to HookWise"
      />

      <div
        className="hw-scroll flex flex-col"
        style={{
          padding: "24px 28px 40px",
          gap: 20,
          overflow: "auto",
          flex: 1,
        }}
      >
        <form
          onSubmit={handleSubmit}
          className="hw-fade-up"
          style={{ maxWidth: 720 }}
        >
          <div
            className="hw-panel"
            style={{ background: "var(--hw-bg-2)", padding: 28 }}
          >
            {error && (
              <div
                className="hw-mono"
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(248,113,113,0.06)",
                  border: "1px solid rgba(248,113,113,0.22)",
                  color: "var(--hw-red)",
                  fontSize: 12,
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Dot tone="red" /> {error}
              </div>
            )}

            <Field label="Integration name">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. acme-production"
                className="hw-input"
              />
            </Field>

            <Field label="Provider">
              <div
                className="grid"
                style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}
              >
                {providers.map((p) => {
                  const on = provider === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setProvider(p.value)}
                      className="flex items-center"
                      style={{
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: on
                          ? "1px solid rgba(129,140,248,0.4)"
                          : "1px solid var(--hw-line-2)",
                        background: on
                          ? "rgba(129,140,248,0.1)"
                          : "var(--hw-panel)",
                        color: on ? "var(--hw-indigo-ink)" : "var(--hw-ink-2)",
                        fontSize: 13,
                        fontWeight: 500,
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 150ms",
                      }}
                    >
                      <ProviderMark provider={p.value} size={18} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field
              label="Signing secret"
              hint={selectedProvider.hint}
            >
              <input
                type="password"
                required
                value={signingSecret}
                onChange={(e) => setSigningSecret(e.target.value)}
                placeholder={selectedProvider.secretPlaceholder}
                className="hw-input hw-mono"
              />
            </Field>

            <Field
              label="Destination URL"
              hint="HookWise will forward verified webhooks to this URL."
            >
              <input
                type="url"
                required
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://your-app.com/webhooks"
                className="hw-input"
              />
            </Field>

            {provider !== "github" && (
              <>
                <Field
                  label={
                    <>
                      {provider === "stripe"
                        ? "Stripe secret key"
                        : "Shopify Admin API token"}{" "}
                      <span style={{ color: "var(--hw-ink-4)" }}>(optional)</span>
                    </>
                  }
                  hint="Enables reconciliation (gap detection) and enriched delivery. Encrypted at rest."
                >
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      provider === "stripe" ? "sk_live_..." : "shpat_..."
                    }
                    className="hw-input hw-mono"
                  />
                </Field>

                {provider === "shopify" && (
                  <Field
                    label={
                      <>
                        Shopify store domain{" "}
                        <span style={{ color: "var(--hw-ink-4)" }}>
                          (required for reconciliation)
                        </span>
                      </>
                    }
                    hint="Used to poll the Shopify Admin API for missed webhooks."
                  >
                    <input
                      type="text"
                      value={providerDomain}
                      onChange={(e) => setProviderDomain(e.target.value)}
                      placeholder="your-store.myshopify.com"
                      className="hw-input hw-mono"
                    />
                  </Field>
                )}
              </>
            )}

            <div
              className="flex"
              style={{
                gap: 10,
                paddingTop: 8,
                marginTop: 8,
              }}
            >
              <button
                type="submit"
                disabled={loading}
                className="hw-btn hw-btn-primary"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                <Icon name="check" size={13} />
                {loading ? "Creating…" : "Create integration"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="hw-btn hw-btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
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
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        className="hw-label"
        style={{ display: "block", marginBottom: 8 }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <div
          className="hw-mono"
          style={{ marginTop: 6, fontSize: 11, color: "var(--hw-ink-4)" }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
