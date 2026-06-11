// Audit-mode lifecycle for the 7-Day Gap Audit.
//
// An audit-mode integration records what the provider fires and reconciles against the
// provider's API truth, but NEVER delivers to the customer endpoint — zero risk, zero
// infra change, we are never in the critical path.

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { audits, integrations, type Audit } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

export { classifyGap, type GapClassification, type GapInput } from "./classify";
export {
  MATURITY_WINDOW_MS,
  maturityCutoff,
  maturityWindowMs,
  isMature,
} from "./maturity";

export const AUDIT_DURATION_DAYS = 7;

export function isAuditMode(integration: { mode: string }): boolean {
  return integration.mode === "audit";
}

export async function createAudit(params: {
  integrationId: string;
  brandName?: string | null;
  desiredProvider?: string | null;
}): Promise<Audit> {
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + AUDIT_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const [audit] = await db
    .insert(audits)
    .values({
      integrationId: params.integrationId,
      status: "running",
      startedAt,
      endsAt,
      shareToken: randomBytes(24).toString("base64url"),
      brandName: params.brandName ?? null,
      desiredProvider: params.desiredProvider ?? null,
    })
    .returning();

  return audit;
}

export async function getActiveAudit(integrationId: string): Promise<Audit | null> {
  const [audit] = await db
    .select()
    .from(audits)
    .where(and(eq(audits.integrationId, integrationId), eq(audits.status, "running")))
    .orderBy(desc(audits.startedAt))
    .limit(1);
  return audit ?? null;
}

export async function getLatestAudit(integrationId: string): Promise<Audit | null> {
  const [audit] = await db
    .select()
    .from(audits)
    .where(eq(audits.integrationId, integrationId))
    .orderBy(desc(audits.startedAt))
    .limit(1);
  return audit ?? null;
}

export async function getAuditByShareToken(shareToken: string): Promise<Audit | null> {
  const [audit] = await db
    .select()
    .from(audits)
    .where(eq(audits.shareToken, shareToken))
    .limit(1);
  return audit ?? null;
}

export interface AuditProgress {
  /** 1-based day of the audit window, clamped to [1, AUDIT_DURATION_DAYS]. */
  day: number;
  totalDays: number;
  /** 0..1 share of the window elapsed. */
  fraction: number;
  expired: boolean;
}

export function auditProgress(audit: Audit, now: Date = new Date()): AuditProgress {
  const total = audit.endsAt.getTime() - audit.startedAt.getTime();
  const elapsed = now.getTime() - audit.startedAt.getTime();
  const fraction = total > 0 ? Math.min(Math.max(elapsed / total, 0), 1) : 1;
  return {
    day: Math.min(Math.max(Math.ceil(fraction * AUDIT_DURATION_DAYS), 1), AUDIT_DURATION_DAYS),
    totalDays: AUDIT_DURATION_DAYS,
    fraction,
    expired: now.getTime() >= audit.endsAt.getTime(),
  };
}

/** Marks a running audit complete once its window has elapsed. Idempotent. */
export async function completeIfExpired(audit: Audit, now: Date = new Date()): Promise<Audit> {
  if (audit.status === "running" && now.getTime() >= audit.endsAt.getTime()) {
    const [updated] = await db
      .update(audits)
      .set({ status: "complete" })
      .where(eq(audits.id, audit.id))
      .returning();
    return updated ?? { ...audit, status: "complete" };
  }
  return audit;
}

/** The audit-eligible integration owned by this user, if any. */
export async function getAuditIntegrationForUser(userId: string) {
  const rows = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, userId))
    .orderBy(desc(integrations.createdAt));
  return rows[0] ?? null;
}
