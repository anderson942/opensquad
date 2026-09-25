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
});
