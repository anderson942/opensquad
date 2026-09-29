import { buildServer } from "./server.js";
import { createHermesClient } from "./hermesClient.js";

if (!process.env.HERMES_API_BASE_URL || !process.env.HERMES_API_KEY) {
  console.error("Missing required env vars: HERMES_API_BASE_URL and/or HERMES_API_KEY");
  process.exit(1);
}

const hermesClient = createHermesClient({
  baseUrl: process.env.HERMES_API_BASE_URL ?? "",
  apiKey: process.env.HERMES_API_KEY ?? "",
  model: process.env.HERMES_MODEL ?? "hermes-agent",
  sessionId: process.env.HERMES_SESSION_ID || undefined,
});

const app = buildServer({ hermesClient });
const port = Number(process.env.PORT ?? 3100);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
