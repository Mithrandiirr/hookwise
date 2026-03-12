"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Provider } from "@/types";

const providers: { value: Provider; label: string; secretPlaceholder: string; hint: string }[] = [
  {
    value: "stripe",
    label: "Stripe",
    secretPlaceholder: "whsec_...",
    hint: "Found in Stripe Dashboard → Developers → Webhooks → signing secret",
  },
  {
    value: "shopify",
    label: "Shopify",
    secretPlaceholder: "your-shopify-secret",
    hint: "Found in Shopify Admin → Settings → Notifications → Webhooks",
  },
  {
    value: "github",
    label: "GitHub",
    secretPlaceholder: "your-webhook-secret",
    hint: "Set when creating the webhook in GitHub repository settings",
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
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Failed to create integration");
      setLoading(false);
      return;
    }

    router.push("/integrations");
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">New Integration</h1>
        <p className="text-[var(--text-tertiary)] mt-1">Connect a webhook provider to HookWise</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Integration name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Stripe Production"
            className="w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Provider</label>
          <div className="grid grid-cols-3 gap-3">
            {providers.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setProvider(p.value)}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  provider === p.value
                    ? "border-indigo-500 bg-indigo-600/20 text-indigo-400"
                    : "border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Signing secret</label>
          <input
            type="password"
            required
            value={signingSecret}
            onChange={(e) => setSigningSecret(e.target.value)}
            placeholder={selectedProvider.secretPlaceholder}
            className="w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm"
          />
          <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">{selectedProvider.hint}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Destination URL</label>
          <input
            type="url"
            required
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="https://your-app.com/webhooks"
            className="w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
            HookWise will forward verified webhooks to this URL.
          </p>
        </div>

        {provider !== "github" && (
          <>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                {provider === "stripe" ? "Stripe Secret Key" : "Shopify Admin API Token"}
                <span className="text-[var(--text-ghost)] font-normal ml-1">(optional)</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === "stripe" ? "sk_live_..." : "shpat_..."}
                className="w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm"
              />
              <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                Enables reconciliation (gap detection) and enriched delivery. Encrypted at rest.
              </p>
            </div>

            {provider === "shopify" && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Shopify store domain
                  <span className="text-[var(--text-ghost)] font-normal ml-1">(required for reconciliation)</span>
                </label>
                <input
                  type="text"
                  value={providerDomain}
                  onChange={(e) => setProviderDomain(e.target.value)}
                  placeholder="your-store.myshopify.com"
                  className="w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm"
                />
                <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                  Your Shopify store domain — used to poll the Shopify Admin API for missed webhooks.
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating..." : "Create integration"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg bg-[var(--bg-surface-raised)] px-6 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
