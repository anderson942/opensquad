import Fastify, { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { ChatMessage, HermesClient } from "./hermesClient";

export interface BuildServerOptions {
  hermesClient: HermesClient;
}

export function buildServer({ hermesClient }: BuildServerOptions): FastifyInstance {
  const app = Fastify({ logger: true });

  app.register(rateLimit, {
    max: 20,
    timeWindow: "1 minute",
  });

  app.post<{ Body: { message: string; history?: ChatMessage[] } }>(
    "/npc/chat",
    async (request, reply) => {
      const { message, history = [] } = request.body ?? {};

      if (!message || typeof message !== "string") {
        return reply.status(400).send({ error: "message is required" });
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
