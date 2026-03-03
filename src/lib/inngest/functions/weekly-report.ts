import { inngest } from "../client";
import { db } from "@/lib/db";
import { integrations, intelligenceReports } from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";
import { generateWeeklyReport } from "@/lib/ai/weekly-report";
import type { WeeklyReportData } from "@/lib/ai/weekly-report";

export const weeklyReport = inngest.createFunction(
  {
    id: "weekly-intelligence-report",
    name: "Weekly Intelligence Report",
    retries: 2,
  },
  { cron: "0 9 * * 1" }, // Monday 9 AM UTC
  async ({ step }) => {
    // Find all distinct users with integrations
    const users = await step.run("get-users", async () => {
      const result = await db
        .selectDistinct({ userId: integrations.userId })
        .from(integrations);
      return result;
    });

    if (users.length === 0) {
      return { processed: 0 };
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setHours(0, 0, 0, 0);
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 7);

    let processed = 0;

    for (const { userId } of users) {
      await step.run(`generate-report-${userId.slice(0, 8)}`, async () => {
        const report = await generateWeeklyReport(userId, periodStart, periodEnd);

        // Store report in DB
        const [stored] = await db
          .insert(intelligenceReports)
          .values({
            userId,
            periodStart,
            periodEnd,
            report: report as unknown as Record<string, unknown>,
          })
          .returning({ id: intelligenceReports.id });

        // Send email
        const emailSent = await sendReportEmail(userId, report);

        if (emailSent) {
          await db
            .update(intelligenceReports)
            .set({ sentAt: new Date() })
            .where(eq(intelligenceReports.id, stored.id));
        }

        return { reportId: stored.id, emailSent };
      });

      processed++;
    }

    return { processed };
  }
);

async function sendReportEmail(
  userId: string,
  report: WeeklyReportData
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[HookWise Report] RESEND_API_KEY not configured, skipping email");
    return false;
  }

  // Get user email from Supabase auth
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: user } = await supabase.auth.admin.getUserById(userId);
  if (!user?.user?.email) {
    console.warn("[HookWise Report] No email for user", userId);
    return false;
  }

  const formatDollars = (cents: number) =>
    `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

  const startStr = report.periodStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = report.periodEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const integrationRows = report.perIntegration
    .map(
      (i) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${i.integrationName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${i.provider}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${i.events.toLocaleString()}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${i.successRate.toFixed(1)}%</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatDollars(i.revenueCents)}</td>
    </tr>`
    )
    .join("");

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 640px; margin: 0 auto;">
  <h2 style="color: #1a1a2e;">Weekly Intelligence Report</h2>
  <p style="color: #666;">${startStr} — ${endStr}</p>

  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 12px; background: #f8f9fa; border-radius: 8px;">
        <strong>Events</strong><br/>${report.totalEvents.toLocaleString()}
      </td>
      <td style="padding: 12px; background: #f8f9fa; border-radius: 8px;">
        <strong>Success Rate</strong><br/>${report.successRate.toFixed(1)}%
      </td>
      <td style="padding: 12px; background: #f8f9fa; border-radius: 8px;">
        <strong>Revenue Protected</strong><br/>${formatDollars(report.revenueProtectedCents)}
      </td>
    </tr>
  </table>

  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 12px; background: #f8f9fa; border-radius: 8px;">
        <strong>Anomalies</strong><br/>${report.anomalies.total}
      </td>
      <td style="padding: 12px; background: #f8f9fa; border-radius: 8px;">
        <strong>Replayed</strong><br/>${report.replay.delivered}
      </td>
      <td style="padding: 12px; background: #f8f9fa; border-radius: 8px;">
        <strong>Gaps Reconciled</strong><br/>${report.reconciliation.gapsResolved}
      </td>
    </tr>
  </table>

  ${
    report.perIntegration.length > 0
      ? `
  <h3 style="color: #1a1a2e;">Per Integration</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background: #f8f9fa;">
        <th style="padding: 8px; text-align: left;">Name</th>
        <th style="padding: 8px; text-align: left;">Provider</th>
        <th style="padding: 8px; text-align: right;">Events</th>
        <th style="padding: 8px; text-align: right;">Success</th>
        <th style="padding: 8px; text-align: right;">Revenue</th>
      </tr>
    </thead>
    <tbody>${integrationRows}</tbody>
  </table>`
      : ""
  }

  <hr style="border: 1px solid #eee; margin: 24px 0;" />
  <p style="color: #999; font-size: 12px;">
    This report was automatically generated by HookWise.
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hookwise.dev"}/dashboard" style="color: #6366f1;">View Dashboard</a>
  </p>
</div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HookWise <reports@hookwise.dev>",
        to: [user.user.email],
        subject: `HookWise Weekly Report: ${startStr} — ${endStr}`,
        html,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("[HookWise Report] Email send failed:", error);
    return false;
  }
}
