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
      body: JSON.stringify({ name, provider, signingSecret, destinationUrl }),
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
        <h1 className="text-2xl font-bold text-white">New Integration</h1>
        <p className="text-gray-400 mt-1">Connect a webhook provider to HookWise</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Integration name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Stripe Production"
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Provider</label>
          <div className="grid grid-cols-3 gap-3">
            {providers.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setProvider(p.value)}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  provider === p.value
                    ? "border-indigo-500 bg-indigo-600/20 text-indigo-400"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Signing secret</label>
          <input
            type="password"
            required
            value={signingSecret}
            onChange={(e) => setSigningSecret(e.target.value)}
            placeholder={selectedProvider.secretPlaceholder}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm"
          />
          <p className="mt-1.5 text-xs text-gray-500">{selectedProvider.hint}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Destination URL</label>
          <input
            type="url"
            required
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="https://your-app.com/webhooks"
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            HookWise will forward verified webhooks to this URL.
          </p>
        </div>

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
            className="rounded-lg bg-gray-800 px-6 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
