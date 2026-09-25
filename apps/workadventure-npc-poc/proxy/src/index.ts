import { buildServer } from "./server";
import { createHermesClient } from "./hermesClient";

const hermesClient = createHermesClient({
  baseUrl: process.env.HERMES_API_BASE_URL ?? "",
  apiKey: process.env.HERMES_API_KEY ?? "",
  model: process.env.HERMES_MODEL ?? "hermes-agent",
});

const app = buildServer({ hermesClient });
const port = Number(process.env.PORT ?? 3100);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
