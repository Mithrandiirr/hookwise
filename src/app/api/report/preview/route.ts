// Sample Gap Report — design preview only (no DB, no auth). Mirrors the Brightloom
// example in .design/Gap Report. View at /api/report/preview (?brand= to relabel).

import { NextRequest, NextResponse } from "next/server";
import { renderGapReportHtml } from "@/lib/report";
import type { GapReportData } from "@/lib/report";

const SAMPLE: GapReportData = {
  version: 1,
  generatedAt: "2026-06-09T17:00:00.000Z",
  provider: "shopify",
  store: { name: "Brightloom Goods", domain: "brightloom.myshopify.com" },
  window: { start: "2026-06-02", end: "2026-06-09", days: 7 },
  auditStatus: "complete",
  brandName: null,
  totals: {
    providerEvents: 4312,
    webhooksDelivered: 4297,
    gapsConfirmed: 12,
    gapsUnconfirmed: 3,
    lateDeliveries: 0,
    confirmedAmountCents: 284018,
    unconfirmedAmountCents: 9850,
    pollsRun: 2016,
  },
  gaps: [
    { providerEventId: "#45-2381", eventType: "orders/create", occurredAt: "2026-06-04T09:12:00Z", recoveredAt: "2026-06-04T09:20:00Z", amountCents: 21450, classification: "confirmed" },
    { providerEventId: "#45-2386", eventType: "orders/create", occurredAt: "2026-06-04T09:14:00Z", recoveredAt: "2026-06-04T09:20:00Z", amountCents: 8900, classification: "confirmed" },
    { providerEventId: "#45-2402", eventType: "orders/create", occurredAt: "2026-06-04T09:31:00Z", recoveredAt: "2026-06-04T09:40:00Z", amountCents: 41295, classification: "confirmed" },
    { providerEventId: "#45-2417", eventType: "orders/create", occurredAt: "2026-06-04T10:02:00Z", recoveredAt: "2026-06-04T10:10:00Z", amountCents: 15620, classification: "confirmed" },
    { providerEventId: "#46-0118", eventType: "orders/paid", occurredAt: "2026-06-06T22:47:00Z", recoveredAt: "2026-06-06T22:55:00Z", amountCents: 73840, classification: "confirmed" },
    { providerEventId: "#46-0124", eventType: "orders/create", occurredAt: "2026-06-06T23:05:00Z", recoveredAt: "2026-06-06T23:12:00Z", amountCents: 6499, classification: "confirmed" },
    { providerEventId: "#46-0131", eventType: "orders/create", occurredAt: "2026-06-06T23:18:00Z", recoveredAt: "2026-06-06T23:26:00Z", amountCents: 32775, classification: "confirmed" },
    { providerEventId: "#46-0140", eventType: "orders/create", occurredAt: "2026-06-06T23:41:00Z", recoveredAt: "2026-06-06T23:49:00Z", amountCents: 9850, classification: "unconfirmed" },
  ],
  findings: [
    {
      severity: "critical",
      title: "orders/updated subscription is degrading",
      detail:
        "p95 endpoint response 4.8s · 19 delivery failures this week. Shopify silently auto-removes subscriptions that keep failing — this one is on that path. No notification is sent when it happens.",
    },
    {
      severity: "warning",
      title: "API version fall-forward risk",
      detail:
        "Your subscriptions are pinned to 2025-10; the store now serves 2026-04. When 2025-10 is retired, payload shapes change without warning.",
    },
    {
      severity: "info",
      title: "orders/create endpoint is healthy",
      detail: "99.7% 2xx · p95 response 312ms. The gaps above were not caused by your endpoint.",
    },
  ],
};

export async function GET(request: NextRequest) {
  const brand = new URL(request.url).searchParams.get("brand")?.trim();
  const report: GapReportData = brand ? { ...SAMPLE, brandName: brand.slice(0, 80) } : SAMPLE;
  return new NextResponse(renderGapReportHtml(report), {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
