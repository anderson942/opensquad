// Confirmed (Task 1, Step 4): Hermes Agent's API server expects a real
// "model" value — "hermes-agent" for the default profile
// (API_SERVER_MODEL_NAME default), not an OmniRoute combo name.

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface HermesClientConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface HermesClient {
  sendMessage(history: ChatMessage[]): Promise<string>;
}

export function createHermesClient(
  config: HermesClientConfig,
  fetchFn: typeof fetch = fetch
): HermesClient {
  return {
    async sendMessage(history: ChatMessage[]): Promise<string> {
      // Task 1, Step 5 determines whether Hermes needs a real "model" value
      // or rejects/ignores one. Only include the field when it's set, so
      // config.model = "" cleanly omits it instead of sending model: "".
      const body: { model?: string; messages: ChatMessage[] } = { messages: history };
      if (config.model) {
        body.model = config.model;
      }

      const response = await fetchFn(`${config.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Hermes API returned ${response.status}: ${body}`);
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[];
      };

      const reply = data.choices[0]?.message?.content;
      if (!reply) {
        throw new Error("Hermes API returned no reply content");
      }
      return reply;
    },
  };
}
