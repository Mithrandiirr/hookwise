// Standalone HTML render of the Gap Report — shareable link and print-to-PDF surface.
// Design rule: sky blue everywhere; orange exclusively for dollar amounts.

import type { Finding, GapReportData, GapRow } from "./types";

const SKY = "#38bdf8";
const ORANGE = "#f97316";
const INK = "#0f172a";
const INK_2 = "#475569";
const INK_3 = "#94a3b8";
const LINE = "#e2e8f0";
const BG = "#f8fafc";

export function renderGapReportHtml(report: GapReportData): string {
  const brand = report.brandName?.trim() || "HookWise";
  const t = report.totals;
  const storeLabel = report.store.domain ?? report.store.name;
  const windowLabel = `${fmtDate(report.window.start)} – ${fmtDate(report.window.end)} (${report.window.days} day${report.window.days === 1 ? "" : "s"})`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${esc(brand)} — 7-Day Gap Audit · ${esc(storeLabel)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: ${BG}; color: ${INK}; line-height: 1.55; }
  .page { max-width: 880px; margin: 0 auto; padding: 48px 32px 64px; }
  .card { background: #fff; border: 1px solid ${LINE}; border-radius: 12px; }
  .mono { font-family: ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace; }
  .money { color: ${ORANGE}; font-weight: 600; }
  .eyebrow { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: ${SKY}; font-weight: 700; }
  h1 { font-size: 28px; letter-spacing: -0.02em; margin: 10px 0 4px; }
  .sub { color: ${INK_2}; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: ${INK_3}; font-weight: 600; padding: 10px 14px; border-bottom: 1px solid ${LINE}; }
  td { padding: 10px 14px; border-bottom: 1px solid ${LINE}; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .num { text-align: right; }
  @media print { body { background: #fff; } .page { padding: 0; } .card { border: 1px solid #ddd; break-inside: avoid; } }
</style>
</head>
<body>
<div class="page">

  <header style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;">
    <div>
      <span class="eyebrow">${esc(brand)} · 7-Day Gap Audit</span>
      <h1>${esc(storeLabel)}</h1>
      <p class="sub">${esc(providerLabel(report.provider))} · ${esc(windowLabel)}${report.auditStatus === "running" ? " · audit in progress" : ""}</p>
    </div>
    <div class="mono" style="font-size:11px;color:${INK_3};text-align:right;">
      Generated ${esc(fmtDateTime(report.generatedAt))}<br/>
      ${t.pollsRun.toLocaleString()} reconciliation polls · every 5 minutes
    </div>
  </header>

  <section class="card" style="padding:28px;margin-bottom:20px;">
    <p style="font-size:17px;max-width:640px;">
      ${esc(providerLabel(report.provider))} recorded
      <strong>${t.providerEvents.toLocaleString()}</strong> events in this window.
      Webhooks fired for <strong>${t.webhooksDelivered.toLocaleString()}</strong>.
      ${headline(report)}
    </p>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:24px;">
      ${statTile("Provider events (truth)", t.providerEvents.toLocaleString(), INK)}
      ${statTile("Webhooks delivered", t.webhooksDelivered.toLocaleString(), SKY)}
      ${statTile("Confirmed gaps", t.gapsConfirmed.toLocaleString(), t.gapsConfirmed > 0 ? INK : INK_3)}
      ${statTile("Confirmed value", fmtMoney(t.confirmedAmountCents), t.confirmedAmountCents > 0 ? ORANGE : INK_3)}
    </div>
    ${
      t.gapsUnconfirmed > 0
        ? `<p class="sub" style="margin-top:16px;font-size:12.5px;">+ ${t.gapsUnconfirmed} unconfirmed gap${t.gapsUnconfirmed === 1 ? "" : "s"} (${fmtMoney(t.unconfirmedAmountCents)}) still inside the verification window — listed below, never counted as lost.</p>`
        : ""
    }
  </section>

  ${gapsSection(report)}
  ${findingsSection(report.findings)}

  <section class="card" style="padding:22px 28px;margin-bottom:20px;">
    <span class="eyebrow" style="color:${INK_3};">Method</span>
    <p class="sub" style="margin-top:8px;font-size:13px;">
      An additional webhook subscription (${esc(providerLabel(report.provider))} allows multiple per topic — your existing
      flow is untouched) records what the provider actually fires. A read-only API poll every 5 minutes establishes
      ground truth. The diff, keyed by provider event ID, is the gap list. Events younger than the provider's
      documented latency window are never flagged; when in doubt, a gap is labeled unconfirmed rather than lost.
    </p>
  </section>

  <footer style="display:flex;justify-content:space-between;align-items:center;color:${INK_3};font-size:12px;">
    <span>${esc(brand)} · continuous webhook reconciliation</span>
    <span class="mono">report v${report.version}</span>
  </footer>

</div>
</body>
</html>`;
}

function headline(report: GapReportData): string {
  const t = report.totals;
  if (t.gapsConfirmed > 0) {
    return `Here ${t.gapsConfirmed === 1 ? "is the one" : `are the ${t.gapsConfirmed.toLocaleString()}`} it never told you about — worth <span class="money">${fmtMoney(t.confirmedAmountCents)}</span>.`;
  }
  if (t.gapsUnconfirmed > 0) {
    return `${t.gapsUnconfirmed.toLocaleString()} potential gap${t.gapsUnconfirmed === 1 ? "" : "s"} ${t.gapsUnconfirmed === 1 ? "is" : "are"} still being verified.`;
  }
  return "Every event we could verify was delivered.";
}

function statTile(label: string, value: string, color: string): string {
  return `<div style="border:1px solid ${LINE};border-radius:10px;padding:14px 16px;">
    <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:0.08em;color:${INK_3};font-weight:600;">${esc(label)}</div>
    <div style="font-size:24px;font-weight:600;letter-spacing:-0.02em;color:${color};margin-top:4px;">${value}</div>
  </div>`;
}

function gapsSection(report: GapReportData): string {
  if (report.gaps.length === 0) return "";
  const rows = report.gaps
    .map(
      (g: GapRow) => `<tr>
      <td class="mono" style="font-size:12px;color:${INK_2};">${esc(g.providerEventId)}</td>
      <td>${esc(g.eventType)}</td>
      <td class="mono" style="font-size:12px;color:${INK_2};">${esc(fmtDateTime(g.occurredAt))}</td>
      <td>${classBadge(g.classification)}</td>
      <td class="num">${g.amountCents > 0 ? `<span class="money">${fmtMoney(g.amountCents)}</span>` : `<span style="color:${INK_3};">—</span>`}</td>
    </tr>`
    )
    .join("\n");

  return `<section class="card" style="margin-bottom:20px;overflow:hidden;">
    <div style="padding:18px 28px;border-bottom:1px solid ${LINE};">
      <span class="eyebrow">Gaps — events the provider never delivered</span>
    </div>
    <table>
      <thead><tr><th>Provider event</th><th>Type</th><th>Occurred</th><th>Status</th><th class="num">Value</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function classBadge(c: GapRow["classification"]): string {
  const map: Record<GapRow["classification"], [string, string]> = {
    confirmed: ["confirmed lost", INK],
    unconfirmed: ["unconfirmed", INK_3],
    late: ["arrived late", SKY],
  };
  const [label, color] = map[c];
  return `<span class="mono" style="font-size:11px;color:${color};border:1px solid ${LINE};border-radius:999px;padding:2px 8px;">${label}</span>`;
}

function findingsSection(findings: Finding[]): string {
  if (findings.length === 0) return "";
  const sevColor: Record<Finding["severity"], string> = {
    critical: "#dc2626",
    warning: "#d97706",
    info: SKY,
  };
  const items = findings
    .map(
      (f) => `<div style="padding:16px 28px;border-bottom:1px solid ${LINE};">
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="mono" style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:${sevColor[f.severity]};font-weight:700;">${f.severity}</span>
        <strong style="font-size:14px;">${esc(f.title)}</strong>
      </div>
      <p class="sub" style="margin-top:6px;font-size:13px;">${esc(f.detail)}</p>
    </div>`
    )
    .join("\n");

  return `<section class="card" style="margin-bottom:20px;overflow:hidden;">
    <div style="padding:18px 28px;border-bottom:1px solid ${LINE};">
      <span class="eyebrow">Subscription health</span>
    </div>
    ${items}
  </section>`;
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
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }) + " UTC";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
