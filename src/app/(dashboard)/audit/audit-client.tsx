"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props =
  | { mode: "start" }
  | {
      mode: "report";
      auditId: string;
      shareToken: string;
      brandName: string | null;
      complete: boolean;
    };

export function AuditClient(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [brand, setBrand] = useState(props.mode === "report" ? (props.brandName ?? "") : "");
  const [error, setError] = useState<string | null>(null);

  if (props.mode === "start") {
    return (
      <div style={{ marginTop: 8 }}>
        {error && (
          <p style={{ fontSize: 12.5, color: "#dc2626", marginBottom: 10 }}>{error}</p>
        )}
        <button
          type="button"
          className="hf-btn pill"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const res = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
            if (!res.ok) {
              const body = (await res.json().catch(() => ({}))) as { error?: string };
              setError(body.error ?? "Could not start the audit.");
              setBusy(false);
              return;
            }
            router.refresh();
          }}
        >
          {busy ? "Starting…" : "Start the 7-day audit →"}
        </button>
      </div>
    );
  }

  const shareUrl = `/api/report/${props.shareToken}`;

  async function saveBrand() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auditId: props.mode === "report" ? props.auditId : undefined, brandName: brand.trim() || null }),
    });
    if (!res.ok) setError("Could not save the brand name.");
    setBusy(false);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 13, color: "var(--hf-ink-2)", margin: 0, maxWidth: 560 }}>
        {props.complete
          ? "The audit window is complete and the report is frozen. Share it, or print it to PDF from the report view."
          : "The report regenerates from live data each time it's opened. Share the link with anyone — no login required."}
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="hf-btn pill small">
          View Gap Report →
        </a>
        <button
          type="button"
          className="hf-btn outline small"
          onClick={async () => {
            await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied ✓" : "Copy share link"}
        </button>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--hf-line)",
          paddingTop: 16,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label
          className="hf-mono"
          style={{ fontSize: 10.5, color: "var(--hf-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          White-label brand
        </label>
        <input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Your agency name (optional)"
          maxLength={80}
          style={{
            background: "var(--hf-bg-3)",
            border: "1px solid var(--hf-line)",
            borderRadius: 8,
            padding: "7px 12px",
            fontSize: 13,
            color: "var(--hf-ink)",
            minWidth: 240,
          }}
        />
        <button type="button" className="hf-btn outline small" disabled={busy} onClick={saveBrand}>
          {busy ? "Saving…" : "Save"}
        </button>
        {error && <span style={{ fontSize: 12, color: "#dc2626" }}>{error}</span>}
      </div>
    </div>
  );
}
