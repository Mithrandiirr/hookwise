"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Provider } from "@/types";
import { ProviderMark, Pill, Toggle } from "@/components/hw";

const providers: {
  value: Provider;
  label: string;
  secretPlaceholder: string;
  hint: string;
}[] = [
  {
    value: "shopify",
    label: "Shopify",
    secretPlaceholder: "your-shopify-secret",
    hint: "Admin → Settings → Notifications → Webhooks",
  },
];

const TOPICS = [
  ["orders/create", true],
  ["orders/paid", true],
  ["orders/updated", true],
  ["fulfillment_events/create", true],
  ["refunds/create", false],
] as const;

export default function NewIntegrationPage() {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<Provider>("shopify");
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
      setError(data.error ?? "Failed to create endpoint");
      setLoading(false);
      return;
    }

    router.push("/integrations");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: "28px 32px 40px", overflow: "auto", flex: 1 }}>
      {/* breadcrumb */}
      <div
        className="hf-mono"
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--hf-ink-4)", marginBottom: 14 }}
      >
        <Link href="/integrations" style={{ color: "var(--hf-accent)", textDecoration: "none" }}>
          Integrations
        </Link>
        <span>/</span>
        <span style={{ color: "var(--hf-ink-2)" }}>New delivery endpoint</span>
      </div>

      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 22,
          gap: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--hf-ink)" }}>
            Connect a delivery endpoint
          </h1>
          <div style={{ fontSize: 12.5, color: "var(--hf-ink-3)", marginTop: 6 }}>
            Recovered events are POSTed here, idempotent and signed — exactly like a native webhook
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button type="button" onClick={() => router.back()} className="hf-btn outline small">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="hf-btn pill small" style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? "Saving…" : "Save endpoint"}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="hf-mono"
          style={{
            padding: "10px 14px",
            borderRadius: 9,
            background: "#fdeaea",
            border: "1px solid #f4c4c4",
            color: "#dc2626",
            fontSize: 12,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 10, alignItems: "start" }}>
        {/* form column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* endpoint basics */}
          <Card>
            <CardTitle>Endpoint</CardTitle>
            <Field label="Name">
              <Input value={name} onChange={setName} placeholder="Production app" />
            </Field>

            <Field label="Provider">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {providers.map((p) => {
                  const on = provider === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setProvider(p.value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "9px 12px",
                        borderRadius: 9,
                        border: on ? "1px solid var(--hf-accent)" : "1px solid var(--hf-line)",
                        background: on ? "var(--hf-accent-tint)" : "var(--hf-bg-3)",
                        boxShadow: on ? "0 0 0 3px rgba(3,105,161,0.1)" : "none",
                        color: "var(--hf-ink)",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      <ProviderMark provider={p.value} size={18} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Delivery URL">
              <Input
                type="url"
                value={destinationUrl}
                onChange={setDestinationUrl}
                placeholder="https://app.yourstore.com/webhooks/shopify"
                mono
              />
            </Field>

            <Field label={`Signing secret · ${selectedProvider.hint}`}>
              <Input
                type="password"
                value={signingSecret}
                onChange={setSigningSecret}
                placeholder={selectedProvider.secretPlaceholder}
                mono
              />
              <Hint>
                We sign every payload with this secret in the{" "}
                <span className="hf-mono" style={{ fontSize: 10.5 }}>
                  X-HookWise-Signature
                </span>{" "}
                header.
              </Hint>
            </Field>

            <Field label="Shopify Admin API token (optional)">
              <Input
                type="password"
                value={apiKey}
                onChange={setApiKey}
                placeholder="shpat_..."
                mono
              />
              <Hint>Enables reconciliation (gap detection) and enriched delivery. Encrypted at rest.</Hint>
            </Field>

            {provider === "shopify" && (
              <Field label="Shopify store domain (required for reconciliation)">
                <Input
                  value={providerDomain}
                  onChange={setProviderDomain}
                  placeholder="your-store.myshopify.com"
                  mono
                />
              </Field>
            )}
          </Card>

          {/* topics */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--hf-ink)" }}>Topics to deliver</div>
              <span className="hf-mono" style={{ fontSize: 10.5, color: "var(--hf-ink-4)" }}>
                {TOPICS.filter(([, on]) => on).length} of {TOPICS.length} selected
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {TOPICS.map(([topic, on]) => (
                <div
                  key={topic}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: on ? "1px solid var(--hf-accent-border)" : "1px solid var(--hf-line)",
                    background: on ? "var(--hf-accent-tint)" : "var(--hf-bg-3)",
                    borderRadius: 9,
                    padding: "10px 13px",
                  }}
                >
                  <span className="hf-mono" style={{ fontSize: 12, color: on ? "var(--hf-ink)" : "var(--hf-ink-3)" }}>
                    {topic}
                  </span>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 5,
                      background: on ? "var(--hf-accent)" : "transparent",
                      border: on ? "none" : "1px solid var(--hf-line-2)",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 10,
                    }}
                  >
                    {on ? "✓" : ""}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* retry & idempotency */}
          <Card>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--hf-ink)", marginBottom: 4 }}>
              Retry &amp; idempotency
            </div>
            <div style={{ fontSize: 12, color: "var(--hf-ink-4)", marginBottom: 16 }}>
              How we behave when your endpoint is slow or down
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Max attempts" tight>
                <Select value="5 attempts" />
              </Field>
              <Field label="Backoff" tight>
                <Select value="Exponential" />
              </Field>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 16,
                padding: "12px 14px",
                background: "var(--hf-accent-tint)",
                border: "1px solid var(--hf-accent-border)",
                borderRadius: 10,
              }}
            >
              <Toggle on size="sm" />
              <div style={{ fontSize: 12.5, color: "var(--hf-ink-2)" }}>
                <strong style={{ fontWeight: 600, color: "var(--hf-ink)" }}>Idempotency keys on</strong> — each
                recovered event carries{" "}
                <span className="hf-mono" style={{ fontSize: 11 }}>
                  rec_&#123;event_id&#125;
                </span>
                , so re-delivery is always safe.
              </div>
            </div>
          </Card>
        </div>

        {/* right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* test delivery */}
          <div style={{ background: "#0e1116", borderRadius: 12, padding: 20, color: "#f4f4f5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Test delivery</div>
              <span
                className="hf-mono"
                style={{ fontSize: 10, color: "#34d399", background: "rgba(52,211,153,0.14)", borderRadius: 999, padding: "2px 8px" }}
              >
                200 OK
              </span>
            </div>
            <div
              className="hf-mono"
              style={{ fontSize: 10.5, lineHeight: 1.65, color: "#c4cad2", background: "#07090c", borderRadius: 8, padding: "12px 14px" }}
            >
              <div style={{ color: "#6b7280" }}>{"// sample orders/create"}</div>
              <div>
                <span style={{ color: "#7dd3fc" }}>&quot;order_number&quot;</span>:{" "}
                <span style={{ color: "#f5b07c" }}>471212</span>,
              </div>
              <div>
                <span style={{ color: "#7dd3fc" }}>&quot;total_price&quot;</span>:{" "}
                <span style={{ color: "#9ae6b4" }}>&quot;58.00&quot;</span>,
              </div>
              <div>
                <span style={{ color: "#7dd3fc" }}>&quot;source&quot;</span>:{" "}
                <span style={{ color: "#9ae6b4" }}>&quot;reconciliation&quot;</span>
              </div>
            </div>
            <div
              style={{
                background: "#ffffff",
                color: "#0e1116",
                fontSize: 13,
                fontWeight: 550,
                padding: "9px 0",
                borderRadius: 8,
                textAlign: "center",
                cursor: "pointer",
                marginTop: 14,
              }}
            >
              Send test event
            </div>
            <div className="hf-mono" style={{ fontSize: 10.5, color: "#6b7280", marginTop: 10, textAlign: "center" }}>
              last test 2m ago · 240ms round-trip
            </div>
          </div>

          {/* recent deliveries */}
          <Card pad={false}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--hf-line)", fontSize: 13, fontWeight: 600, color: "var(--hf-ink)" }}>
              Recent deliveries
            </div>
            {[
              ["#47-1212", "200 · 240ms", "green"],
              ["#47-1208", "200 · 198ms", "green"],
              ["#47-1199", "retry · 2/5", "amber"],
              ["#47-1188", "200 · 311ms", "green"],
            ].map(([id, status, tone], i, a) => (
              <div
                key={id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 18px",
                  borderBottom: i < a.length - 1 ? "1px solid var(--hf-line)" : "none",
                }}
              >
                <span className="hf-mono" style={{ fontSize: 11, color: "var(--hf-ink-2)" }}>
                  {id}
                </span>
                <Pill tone={tone as "green" | "amber"} dot={false}>
                  {status}
                </Pill>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </form>
  );
}

/* ───────── building blocks ───────── */

function Card({ children, pad = true }: { children: ReactNode; pad?: boolean }) {
  return (
    <div
      style={{
        background: "var(--hf-bg-3)",
        border: "1px solid var(--hf-line)",
        borderRadius: 12,
        padding: pad ? "22px 24px" : 0,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--hf-ink)", marginBottom: 16 }}>{children}</div>;
}

function Field({ label, children, tight }: { label: string; children: ReactNode; tight?: boolean }) {
  return (
    <div style={{ marginBottom: tight ? 0 : 16 }}>
      <div
        className="hf-mono"
        style={{
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--hf-ink-4)",
          marginBottom: 7,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={mono ? "hf-mono" : undefined}
      style={{
        width: "100%",
        boxSizing: "border-box",
        fontSize: mono ? 12.5 : 13,
        color: "var(--hf-ink)",
        background: "var(--hf-bg)",
        border: "1px solid var(--hf-line)",
        borderRadius: 9,
        padding: "10px 13px",
        outline: "none",
      }}
    />
  );
}

function Select({ value }: { value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        border: "1px solid var(--hf-line)",
        borderRadius: 9,
        padding: "10px 13px",
        fontSize: 13,
        color: "var(--hf-ink)",
      }}
    >
      <span>{value}</span>
      <span style={{ color: "var(--hf-ink-4)" }}>▾</span>
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11.5, color: "var(--hf-ink-4)", marginTop: 6, lineHeight: 1.5 }}>{children}</div>;
}
