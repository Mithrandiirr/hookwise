// Day 1 — /onboarding/connect.
// Single-page wizard: pick provider → paste key → validate → connect.
// Decision pre-made: no OAuth. Manual API key paste is faster to ship; Shopify Plus
// agency owners already have keys saved.

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ProviderKey = "shopify" | "stripe";

type ProviderSpec = {
  key: ProviderKey;
  name: string;
  blurb: string;
  keyPlaceholder: string;
  keyLabel: string;
  docsUrl: string;
  needsDomain?: boolean;
  domainPlaceholder?: string;
  accent: string;
};

const PROVIDERS: ProviderSpec[] = [
  {
    key: "shopify",
    name: "Shopify",
    blurb: "Reconcile orders, customers, fulfillments against the Admin API.",
    keyLabel: "Admin API access token",
    keyPlaceholder: "shpat_••••••••••••••••••••••••",
    docsUrl: "https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin",
    needsDomain: true,
    domainPlaceholder: "your-store.myshopify.com",
    accent: "#9ec396",
  },
  {
    key: "stripe",
    name: "Stripe",
    blurb: "Reconcile charges, payment intents, subscription events against Stripe.",
    keyLabel: "Restricted or secret key (read access to charges)",
    keyPlaceholder: "rk_live_•••••••••••••••• or sk_live_••••••••••••••••",
    docsUrl: "https://docs.stripe.com/keys#create-restricted-api-secret-key",
    accent: "#9ac7ff",
  },
];

// Hidden behind "More" — wired post-Day-1.
const COMING_SOON = ["Clerk", "Resend", "GitHub", "Paddle", "Chargebee", "Lemon Squeezy", "Generic"];

type Status = "idle" | "validating" | "validated" | "connecting" | "error";

export default function OnboardingConnectPage() {
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  const [provider, setProvider] = useState<ProviderKey>("shopify");
  const [apiKey, setApiKey] = useState("");
  const [shopDomain, setShopDomain] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  const spec = useMemo(() => PROVIDERS.find((p) => p.key === provider)!, [provider]);
  const keyOk = apiKey.trim().length >= 8;
  const domainOk = !spec.needsDomain || /^[a-z0-9-]+\.myshopify\.com$/i.test(shopDomain.trim());
  const canValidate = keyOk && domainOk && status !== "validating" && status !== "connecting";

  function pickProvider(k: ProviderKey) {
    setProvider(k);
    setStatus("idle");
    setMessage(null);
    setLabel(null);
  }

  async function validate() {
    setStatus("validating");
    setMessage(null);
    setLabel(null);

    const res = await fetch("/api/onboarding/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        apiKey: apiKey.trim(),
        shopDomain: spec.needsDomain ? shopDomain.trim() : undefined,
      }),
    });
    const body = (await res.json()) as { ok?: boolean; error?: string; label?: string };

    if (!body.ok) {
      setStatus("error");
      setMessage(body.error ?? "Validation failed.");
      return;
    }
    setStatus("validated");
    setLabel(body.label ?? null);
  }

  async function connect() {
    setStatus("connecting");
    setMessage(null);

    const res = await fetch("/api/onboarding/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        apiKey: apiKey.trim(),
        shopDomain: spec.needsDomain ? shopDomain.trim() : undefined,
        label,
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus("error");
      setMessage(body.error ?? "Could not create integration.");
      return;
    }

    const body = (await res.json()) as { integrationId: string };
    router.push(`/dashboard/loading?integrationId=${body.integrationId}`);
  }

  return (
    <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "40px 28px 80px" }}>
      <div style={{ width: "100%", maxWidth: 620 }}>
        <div className="hf-eyebrow">Step 1 of 1</div>
        <h1 className="hf-display" style={{ fontSize: 36, margin: "12px 0 8px", lineHeight: 1.08 }}>
          Connect your first provider.
        </h1>
        <p style={{ fontSize: 14, color: "var(--hf-ink-3)", lineHeight: 1.55, margin: 0, maxWidth: 520 }}>
          HookWise reads from the provider&apos;s API to back-poll the last 30 days. You&apos;ll be on
          the dashboard with real numbers in about a minute.
        </p>

        {/* Provider picker */}
        <section style={{ marginTop: 28 }}>
          <Heading n="1" label="Pick a provider" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            {PROVIDERS.map((p) => {
              const active = p.key === provider;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => pickProvider(p.key)}
                  style={{
                    textAlign: "left",
                    padding: "16px 18px",
                    borderRadius: 12,
                    background: active ? "var(--hf-bg-3)" : "transparent",
                    border: active ? `1px solid ${p.accent}` : "1px solid var(--hf-line)",
                    boxShadow: active ? `0 0 0 1px ${p.accent}` : "none",
                    cursor: "pointer",
                    transition: "border-color 120ms ease, box-shadow 120ms ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: p.accent,
                      }}
                    />
                    <span style={{ fontWeight: 500, fontSize: 14.5, color: "var(--hf-ink)" }}>{p.name}</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--hf-ink-3)", margin: "8px 0 0", lineHeight: 1.5 }}>
                    {p.blurb}
                  </p>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setShowMore((s) => !s)}
              className="hf-mono"
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                color: "var(--hf-ink-3)",
                fontSize: 11.5,
                cursor: "pointer",
                letterSpacing: "0.04em",
              }}
            >
              {showMore ? "Hide" : "More providers"} {showMore ? "▴" : "▾"}
            </button>
            {showMore && (
              <div
                className="hf-mono"
                style={{
                  marginTop: 8,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px dashed var(--hf-line-2)",
                  fontSize: 11.5,
                  color: "var(--hf-ink-4)",
                  lineHeight: 1.6,
                }}
              >
                Wired soon: {COMING_SOON.join(" · ")}. Ping us if you need one of these on day one.
              </div>
            )}
          </div>
        </section>

        {/* API key */}
        <section style={{ marginTop: 28 }}>
          <Heading n="2" label="Paste your API key" />
          {spec.needsDomain && (
            <div style={{ marginTop: 12 }}>
              <label className="hf-mono" style={labelStyle}>
                Shop domain
              </label>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={shopDomain}
                onChange={(e) => {
                  setShopDomain(e.target.value);
                  if (status === "validated" || status === "error") setStatus("idle");
                }}
                placeholder={spec.domainPlaceholder}
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <label className="hf-mono" style={labelStyle}>
                {spec.keyLabel}
              </label>
              <a
                href={spec.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="hf-link-accent"
                style={{ fontSize: 11.5 }}
              >
                Where do I find this? →
              </a>
            </div>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                if (status === "validated" || status === "error") setStatus("idle");
              }}
              placeholder={spec.keyPlaceholder}
              className="hf-mono"
              style={{ ...inputStyle, marginTop: 6, fontSize: 12.5 }}
            />
          </div>
        </section>

        {/* Validate / Connect */}
        <section style={{ marginTop: 28 }}>
          <Heading n="3" label="Validate and connect" />
          <div style={{ marginTop: 14 }}>
            {status === "validated" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(126,217,138,0.06)",
                  border: "1px solid rgba(126,217,138,0.3)",
                  fontSize: 13,
                  color: "var(--hf-ink)",
                }}
              >
                <span style={{ color: "#7ed98a", fontSize: 14 }}>✓</span>
                <span>
                  Validated{label ? ` · ${label}` : ""}. Ready to start the 30-day back-poll.
                </span>
              </div>
            )}
            {status === "error" && message && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(242,154,154,0.06)",
                  border: "1px solid rgba(242,154,154,0.3)",
                  fontSize: 13,
                  color: "var(--hf-ink)",
                }}
              >
                <span style={{ color: "#f29a9a", fontSize: 14 }}>✕</span>
                <span>{message}</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            {status === "validated" || status === "connecting" ? (
              <button
                type="button"
                disabled={status === "connecting"}
                onClick={connect}
                className="hf-btn pill"
                style={{ opacity: status === "connecting" ? 0.6 : 1 }}
              >
                {status === "connecting" ? "Starting back-poll…" : "Start back-poll →"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canValidate}
                onClick={validate}
                className="hf-btn pill"
                style={{ opacity: canValidate ? 1 : 0.55, cursor: canValidate ? "pointer" : "not-allowed" }}
              >
                {status === "validating" ? "Validating…" : "Validate key →"}
              </button>
            )}
            <a href="/dashboard" className="hf-btn ghost">Skip</a>
          </div>

          <p
            className="hf-mono"
            style={{
              marginTop: 14,
              fontSize: 10.5,
              color: "var(--hf-ink-4)",
              letterSpacing: "0.04em",
              lineHeight: 1.6,
            }}
          >
            We hit one read-only endpoint to verify (shop.json for Shopify, charges?limit=1 for
            Stripe). Nothing is written to your provider. Key stays encrypted at rest.
          </p>
        </section>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 10.5,
  color: "var(--hf-ink-3)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  background: "var(--hf-bg)",
  border: "1px solid var(--hf-line)",
  color: "var(--hf-ink)",
  fontSize: 13,
  outline: "none",
};

function Heading({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        className="hf-mono"
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          background: "var(--hf-bg-3)",
          border: "1px solid var(--hf-line)",
          display: "grid",
          placeItems: "center",
          fontSize: 10.5,
          color: "var(--hf-ink-3)",
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--hf-ink)" }}>{label}</span>
    </div>
  );
}
