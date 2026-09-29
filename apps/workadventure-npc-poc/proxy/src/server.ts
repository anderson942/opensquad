import Fastify, { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import { ChatMessage, HermesClient } from "./hermesClient.js";
import { createBotCommandStore, type BotCommandStore, type BotCommand } from "./botCommands.js";

// The map script runs from an iframe served by the self-hosted WorkAdventure
// deployment, so that's the only origin allowed to call this API cross-origin.
const ALLOWED_ORIGIN = "https://workadventure.andersonautomacoes.com.br";

export interface BuildServerOptions {
  hermesClient: HermesClient;
  botCommandStore?: BotCommandStore;
}

export function buildServer({
  hermesClient,
  botCommandStore = createBotCommandStore(),
}: BuildServerOptions): FastifyInstance {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: ALLOWED_ORIGIN,
    methods: ["POST", "GET"],
    allowedHeaders: ["Content-Type"],
  });

  app.register(rateLimit, {
    max: 20,
    timeWindow: "1 minute",
  });

  app.post<{
    Body: { botName: string; destinationArea?: string; position?: { x: unknown; y: unknown } };
  }>("/bot/call", async (request, reply) => {
    const { botName, destinationArea, position } = request.body ?? {};

    if (!botName || typeof botName !== "string") {
      return reply.status(400).send({ error: "botName is required" });
    }

    if (destinationArea !== undefined) {
      if (!destinationArea || typeof destinationArea !== "string") {
        return reply.status(400).send({ error: "destinationArea must be a non-empty string" });
      }
      botCommandStore.setCommand(botName, { destinationArea });
      return { ok: true };
    }

    if (position !== undefined) {
      const { x, y } = position ?? {};
      if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
        return reply.status(400).send({ error: "position must have finite numeric x and y" });
      }
      botCommandStore.setCommand(botName, { position: { x, y } });
      return { ok: true };
    }

    return reply.status(400).send({ error: "destinationArea or position is required" });
  });

  app.get<{ Querystring: { botName?: string } }>(
    "/bot/pending",
    async (request, reply) => {
      const { botName } = request.query ?? {};

      if (!botName || typeof botName !== "string") {
        return reply.status(400).send({ error: "botName is required" });
      }

      const command: BotCommand | undefined = botCommandStore.takeCommand(botName);
      return { command: command ?? null };
    }
  );

  app.post<{ Body: { message: string; history?: ChatMessage[] } }>(
    "/npc/chat",
    async (request, reply) => {
      const { message, history = [] } = request.body ?? {};

      if (!message || typeof message !== "string") {
        return reply.status(400).send({ error: "message is required" });
      }

      if (!Array.isArray(history)) {
        return reply.status(400).send({ error: "history must be an array" });
      }

      const fullHistory: ChatMessage[] = [...history, { role: "user", content: message }];

      try {
        const replyText = await hermesClient.sendMessage(fullHistory);
        return { reply: replyText };
      } catch (err) {
        request.log.error(err);
        return reply.status(502).send({ error: "Failed to reach the AI backend" });
      }
    }
  );

  return app;
}
