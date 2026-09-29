import { describe, it, expect, vi } from "vitest";
import { createHermesClient } from "../hermesClient";

describe("createHermesClient", () => {
  it("sends the conversation history and returns the reply text", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Oi! Como posso ajudar?" } }],
      }),
    });

    const client = createHermesClient(
      { baseUrl: "https://hermes-api.example.com", apiKey: "test-key", model: "hermes-agent" },
      mockFetch as unknown as typeof fetch
    );

    const reply = await client.sendMessage([{ role: "user", content: "oi" }]);

    expect(reply).toBe("Oi! Como posso ajudar?");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hermes-api.example.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      })
    );
  });

  it("throws a descriptive error when Hermes returns a non-OK response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const client = createHermesClient(
      { baseUrl: "https://hermes-api.example.com", apiKey: "bad-key", model: "hermes-agent" },
      mockFetch as unknown as typeof fetch
    );

    await expect(
      client.sendMessage([{ role: "user", content: "oi" }])
    ).rejects.toThrow("Hermes API returned 401");
  });

  it("throws a descriptive error instead of crashing when the response has no choices array", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const client = createHermesClient(
      { baseUrl: "https://hermes-api.example.com", apiKey: "test-key", model: "hermes-agent" },
      mockFetch as unknown as typeof fetch
    );

    await expect(
      client.sendMessage([{ role: "user", content: "oi" }])
    ).rejects.toThrow("Hermes API returned no reply content");
  });

  it("throws a descriptive error when the reply content is an empty string", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "" } }] }),
    });

    const client = createHermesClient(
      { baseUrl: "https://hermes-api.example.com", apiKey: "test-key", model: "hermes-agent" },
      mockFetch as unknown as typeof fetch
    );

    await expect(
      client.sendMessage([{ role: "user", content: "oi" }])
    ).rejects.toThrow("Hermes API returned no reply content");
  });

  it("sends the exact serialized request body to Hermes", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Oi! Como posso ajudar?" } }],
      }),
    });

    const client = createHermesClient(
      { baseUrl: "https://hermes-api.example.com", apiKey: "test-key", model: "hermes-agent" },
      mockFetch as unknown as typeof fetch
    );

    await client.sendMessage([{ role: "user", content: "oi" }]);

    const requestInit = mockFetch.mock.calls[0][1];
    expect(JSON.parse(requestInit.body)).toEqual({
      model: "hermes-agent",
      messages: [{ role: "user", content: "oi" }],
    });
  });

  it("sends the X-Hermes-Session-Id header when a sessionId is configured", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "ok" } }] }),
    });

    const client = createHermesClient(
      { baseUrl: "https://hermes-api.example.com", apiKey: "k", model: "hermes-agent", sessionId: "workadventure-manu" },
      mockFetch as unknown as typeof fetch
    );

    await client.sendMessage([{ role: "user", content: "oi" }]);

    expect(mockFetch.mock.calls[0][1].headers).toMatchObject({
      "X-Hermes-Session-Id": "workadventure-manu",
    });
  });

  it("does not send the session header when no sessionId is configured", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "ok" } }] }),
    });

    const client = createHermesClient(
      { baseUrl: "https://hermes-api.example.com", apiKey: "k", model: "hermes-agent" },
      mockFetch as unknown as typeof fetch
    );

    await client.sendMessage([{ role: "user", content: "oi" }]);

    expect(mockFetch.mock.calls[0][1].headers).not.toHaveProperty("X-Hermes-Session-Id");
  });

  it("omits the model field entirely when config.model is an empty string", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Oi! Como posso ajudar?" } }],
      }),
    });

    const client = createHermesClient(
      { baseUrl: "https://hermes-api.example.com", apiKey: "test-key", model: "" },
      mockFetch as unknown as typeof fetch
    );

    await client.sendMessage([{ role: "user", content: "oi" }]);

    const requestInit = mockFetch.mock.calls[0][1];
    const parsedBody = JSON.parse(requestInit.body);
    expect(parsedBody).not.toHaveProperty("model");
    expect(parsedBody).toEqual({ messages: [{ role: "user", content: "oi" }] });
  });
});
