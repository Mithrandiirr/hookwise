import { Command } from "commander";
import { requireConfig } from "../config";

interface EventRow {
  id: string;
  eventType: string;
  receivedAt: string;
  signatureValid: boolean;
  source: string;
}

export const eventsCommand = new Command("events")
  .description("List recent events for an integration")
  .argument("<integrationId>", "Integration ID")
  .option("--limit <n>", "Number of events to show", "20")
  .action(async (integrationId: string, opts: { limit: string }) => {
    const config = requireConfig();
    const limit = parseInt(opts.limit, 10);

    const url = `${config.baseUrl}/api/integrations/${integrationId}/events?limit=${limit}`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      });

      if (!res.ok) {
        console.error(`Error: ${res.status} ${res.statusText}`);
        const body = await res.text();
        if (body) console.error(body);
        process.exit(1);
      }

      const data = (await res.json()) as { events: EventRow[] };

      if (data.events.length === 0) {
        console.log("No events found.");
        return;
      }

      // Print table header
      console.log(
        padRight("ID", 38) +
          padRight("Type", 35) +
          padRight("Source", 16) +
          padRight("Sig", 6) +
          "Received"
      );
      console.log("-".repeat(120));

      for (const evt of data.events) {
        console.log(
          padRight(evt.id, 38) +
            padRight(evt.eventType, 35) +
            padRight(evt.source, 16) +
            padRight(evt.signatureValid ? "OK" : "FAIL", 6) +
            new Date(evt.receivedAt).toLocaleString()
        );
      }

      console.log(`\n${data.events.length} events shown.`);
    } catch (err) {
      console.error(
        "Failed to fetch events:",
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
  });

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}
