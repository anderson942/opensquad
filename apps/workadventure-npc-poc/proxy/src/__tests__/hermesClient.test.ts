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
});
