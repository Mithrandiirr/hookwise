export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { auditLog, complianceExports, integrations, securityScans } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { ComplianceClient } from "./compliance-client";

export default async function CompliancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [recentAuditEntries, recentExports, userIntegrations, auditCount, scanCount] =
    await Promise.all([
      db
        .select()
        .from(auditLog)
        .where(eq(auditLog.userId, user!.id))
        .orderBy(desc(auditLog.createdAt))
        .limit(50),
      db
        .select()
        .from(complianceExports)
        .where(eq(complianceExports.userId, user!.id))
        .orderBy(desc(complianceExports.createdAt))
        .limit(10),
      db
        .select({ id: integrations.id, name: integrations.name })
        .from(integrations)
        .where(eq(integrations.userId, user!.id)),
      db
        .select({ count: count() })
        .from(auditLog)
        .where(eq(auditLog.userId, user!.id)),
      db.select({ count: count() }).from(securityScans),
    ]);

  const integrationMap = Object.fromEntries(
    userIntegrations.map((i) => [i.id, i.name])
  );

  const complianceStatus = {
    auditLogEnabled: auditCount[0].count > 0,
    integrityHashingEnabled: recentAuditEntries.length > 0 && recentAuditEntries.every((e) => !!e.integrityHash),
    exportCapability: true,
    dataRetentionConfigured: true,
    securityScanningEnabled: scanCount[0].count > 0,
  };

  return (
    <ComplianceClient
      auditEntries={recentAuditEntries}
      exports={recentExports}
      integrationMap={integrationMap}
      complianceStatus={complianceStatus}
    />
  );
}
