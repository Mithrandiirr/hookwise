import type { AIDiagnosis } from "./types";

interface AlertPayload {
  anomalyId: string;
  integrationName: string;
  provider: string;
  anomalyType: string;
  severity: string;
  diagnosis: AIDiagnosis;
  dashboardUrl: string;
}

export async function sendEmailAlert(
  destination: string,
  payload: AlertPayload
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[HookWise Alert] RESEND_API_KEY not configured, skipping email alert");
    return false;
  }

  const severityEmoji: Record<string, string> = {
    critical: "[CRITICAL]",
    high: "[HIGH]",
    medium: "[MEDIUM]",
    low: "[LOW]",
  };

  const subject = `${severityEmoji[payload.severity] ?? ""} HookWise: ${payload.anomalyType.replace(/_/g, " ")} on ${payload.integrationName}`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1a1a2e;">Anomaly Detected</h2>
  <p><strong>Integration:</strong> ${payload.integrationName} (${payload.provider})</p>
  <p><strong>Type:</strong> ${payload.anomalyType.replace(/_/g, " ")}</p>
  <p><strong>Severity:</strong> ${payload.severity.toUpperCase()}</p>
  <hr style="border: 1px solid #eee;" />
  <h3>What happened</h3>
  <p>${payload.diagnosis.what}</p>
  <h3>Why</h3>
  <p>${payload.diagnosis.why}</p>
  <h3>Impact</h3>
  <p>${payload.diagnosis.impact}</p>
  <h3>Recommendation</h3>
  <p>${payload.diagnosis.recommendation}</p>
  ${payload.diagnosis.crossCorrelation ? `<h3>Cross-correlation</h3><p>${payload.diagnosis.crossCorrelation}</p>` : ""}
  ${payload.diagnosis.predictedResolution ? `<h3>Predicted Resolution</h3><p>${payload.diagnosis.predictedResolution}</p>` : ""}
  ${payload.diagnosis.severityAssessment?.revenueAtRisk ? `<h3>Revenue at Risk</h3><p>$${(payload.diagnosis.severityAssessment.revenueAtRisk / 100).toFixed(2)}</p>` : ""}
  ${payload.diagnosis.evidence.length > 0 ? `<h3>Investigation</h3><p>AI investigated using ${payload.diagnosis.evidence.length} data sources before diagnosing. Confidence: ${(payload.diagnosis.confidence * 100).toFixed(0)}%</p>` : ""}
  ${payload.diagnosis.remediationActions.length > 0 ? `<h3>Suggested Actions</h3><ul>${payload.diagnosis.remediationActions.map((a) => `<li>${a.type.replace(/_/g, " ")}: ${a.reason}</li>`).join("")}</ul>` : ""}
  ${payload.diagnosis.similarIncidents.length > 0 ? `<p><em>This pattern has occurred ${payload.diagnosis.similarIncidents.length} time(s) before.</em></p>` : ""}
  <hr style="border: 1px solid #eee;" />
  <p><a href="${payload.dashboardUrl}" style="color: #6366f1;">View in dashboard</a></p>
</div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HookWise <alerts@hookwise.dev>",
        to: [destination],
        subject,
        html,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("[HookWise Alert] Email send failed:", error);
    return false;
  }
}

export async function sendSlackAlert(
  webhookUrl: string,
  payload: AlertPayload
): Promise<boolean> {
  const severityColor: Record<string, string> = {
    critical: "#dc2626",
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#6b7280",
  };

  const body = {
    attachments: [
      {
        color: severityColor[payload.severity] ?? "#6b7280",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `Anomaly: ${payload.anomalyType.replace(/_/g, " ")}`,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Integration:*\n${payload.integrationName} (${payload.provider})`,
              },
              {
                type: "mrkdwn",
                text: `*Severity:*\n${payload.severity.toUpperCase()}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*What:* ${payload.diagnosis.what}\n\n*Why:* ${payload.diagnosis.why}\n\n*Impact:* ${payload.diagnosis.impact}\n\n*Recommendation:* ${payload.diagnosis.recommendation}`,
            },
          },
          ...(payload.diagnosis.evidence.length > 0
            ? [
                {
                  type: "context" as const,
                  elements: [
                    {
                      type: "mrkdwn" as const,
                      text: `Investigated ${payload.diagnosis.evidence.length} data sources | Confidence: ${(payload.diagnosis.confidence * 100).toFixed(0)}%${payload.diagnosis.similarIncidents.length > 0 ? ` | ${payload.diagnosis.similarIncidents.length} similar past incidents` : ""}${payload.diagnosis.severityAssessment?.revenueAtRisk ? ` | $${(payload.diagnosis.severityAssessment.revenueAtRisk / 100).toFixed(2)} at risk` : ""}`,
                    },
                  ],
                },
              ]
            : []),
          ...(payload.diagnosis.remediationActions.length > 0
            ? [
                {
                  type: "section" as const,
                  text: {
                    type: "mrkdwn" as const,
                    text: `*Suggested actions:*\n${payload.diagnosis.remediationActions.map((a) => `- ${a.type.replace(/_/g, " ")}: ${a.reason}`).join("\n")}`,
                  },
                },
              ]
            : []),
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "View in Dashboard" },
                url: payload.dashboardUrl,
              },
            ],
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch (error) {
    console.error("[HookWise Alert] Slack send failed:", error);
    return false;
  }
}
