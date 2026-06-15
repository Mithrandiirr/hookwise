// Day 1 — /onboarding/connect.
// Layout per .design/HookWise Phase 0, Section 3 (install flow): step rail on
// the left, main panel on the right. The whole pitch is "zero risk" — the
// install screen has to feel like it.
// Single-page wizard: pick provider → paste key → validate → connect.

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
};

const PROVIDERS: ProviderSpec[] = [
  {
    key: "shopify",
    name: "Shopify",
    blurb: "Reconcile orders, customers, fulfillments against the Admin API.",
    keyLabel: "Admin API access token",
    keyPlaceholder: "shpat_••••••••••••••••••••••••",
    docsUrl:
      "https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin",
    needsDomain: true,
    domainPlaceholder: "your-store.myshopify.com",
  },
  {
    key: "stripe",
    name: "Stripe",
    blurb: "Reconcile charges, payment intents, subscription events against Stripe.",
    keyLabel: "Restricted or secret key (read access to charges)",
    keyPlaceholder: "rk_live_•••••••••••••••• or sk_live_••••••••••••••••",
    docsUrl: "https://docs.stripe.com/keys#create-restricted-api-secret-key",
  },
];

// Hidden behind "More" — wired post-Day-1.
const COMING_SOON = ["Clerk", "Resend", "GitHub", "Paddle", "Chargebee", "Lemon Squeezy", "Generic"];

// Recommended subscription set per provider (Section 3 topics table).
const TOPICS: Record<ProviderKey, Array<[string, string]>> = {
  shopify: [
    ["orders/create", "core revenue signal"],
    ["orders/paid", "documented 20+ min delays"],
    ["orders/updated", "edit & cancellation flow"],
    ["fulfillment_events/create", "known gap reports, feb 2026"],
    ["refunds/create", "money-out completeness"],
  ],
  stripe: [
    ["charge.succeeded", "core revenue signal"],
    ["payment_intent.succeeded", "endpoint silent-fail window"],
    ["charge.refunded", "money-out completeness"],
    ["invoice.paid", "subscription revenue"],
    ["customer.subscription.updated", "plan changes"],
  ],
};

type Status = "idle" | "validating" | "validated" | "connecting" | "error";

const mono = "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace";

/* ── step rail ── */

function RailStep({
  state,
  n,
  title,
  sub,
}: {
  state: "done" | "active" | "todo";
  n: string;
  title: string;
  sub: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "26px 1fr",
        gap: 12,
        padding: "12px 10px",
        borderRadius: 10,
        background: state === "active" ? "var(--hf-accent-tint)" : "transparent",
        border: state === "active" ? "1px solid #d6e9f5" : "1px solid transparent",
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: state === "done" ? "var(--hf-green-bg)" : state === "active" ? "var(--hf-accent)" : "transparent",
          border: state === "todo" ? "1px solid var(--hf-line-2)" : "none",
          color: state === "done" ? "var(--hf-green)" : state === "active" ? "#ffffff" : "var(--hf-ink-4)",
          display: "grid",
          placeItems: "center",
          fontSize: state === "done" ? 12 : 11.5,
          fontWeight: 700,
        }}
      >
        {state === "done" ? "✓" : n}
      </div>
      <div>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: state === "active" ? 600 : 550,
            color: state === "todo" ? "var(--hf-ink-4)" : state === "done" ? "var(--hf-ink-2)" : "var(--hf-ink)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: mono,
            fontSize: 10.5,
            color: state === "active" ? "#5a8db0" : state === "todo" ? "#b6bbc4" : "var(--hf-ink-4)",
            marginTop: 3,
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingConnectPage() {
  const router = useRouter();
  // Design preview: /onboarding/connect?preview=subscription jumps straight to the
  // step-2 "additional subscription" screen with demo data (no real key needed).
  const preview = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "subscription";

  const [showMore, setShowMore] = useState(false);
  const [provider, setProvider] = useState<ProviderKey>("shopify");
  const [apiKey, setApiKey] = useState("");
  const [shopDomain, setShopDomain] = useState(() => (preview() ? "brightloom.myshopify.com" : ""));
  const [desiredProvider, setDesiredProvider] = useState("");
  const [status, setStatus] = useState<Status>(() => (preview() ? "validated" : "idle"));
  const [message, setMessage] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(() => (preview() ? "brightloom.myshopify.com" : null));

  const spec = useMemo(() => PROVIDERS.find((p) => p.key === provider)!, [provider]);
  const keyOk = apiKey.trim().length >= 8;
  const domainOk = !spec.needsDomain || /^[a-z0-9-]+\.myshopify\.com$/i.test(shopDomain.trim());
  const canValidate = keyOk && domainOk && status !== "validating" && status !== "connecting";
  const validated = status === "validated" || status === "connecting";
  const endpointSlug =
    (label ?? shopDomain).trim().replace(/\.myshopify\.com$/i, "").replace(/[^a-z0-9-]+/gi, "-").toLowerCase() ||
    "your-store";

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
        desiredProvider: desiredProvider.trim() || undefined,
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus("error");
      setMessage(body.error ?? "Could not create integration.");
      return;
    }

    await res.json();
    router.push("/audit");
  }

  return (
    <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "40px 28px 80px" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          background: "#fcfcfd",
          border: "1px solid var(--hf-line)",
          borderRadius: 12,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          minHeight: 560,
        }}
      >
        {/* ── step rail ── */}
        <div
          style={{
            borderRight: "1px solid var(--hf-line-soft)",
            background: "#ffffff",
            padding: "36px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--hf-ink-4)",
              marginBottom: 18,
            }}
          >
            Free 7-day gap audit
          </div>
          <RailStep
            state={validated ? "done" : "active"}
            n="1"
            title="Connect store"
            sub={validated ? "read-only scope verified" : "read-only API key"}
          />
          <RailStep
            state={validated ? "active" : "todo"}
            n="2"
            title="Additional subscription"
            sub="your existing flow is untouched"
          />
          <RailStep state="todo" n="3" title="Audit runs" sub="7 days · report in your inbox" />

          <div
            style={{
              marginTop: "auto",
              background: "#f7f9fb",
              border: "1px solid var(--hf-line)",
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--hf-accent)",
                marginBottom: 8,
              }}
            >
              Zero risk, by design
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "var(--hf-ink-3)" }}>
              Shopify allows multiple subscriptions per topic. We add one of our own — read-only
              key, no proxy, never in your critical path. Remove it anytime with one click.
            </p>
          </div>
        </div>

        {/* ── main panel ── */}
        <div style={{ padding: "40px 44px" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {validated ? "Add the audit subscription" : "Start your 7-day gap audit."}
          </h3>
          <p style={{ margin: "0 0 28px", fontSize: 13.5, lineHeight: 1.55, color: "var(--hf-ink-3)", maxWidth: 520 }}>
            {validated ? (
              <>
                We&#39;ll subscribe to {TOPICS[provider].length} topics so we can record what{" "}
                {spec.name} actually fires. This is in addition to your existing webhooks — nothing
                is replaced, redirected, or proxied.
              </>
            ) : (
              <>
                A read-only API key is all we need. For 7 days we record what the provider fires,
                poll its API for ground truth, and build your Gap Report. Nothing is replaced,
                redirected, or proxied.
              </>
            )}
          </p>

          {validated && (
            <>
              {/* Topics table */}
              <div style={{ border: "1px solid var(--hf-line)", borderRadius: 12, overflow: "hidden", marginBottom: 18, background: "#ffffff" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 18px",
                    background: "#f7f7f9",
                    borderBottom: "1px solid var(--hf-line-soft)",
                  }}
                >
                  <div style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--hf-ink-3)" }}>
                    Topics · {TOPICS[provider].length} selected
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 10.5, color: "var(--hf-ink-4)" }}>recommended set</div>
                </div>
                {TOPICS[provider].map(([topic, reason], i) => (
                  <div
                    key={topic}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "11px 18px",
                      borderBottom: i < TOPICS[provider].length - 1 ? "1px solid var(--hf-line-soft)" : "none",
                    }}
                  >
                    <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--hf-ink)" }}>{topic}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11.5, color: "var(--hf-ink-4)" }}>{reason}</span>
                      <span style={{ color: "var(--hf-green)", fontSize: 13 }}>✓</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Endpoint row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "#f7f7f9",
                  border: "1px solid var(--hf-line)",
                  borderRadius: 10,
                  padding: "9px 18px",
                  marginBottom: 28,
                }}
              >
                <div style={{ fontFamily: mono, fontSize: 11, color: "var(--hf-ink-4)" }}>POST</div>
                <div style={{ fontFamily: mono, fontSize: 12, color: "var(--hf-ink-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  https://ingest.trueline.dev/s/{endpointSlug}
                </div>
                <div style={{ fontFamily: mono, fontSize: 10, color: "var(--hf-ink-3)", border: "1px solid var(--hf-line-2)", borderRadius: 999, padding: "2px 8px" }}>
                  provisioned on create
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button
                  type="button"
                  disabled={status === "connecting"}
                  onClick={connect}
                  className="hf-btn pill"
                  style={{ opacity: status === "connecting" ? 0.6 : 1, borderRadius: 9, padding: "11px 22px", fontSize: 14 }}
                >
                  {status === "connecting" ? "Creating subscription…" : "Create additional subscription"}
                </button>
                <span style={{ fontSize: 12.5, color: "var(--hf-ink-4)" }}>Takes ~10 seconds · removable anytime</span>
              </div>
            </>
          )}

          {validated ? null : (
            <>
          {/* Provider picker */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
                    background: active ? "var(--hf-accent-tint)" : "#ffffff",
                    border: active ? "1px solid var(--hf-accent-border)" : "1px solid var(--hf-line)",
                    boxShadow: active ? "0 0 0 1px var(--hf-accent-border)" : "none",
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
                        background: active ? "var(--hf-accent)" : "var(--hf-line-2)",
                      }}
                    />
                    <span style={{ fontWeight: 550, fontSize: 14.5, color: "var(--hf-ink)" }}>{p.name}</span>
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

          {/* API key */}
          <section style={{ marginTop: 24 }}>
            {spec.needsDomain && (
              <div style={{ marginBottom: 12 }}>
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
                    if (status === "error") setStatus("idle");
                  }}
                  placeholder={spec.domainPlaceholder}
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </div>
            )}

            <div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
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
                  if (status === "error") setStatus("idle");
                }}
                placeholder={spec.keyPlaceholder}
                className="hf-mono"
                style={{ ...inputStyle, marginTop: 6, fontSize: 12.5 }}
              />
            </div>

            {/* Demand capture — one optional field; collecting is Phase 0 scope, acting on it is not. */}
            <div style={{ marginTop: 12 }}>
              <label className="hf-mono" style={labelStyle}>
                Which other provider do you want this for? (optional)
              </label>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={desiredProvider}
                onChange={(e) => setDesiredProvider(e.target.value)}
                placeholder="Stripe, Paddle, Clerk, Twilio…"
                maxLength={80}
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </div>
          </section>

          {status === "error" && message && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 10,
                background: "#fdeaea",
                border: "1px solid #f4c4c4",
                fontSize: 13,
                color: "var(--hf-ink)",
                marginTop: 20,
              }}
            >
              <span style={{ color: "var(--hf-red)", fontSize: 14 }}>✕</span>
              <span>{message}</span>
            </div>
          )}

          {/* Validate */}
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14 }}>
            <button
              type="button"
              disabled={!canValidate}
              onClick={validate}
              className="hf-btn pill"
              style={{
                opacity: canValidate ? 1 : 0.55,
                cursor: canValidate ? "pointer" : "not-allowed",
                borderRadius: 9,
                padding: "11px 22px",
                fontSize: 14,
              }}
            >
              {status === "validating" ? "Validating…" : "Validate key"}
            </button>
            <span style={{ fontSize: 12.5, color: "var(--hf-ink-4)" }}>
              Takes ~10 seconds · removable anytime
            </span>
          </div>

          <p
            className="hf-mono"
            style={{
              marginTop: 16,
              fontSize: 10.5,
              color: "var(--hf-ink-4)",
              letterSpacing: "0.04em",
              lineHeight: 1.6,
              maxWidth: 560,
            }}
          >
            We hit one read-only endpoint to verify (shop.json for Shopify, charges?limit=1 for
            Stripe). Nothing is written to your provider. Key stays encrypted at rest.
          </p>
            </>
          )}
        </div>
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
  background: "#ffffff",
  border: "1px solid var(--hf-line)",
  color: "var(--hf-ink)",
  fontSize: 13,
  outline: "none",
};
