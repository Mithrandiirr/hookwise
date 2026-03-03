import crypto from "crypto";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { AuditAction } from "@/types";

interface LogAuditEventParams {
  userId: string;
  integrationId?: string | null;
  eventId?: string | null;
  action: AuditAction;
  details: Record<string, unknown>;
}

async function getLatestHash(userId: string): Promise<string> {
  const [latest] = await db
    .select({ integrityHash: auditLog.integrityHash })
    .from(auditLog)
    .where(eq(auditLog.userId, userId))
    .orderBy(desc(auditLog.createdAt))
    .limit(1);

  return latest?.integrityHash ?? "";
}

function computeHash(action: string, details: string, previousHash: string): string {
  return crypto
    .createHash("sha256")
    .update(action + details + previousHash)
    .digest("hex");
}

export async function logAuditEvent(params: LogAuditEventParams): Promise<void> {
  try {
    const previousHash = await getLatestHash(params.userId);
    const detailsJson = JSON.stringify(params.details);
    const integrityHash = computeHash(params.action, detailsJson, previousHash);

    await db.insert(auditLog).values({
      userId: params.userId,
      integrationId: params.integrationId ?? null,
      eventId: params.eventId ?? null,
      action: params.action,
      details: params.details,
      integrityHash,
    });
  } catch (err) {
    console.error("[audit] Failed to log audit event:", err);
    // Fire-and-forget: never throw
  }
}

interface VerifyResult {
  valid: boolean;
  checked: number;
  firstBrokenId?: string;
}

export async function verifyAuditChain(
  userId: string,
  limit: number = 1000
): Promise<VerifyResult> {
  const entries = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.userId, userId))
    .orderBy(auditLog.createdAt)
    .limit(limit);

  let previousHash = "";

  for (const entry of entries) {
    const detailsJson = JSON.stringify(entry.details);
    const expected = computeHash(entry.action, detailsJson, previousHash);

    if (expected !== entry.integrityHash) {
      return { valid: false, checked: entries.indexOf(entry) + 1, firstBrokenId: entry.id };
    }

    previousHash = entry.integrityHash;
  }

  return { valid: true, checked: entries.length };
}
