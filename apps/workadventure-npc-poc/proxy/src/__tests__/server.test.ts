import { describe, it, expect, vi } from "vitest";
import { buildServer } from "../server";
import type { HermesClient } from "../hermesClient";

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
