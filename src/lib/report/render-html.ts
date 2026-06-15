// Standalone HTML render of the Gap Report — shareable link and print-to-PDF surface.
// Matches .design/Gap Report.dc.html (Daylight): near-black ink on white, mono labels,
// orange (#dd5008) exclusively for dollar amounts, a dark CTA band, severity-badged findings.

import type { Finding, GapReportData, GapRow } from "./types";

const INK = "#16181d";
const INK_2 = "#4b5160";
const INK_3 = "#6b7180";
const INK_4 = "#8b909a";
const LINE = "#e9eaef";
const LINE_2 = "#f0f1f4";
const LINE_3 = "#d4d6dd";
const PANEL = "#f7f7f9";
const SUBTLE = "#fbfbfc";

const WARM = "#dd5008"; // dollar amounts
const WARM_DEEP = "#b35418"; // secondary $ / unconfirmed value
const WARM_BG = "#fff8f3";
const WARM_BORDER = "#f4c9ad";
const RED = "#b3261e"; // high-severity finding
const SKY = "#0369a1";

const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, monospace";

export function renderGapReportHtml(report: GapReportData): string {
  const brand = report.brandName?.trim() || "trueline";
  const t = report.totals;
  const storeLabel = report.store.domain ?? report.store.name;
  const markLetter = brand.charAt(0).toUpperCase();
  const provider = providerLabel(report.provider);
  const noun = report.provider === "shopify" ? "orders" : "events";
  const windowLabel = `${fmtDate(report.window.start)} – ${fmtDate(report.window.end)}`;
  const missed = t.gapsConfirmed + t.gapsUnconfirmed;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${esc(brand)} — 7-Day Gap Audit · ${esc(storeLabel)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #f1f2f5; color: ${INK}; letter-spacing: -0.011em; -webkit-font-smoothing: antialiased; padding: 40px 20px; }
  .doc { width: 840px; max-width: 100%; margin: 0 auto; background: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 2px rgba(16,18,24,0.06), 0 24px 64px -32px rgba(16,18,24,0.25); }
  .mono { font-family: ${MONO}; }
  .num { font-variant-numeric: tabular-nums; }
  .money { color: ${WARM}; font-weight: 650; font-variant-numeric: tabular-nums; }
  @media print {
    body { background: #fff; padding: 0; }
    .doc { box-shadow: none; border-radius: 0; width: 100%; }
    .doc > div { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="doc">

  <!-- Document header -->
  <div style="display:flex;align-items:center;justify-content:space-between;padding:28px 52px;border-bottom:1px solid ${LINE};">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:24px;height:24px;border-radius:6px;background:${INK};color:#fff;display:grid;place-items:center;font-size:12px;font-weight:700;">${esc(markLetter)}</div>
      <div style="font-size:14.5px;font-weight:650;letter-spacing:-0.01em;">${esc(brand)}</div>
    </div>
    <div class="mono" style="font-size:10.5px;font-weight:500;letter-spacing:0.09em;text-transform:uppercase;color:${INK_4};">7-Day Gap Audit · Confidential</div>
  </div>

  <!-- Title / verdict -->
  <div style="padding:44px 52px 36px;">
    <div class="mono" style="font-size:11px;font-weight:500;letter-spacing:0.09em;text-transform:uppercase;color:${INK_4};margin-bottom:16px;">
      ${esc(report.store.name)} · ${esc(storeLabel)} · ${esc(windowLabel)}${report.auditStatus === "running" ? " · audit in progress" : ""}
    </div>
    <h1 style="margin:0 0 14px;font-size:30px;line-height:1.18;font-weight:600;letter-spacing:-0.025em;">${verdict(report, provider, noun)}</h1>
    <p style="margin:0;font-size:15.5px;line-height:1.5;color:${INK_2};max-width:600px;">${subline(report, provider, noun)}</p>
  </div>

  <!-- Stat tiles -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1.2fr;gap:10px;padding:0 52px 40px;">
    ${statTile(`${provider} ${noun}`, t.providerEvents.toLocaleString(), "ground truth · API")}
    ${statTile("Webhooks delivered", t.webhooksDelivered.toLocaleString(), "recorded at our endpoint")}
    ${statTile("Missed events", missed.toLocaleString(), `${t.gapsConfirmed} confirmed · ${t.gapsUnconfirmed} unconfirmed`)}
    ${statTile("Revenue at risk", fmtMoney(t.confirmedAmountCents), `${noun} value never delivered`, true)}
  </div>

  ${gapsSection(report, provider)}
  ${findingsSection(report.findings)}

  <!-- Methodology -->
  <div style="padding:28px 52px 0;">
    <div style="border-top:1px solid ${LINE};padding-top:22px;">
      <div class="mono" style="font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${INK_4};margin-bottom:8px;">How to read this report</div>
      <p style="margin:0;font-size:12.5px;line-height:1.6;color:${INK_3};max-width:640px;">
        Ground truth is your ${esc(provider)} API, polled read-only — we never touch your existing webhook flow. An additional
        subscription records what the provider actually fires; the diff, keyed by provider event ID, is the gap list. An event is
        flagged only after the provider's documented maturity window, and every gap is double-checked against the delivery log.
        When we cannot be certain, we say <em>unconfirmed</em> — never <em>lost</em>.
        ${t.pollsRun > 0 ? `Based on ${t.pollsRun.toLocaleString()} reconciliation polls this window.` : ""}
      </p>
    </div>
  </div>

  <!-- CTA band -->
  <div style="margin:28px 52px 0;background:${INK};border-radius:10px;padding:26px 28px;display:flex;align-items:center;justify-content:space-between;gap:24px;">
    <div>
      <div style="font-size:16px;font-weight:650;color:#fff;letter-spacing:-0.015em;">Turn this on continuously.</div>
      <p style="margin:5px 0 0;font-size:12.5px;line-height:1.5;color:#b9bdc7;max-width:460px;">Revenue Assurance reconciles every 5 minutes and recovers gaps automatically — $29/store/month.</p>
    </div>
    <div style="background:#fff;color:${INK};border-radius:999px;padding:10px 20px;font-size:13px;font-weight:600;white-space:nowrap;flex-shrink:0;">Start monitoring — $29/mo</div>
  </div>

  <!-- Footer -->
  <div style="display:flex;justify-content:space-between;align-items:center;padding:22px 52px 26px;margin-top:8px;font-size:11.5px;color:${INK_4};">
    <div>${esc(brand)} · continuous webhook reconciliation</div>
    <div>Generated ${esc(fmtDateTime(report.generatedAt))} · <span class="mono">report v${report.version}</span></div>
  </div>

</div>
</body>
</html>`;
}

function verdict(report: GapReportData, provider: string, noun: string): string {
  const t = report.totals;
  if (t.gapsConfirmed + t.gapsUnconfirmed === 0) {
    return `Every ${esc(noun.replace(/s$/, ""))} ${provider} created reached your systems.`;
  }
  return `${esc(provider)} created ${t.providerEvents.toLocaleString()} ${esc(noun)}.<br>It told your systems about ${t.webhooksDelivered.toLocaleString()}.`;
}

function subline(report: GapReportData, provider: string, noun: string): string {
  const t = report.totals;
  const missed = t.gapsConfirmed + t.gapsUnconfirmed;
  if (missed === 0) {
    return `Every event we could verify against ${esc(provider)}'s API arrived at your endpoint within the maturity window — no gaps, no silent drops.`;
  }
  const tail =
    t.gapsUnconfirmed > 0
      ? ` ${t.gapsUnconfirmed} more ${t.gapsUnconfirmed === 1 ? "is" : "are"} still inside the verification window (${fmtMoney(t.unconfirmedAmountCents)}), listed below and never counted as lost.`
      : "";
  return `${missed} ${missed === 1 ? "event was" : "events were"} never delivered to your endpoint — ${esc(noun)} worth <strong class="money">${fmtMoney(t.confirmedAmountCents)}</strong> that your fulfillment, email, and analytics never saw. None of them appear as failures in your ${esc(provider)} delivery logs.${tail}`;
}

function statTile(label: string, value: string, sub: string, warm = false): string {
  const labelColor = warm ? WARM_DEEP : INK_4;
  const valueColor = warm ? WARM : INK;
  return `<div style="border:1px solid ${warm ? WARM_BORDER : LINE};${warm ? `background:${WARM_BG};` : ""}border-radius:8px;padding:16px 18px;">
    <div class="mono" style="font-size:10px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:${labelColor};">${esc(label)}</div>
    <div class="num" style="font-size:26px;font-weight:${warm ? 650 : 600};letter-spacing:-0.02em;margin-top:8px;color:${valueColor};">${value}</div>
    <div style="font-size:11.5px;color:${warm ? WARM_DEEP : INK_4};margin-top:3px;">${esc(sub)}</div>
  </div>`;
}

function gapsSection(report: GapReportData, provider: string): string {
  if (report.gaps.length === 0) return "";
  const cols = "110px 130px 1fr 130px 110px";
  const rows = report.gaps
    .map(
      (g: GapRow) => `<div style="display:grid;grid-template-columns:${cols};gap:12px;align-items:center;padding:10px 18px;border-bottom:1px solid ${LINE_2};font-size:13px;">
      <div class="mono" style="font-size:12px;font-weight:500;">${esc(g.providerEventId)}</div>
      <div style="color:${INK_3};">${esc(fmtDateTime(g.occurredAt))}</div>
      <div class="mono" style="font-size:11.5px;color:${INK_2};">${esc(g.eventType)}</div>
      <div>${classBadge(g.classification)}</div>
      <div class="num" style="text-align:right;font-weight:600;color:${g.classification === "confirmed" ? WARM : WARM_DEEP};">${g.amountCents > 0 ? fmtMoney(g.amountCents) : `<span style="color:${INK_4};font-weight:400;">—</span>`}</div>
    </div>`
    )
    .join("\n");

  const totalGaps = report.totals.gapsConfirmed + report.totals.gapsUnconfirmed + report.totals.lateDeliveries;
  const remaining = Math.max(0, totalGaps - report.gaps.length);
  const moreRow =
    remaining > 0
      ? `<div style="padding:10px 18px;font-size:12.5px;color:${INK_4};background:${SUBTLE};">… ${remaining} more event${remaining === 1 ? "" : "s"} in the full export (CSV attached)</div>`
      : "";

  return `<div style="padding:0 52px 14px;">
    <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px;">
      <h2 style="margin:0;font-size:16px;font-weight:650;letter-spacing:-0.015em;">What ${esc(provider)} never delivered</h2>
      <div class="mono" style="font-size:10.5px;color:${INK_4};">matched by provider_event_id</div>
    </div>
    <div style="border:1px solid ${LINE};border-radius:8px;overflow:hidden;">
      <div class="mono" style="display:grid;grid-template-columns:${cols};gap:12px;padding:9px 18px;background:${PANEL};border-bottom:1px solid ${LINE};font-size:10px;font-weight:500;letter-spacing:0.07em;text-transform:uppercase;color:${INK_4};">
        <div>Event</div><div>Occurred</div><div>Type</div><div>Status</div><div style="text-align:right;">Value</div>
      </div>
      ${rows}
      ${moreRow}
    </div>
  </div>`;
}

function classBadge(c: GapRow["classification"]): string {
  if (c === "confirmed") {
    return `<span style="display:inline-flex;align-items:center;background:${INK};color:#fff;border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:550;">confirmed</span>`;
  }
  if (c === "late") {
    return `<span style="display:inline-flex;align-items:center;border:1px solid #c8e4f6;color:${SKY};border-radius:999px;padding:1px 9px;font-size:10.5px;font-weight:550;">arrived late</span>`;
  }
  return `<span style="display:inline-flex;align-items:center;border:1px solid ${LINE_3};color:${INK_3};border-radius:999px;padding:1px 9px;font-size:10.5px;font-weight:550;">unconfirmed</span>`;
}

function findingsSection(findings: Finding[]): string {
  if (findings.length === 0) return "";
  const sev: Record<Finding["severity"], { label: string; bg: string; fg: string }> = {
    critical: { label: "HIGH", bg: RED, fg: "#fff" },
    warning: { label: "MEDIUM", bg: WARM_DEEP, fg: "#fff" },
    info: { label: "INFO", bg: LINE, fg: INK_2 },
  };
  const items = findings
    .map((f) => {
      const s = sev[f.severity];
      return `<div style="display:grid;grid-template-columns:88px 1fr;gap:16px;border:1px solid ${LINE};border-radius:8px;padding:16px 18px;">
        <div><span class="mono" style="display:inline-block;font-size:10px;font-weight:600;letter-spacing:0.07em;background:${s.bg};color:${s.fg};border-radius:4px;padding:3px 8px;">${s.label}</span></div>
        <div>
          <div style="font-size:13.5px;font-weight:600;">${esc(f.title)}</div>
          <p style="margin:4px 0 0;font-size:12.5px;line-height:1.5;color:${INK_3};">${esc(f.detail)}</p>
        </div>
      </div>`;
    })
    .join("\n");

  return `<div style="padding:30px 52px 8px;">
    <h2 style="margin:0 0 14px;font-size:16px;font-weight:650;letter-spacing:-0.015em;">Subscription health findings</h2>
    <div style="display:flex;flex-direction:column;gap:10px;">${items}</div>
  </div>`;
}

function providerLabel(p: GapReportData["provider"]): string {
  return p === "shopify" ? "Shopify" : p === "stripe" ? "Stripe" : "GitHub";
}

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(iso: string): string {
  return (
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }) + " UTC"
  );
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
