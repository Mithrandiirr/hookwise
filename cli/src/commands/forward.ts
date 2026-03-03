import { Command } from "commander";
import { requireConfig } from "../config";

interface ForwardEvent {
  id: string;
  eventType: string;
  payload: unknown;
  headers: Record<string, string>;
}

export const forwardCommand = new Command("forward")
  .description("Forward webhook events to a local server")
  .argument("<integrationId>", "Integration ID")
  .option("--port <port>", "Local server port", "3000")
  .option("--path <path>", "Webhook endpoint path", "/webhook")
  .option("--poll-interval <ms>", "Poll interval in ms", "2000")
  .action(
    async (
      integrationId: string,
      opts: { port: string; path: string; pollInterval: string }
    ) => {
      const config = requireConfig();
      const localUrl = `http://localhost:${opts.port}${opts.path}`;
      const pollInterval = parseInt(opts.pollInterval, 10);

      console.log(`Forwarding events from integration ${integrationId}`);
      console.log(`Target: ${localUrl}`);
      console.log(`Poll interval: ${pollInterval}ms`);
      console.log("Press Ctrl+C to stop.\n");

      let lastEventId: string | null = null;
      const delivered = new Set<string>();

      const poll = async () => {
        try {
          const params = new URLSearchParams({ limit: "10" });
          if (lastEventId) {
            params.set("after", lastEventId);
          }

          const url = `${config.baseUrl}/api/integrations/${integrationId}/events?${params}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${config.apiKey}` },
          });

          if (!res.ok) {
            console.error(`Poll error: ${res.status}`);
            return;
          }

          const data = (await res.json()) as { events: ForwardEvent[] };

          for (const evt of data.events) {
            if (delivered.has(evt.id)) continue;
            delivered.add(evt.id);

            try {
              const fwdRes = await fetch(localUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-HookWise-Event-ID": evt.id,
                  "X-HookWise-Event-Type": evt.eventType,
                },
                body: JSON.stringify(evt.payload),
              });

              const status = fwdRes.ok ? "OK" : `FAIL(${fwdRes.status})`;
              console.log(
                `[${new Date().toLocaleTimeString()}] ${evt.eventType} → ${status}`
              );
            } catch (err) {
              console.error(
                `[${new Date().toLocaleTimeString()}] ${evt.eventType} → ERROR: ${
                  err instanceof Error ? err.message : err
                }`
              );
            }

            lastEventId = evt.id;
          }
        } catch (err) {
          console.error(
            "Poll failed:",
            err instanceof Error ? err.message : err
          );
        }
      };

      // Initial poll
      await poll();

      // Continue polling
      setInterval(poll, pollInterval);
    }
  );
