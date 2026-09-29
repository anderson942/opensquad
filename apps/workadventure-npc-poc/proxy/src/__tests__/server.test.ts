import { describe, it, expect, vi } from "vitest";
import { buildServer } from "../server";
import type { HermesClient } from "../hermesClient";
import { createBotCommandStore } from "../botCommands";
import type { BotCommandStore } from "../botCommands";

describe("POST /npc/chat", () => {
  it("returns the AI reply for a valid message", async () => {
    const fakeHermesClient: HermesClient = {
      sendMessage: vi.fn().mockResolvedValue("Oi! Tudo bem?"),
    };
    const app = buildServer({ hermesClient: fakeHermesClient });

    const response = await app.inject({
      method: "POST",
      url: "/npc/chat",
      payload: { message: "oi" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ reply: "Oi! Tudo bem?" });
  });

  it("returns 400 when message is missing", async () => {
    const fakeHermesClient: HermesClient = { sendMessage: vi.fn() };
    const app = buildServer({ hermesClient: fakeHermesClient });

    const response = await app.inject({
      method: "POST",
      url: "/npc/chat",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 502 when the Hermes backend fails", async () => {
    const fakeHermesClient: HermesClient = {
      sendMessage: vi.fn().mockRejectedValue(new Error("network error")),
    };
    const app = buildServer({ hermesClient: fakeHermesClient });

    const response = await app.inject({
      method: "POST",
      url: "/npc/chat",
      payload: { message: "oi" },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ error: "Failed to reach the AI backend" });
  });

  it("returns 400 when history is not an array", async () => {
    const fakeHermesClient: HermesClient = { sendMessage: vi.fn() };
    const app = buildServer({ hermesClient: fakeHermesClient });

    const response = await app.inject({
      method: "POST",
      url: "/npc/chat",
      payload: { message: "oi", history: 123 },
    });

    expect(response.statusCode).toBe(400);
  });

  it("responds to a CORS preflight from the allowed WorkAdventure origin", async () => {
    const fakeHermesClient: HermesClient = { sendMessage: vi.fn() };
    const app = buildServer({ hermesClient: fakeHermesClient });

    const response = await app.inject({
      method: "OPTIONS",
      url: "/npc/chat",
      headers: {
        origin: "https://workadventure.andersonautomacoes.com.br",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });

    expect(response.headers["access-control-allow-origin"]).toBe(
      "https://workadventure.andersonautomacoes.com.br"
    );
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
  });

  it("only ever advertises the single allowed origin, never the caller's own origin", async () => {
    // @fastify/cors, configured with a static string, always answers with
    // that one configured origin (see its resolveOriginOption behavior) --
    // it does not echo back whatever Origin header the caller sent. Actual
    // cross-origin enforcement then happens client-side: a real browser on
    // https://evil.example.com would refuse to expose this response to page
    // JS, because the ACAO header it got back doesn't match its own origin.
    const fakeHermesClient: HermesClient = { sendMessage: vi.fn() };
    const app = buildServer({ hermesClient: fakeHermesClient });

    const response = await app.inject({
      method: "OPTIONS",
      url: "/npc/chat",
      headers: {
        origin: "https://evil.example.com",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });

    expect(response.headers["access-control-allow-origin"]).toBe(
      "https://workadventure.andersonautomacoes.com.br"
    );
  });
});

describe("bot control endpoints", () => {
  function buildTestServer() {
    const fakeHermesClient: HermesClient = { sendMessage: vi.fn() };
    const botCommandStore = createBotCommandStore();
    const app = buildServer({ hermesClient: fakeHermesClient, botCommandStore });
    return { app, botCommandStore };
  }

  describe("POST /bot/call", () => {
    it("stores the command and returns 200", async () => {
      const { app, botCommandStore } = buildTestServer();

      const response = await app.inject({
        method: "POST",
        url: "/bot/call",
        payload: { botName: "Manu", destinationArea: "mesa-squad-vendas" },
      });

      expect(response.statusCode).toBe(200);
      expect(botCommandStore.takeCommand("Manu")).toEqual({ destinationArea: "mesa-squad-vendas" });
    });

    it("returns 400 when botName is missing", async () => {
      const { app } = buildTestServer();

      const response = await app.inject({
        method: "POST",
        url: "/bot/call",
        payload: { destinationArea: "mesa-squad-vendas" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 400 when neither destinationArea nor position is given", async () => {
      const { app } = buildTestServer();

      const response = await app.inject({
        method: "POST",
        url: "/bot/call",
        payload: { botName: "Manu" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("stores a position command (summon to the caller)", async () => {
      const { app, botCommandStore } = buildTestServer();

      const response = await app.inject({
        method: "POST",
        url: "/bot/call",
        payload: { botName: "Manu", position: { x: 420, y: 310 } },
      });

      expect(response.statusCode).toBe(200);
      expect(botCommandStore.takeCommand("Manu")).toEqual({ position: { x: 420, y: 310 } });
    });

    it("returns 400 when position coordinates are not finite numbers", async () => {
      const { app } = buildTestServer();

      const response = await app.inject({
        method: "POST",
        url: "/bot/call",
        payload: { botName: "Manu", position: { x: "420", y: null } },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /bot/pending", () => {
    it("returns null when no command is pending", async () => {
      const { app } = buildTestServer();

      const response = await app.inject({
        method: "GET",
        url: "/bot/pending?botName=Manu",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ command: null });
    });

    it("returns the pending command and clears it", async () => {
      const { app, botCommandStore } = buildTestServer();
      botCommandStore.setCommand("Manu", { destinationArea: "mesa-squad-vendas" });

      const response = await app.inject({
        method: "GET",
        url: "/bot/pending?botName=Manu",
      });

      expect(response.json()).toEqual({ command: { destinationArea: "mesa-squad-vendas" } });
      expect(botCommandStore.takeCommand("Manu")).toBeUndefined();
    });

    it("returns 400 when botName query param is missing", async () => {
      const { app } = buildTestServer();

      const response = await app.inject({ method: "GET", url: "/bot/pending" });

      expect(response.statusCode).toBe(400);
    });

    it("responds to a CORS preflight allowing GET from the allowed WorkAdventure origin", async () => {
      const { app } = buildTestServer();

      const response = await app.inject({
        method: "OPTIONS",
        url: "/bot/pending",
        headers: {
          origin: "https://workadventure.andersonautomacoes.com.br",
          "access-control-request-method": "GET",
          "access-control-request-headers": "content-type",
        },
      });

      expect(response.headers["access-control-allow-origin"]).toBe(
        "https://workadventure.andersonautomacoes.com.br"
      );
      expect(response.headers["access-control-allow-methods"]).toContain("GET");
    });
  });
});
