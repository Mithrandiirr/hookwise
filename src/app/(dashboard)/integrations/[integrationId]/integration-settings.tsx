"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Chip, Icon, SectionHeader } from "@/components/hw";

interface IntegrationSettingsProps {
  integration: {
    id: string;
    name: string;
    provider: string;
    signingSecret: string;
    destinationUrl: string;
    status: string;
    idempotencyEnabled: boolean;
    sequencerEnabled: boolean;
    enrichmentEnabled: boolean;
    apiKeyEncrypted: string | null;
    providerDomain: string | null;
  };
}

export function IntegrationSettings({ integration }: IntegrationSettingsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [name, setName] = useState(integration.name);
  const [destinationUrl, setDestinationUrl] = useState(integration.destinationUrl);
  const [idempotencyEnabled, setIdempotencyEnabled] = useState(integration.idempotencyEnabled);
  const [sequencerEnabled, setSequencerEnabled] = useState(integration.sequencerEnabled);
  const [enrichmentEnabled, setEnrichmentEnabled] = useState(integration.enrichmentEnabled);
  const [apiKey, setApiKey] = useState("");
  const [providerDomain, setProviderDomain] = useState(integration.providerDomain ?? "");

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const body: Record<string, unknown> = {
      name,
      destinationUrl,
      idempotencyEnabled,
      sequencerEnabled,
      enrichmentEnabled,
    };

    if (apiKey) body.apiKeyEncrypted = apiKey;
    if (providerDomain) body.providerDomain = providerDomain;

    const res = await fetch(`/api/integrations/${integration.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setMessage({ type: "success", text: "Settings saved" });
      setApiKey("");
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({ error: "Failed to save" }));
      setMessage({ type: "error", text: (err as { error: string }).error });
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/integrations/${integration.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/integrations");
      router.refresh();
    } else {
      setMessage({ type: "error", text: "Failed to delete integration" });
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      {/* General */}
      <div
        className="hw-panel"
        style={{ padding: 22, background: "var(--hw-bg-2)" }}
      >
        <div style={{ marginBottom: 14 }}>
          <SectionHeader title="General" />
        </div>
        <div
          className="grid"
          style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <Field label="Name">
            <input
              className="hw-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Destination URL">
            <input
              className="hw-input hw-mono"
              type="text"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
            />
          </Field>
          {integration.provider === "shopify" && (
            <Field label="Shopify domain">
              <input
                className="hw-input hw-mono"
                type="text"
                value={providerDomain}
                onChange={(e) => setProviderDomain(e.target.value)}
                placeholder="mystore.myshopify.com"
              />
            </Field>
          )}
        </div>
      </div>

      {/* API Key */}
      <div
        className="hw-panel"
        style={{ padding: 22, background: "var(--hw-bg-2)" }}
      >
        <div
          className="flex items-center"
          style={{ marginBottom: 10, gap: 10 }}
        >
          <SectionHeader title="Provider API key" />
          {integration.apiKeyEncrypted && (
            <span style={{ marginLeft: "auto" }}>
              <Chip tone="green">configured</Chip>
            </span>
          )}
        </div>
        <div
          className="hw-mono"
          style={{ fontSize: 11.5, color: "var(--hw-ink-4)", marginBottom: 10 }}
        >
          Required for reconciliation and enriched delivery. Encrypted at rest.
        </div>
        <input
          className="hw-input"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={
            integration.apiKeyEncrypted
              ? "Leave blank to keep current key"
              : `Enter ${integration.provider} API key`
          }
        />
      </div>

      {/* Features */}
      <div
        className="hw-panel"
        style={{ padding: 22, background: "var(--hw-bg-2)" }}
      >
        <div style={{ marginBottom: 14 }}>
          <SectionHeader title="Features" />
        </div>
        <Toggle
          enabled={idempotencyEnabled}
          onToggle={() => setIdempotencyEnabled(!idempotencyEnabled)}
          label="Idempotency"
          description="Exactly-once delivery. Deduplicate events via provider_event_id."
        />
        <Toggle
          enabled={sequencerEnabled}
          onToggle={() => setSequencerEnabled(!sequencerEnabled)}
          label="Event sequencer"
          description="Hold and reorder events by business logic before delivery."
        />
        <Toggle
          enabled={enrichmentEnabled}
          onToggle={() => setEnrichmentEnabled(!enrichmentEnabled)}
          label="Enriched delivery"
          description="Fetch the latest resource state from the provider API before delivery."
          disabled={!integration.apiKeyEncrypted && !apiKey}
        />
        {!integration.apiKeyEncrypted && !apiKey && enrichmentEnabled && (
          <div
            className="hw-mono"
            style={{
              marginTop: 10,
              fontSize: 11,
              color: "var(--hw-amber)",
            }}
          >
            Enriched delivery requires an API key above.
          </div>
        )}
      </div>

      {message && (
        <div
          className="hw-mono"
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background:
              message.type === "success"
                ? "rgba(74,222,128,0.06)"
                : "rgba(248,113,113,0.06)",
            border:
              message.type === "success"
                ? "1px solid rgba(74,222,128,0.22)"
                : "1px solid rgba(248,113,113,0.22)",
            color:
              message.type === "success"
                ? "var(--hw-green)"
                : "var(--hw-red)",
            fontSize: 12,
          }}
        >
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="hw-btn hw-btn-ghost"
          style={{ color: "var(--hw-red)", borderColor: "rgba(248,113,113,0.22)" }}
        >
          <Icon name="x" size={13} /> Delete integration
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="hw-btn hw-btn-primary"
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          <Icon name="check" size={13} /> {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="hw-panel"
            style={{
              padding: 28,
              maxWidth: 460,
              width: "calc(100% - 32px)",
              background: "var(--hw-bg-2)",
            }}
          >
            <div
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "var(--hw-ink)",
                marginBottom: 8,
              }}
            >
              Delete integration?
            </div>
            <div
              style={{ fontSize: 13, color: "var(--hw-ink-3)", lineHeight: 1.55 }}
            >
              This will permanently delete{" "}
              <span className="hw-mono" style={{ color: "var(--hw-ink-2)" }}>
                {integration.name}
              </span>{" "}
              along with its events, deliveries and configuration. Cannot be
              undone.
            </div>
            <div
              className="flex items-center justify-end"
              style={{ gap: 10, marginTop: 20 }}
            >
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="hw-btn hw-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="hw-btn"
                style={{
                  background: "var(--hw-red)",
                  color: "#0a0d14",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="hw-label" style={{ display: "block", marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  enabled,
  onToggle,
  label,
  description,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex items-start"
      style={{
        gap: 16,
        padding: "12px 0",
        borderTop: "1px solid var(--hw-line)",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--hw-ink)" }}>
          {label}
        </div>
        <div
          className="hw-mono"
          style={{
            fontSize: 11,
            color: "var(--hw-ink-4)",
            marginTop: 4,
            lineHeight: 1.55,
          }}
        >
          {description}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={enabled}
        className="flex-shrink-0"
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          position: "relative",
          background: enabled ? "rgba(129,140,248,0.4)" : "var(--hw-bg-3)",
          border: `1px solid ${enabled ? "rgba(129,140,248,0.6)" : "var(--hw-line-2)"}`,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
          transition: "all 150ms",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: enabled ? 17 : 2,
            width: 14,
            height: 14,
            borderRadius: 999,
            background: enabled ? "var(--hw-indigo-ink)" : "var(--hw-ink-4)",
            transition: "left 150ms",
          }}
        />
      </button>
    </div>
  );
}
