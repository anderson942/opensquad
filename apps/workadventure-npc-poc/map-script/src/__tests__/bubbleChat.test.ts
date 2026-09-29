import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupBubbleChat, BubbleChatDeps } from "../bubbleChat";

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function createHarness() {
  let messageCb: (message: string, authorName: string | undefined) => void = () => {};
  let leaveCb: () => void = () => {};
  let participantCount = 1;

  const deps: BubbleChatDeps = {
    onBubbleMessage: (cb) => { messageCb = cb; },
    onBubbleLeave: (cb) => { leaveCb = cb; },
    getParticipantCount: () => participantCount,
    isMovementCommand: (message) => message.toLowerCase().includes("vai pro"),
    sendBubbleMessage: vi.fn(),
    startTyping: vi.fn(),
    stopTyping: vi.fn(),
    callProxy: vi.fn(),
  };

  return {
    deps,
    say: (message: string, author = "Anderson") => messageCb(message, author),
    sayAsBot: (message: string) => messageCb(message, undefined),
    leaveBubble: () => leaveCb(),
    setParticipants: (n: number) => { participantCount = n; },
  };
}

describe("setupBubbleChat", () => {
  let h: ReturnType<typeof createHarness>;

  beforeEach(() => {
    h = createHarness();
    setupBubbleChat("Manu", h.deps);
  });

  it("replies to a message from the single human in the bubble", async () => {
    (h.deps.callProxy as any).mockResolvedValue("Bom dia!");

    h.say("bom dia");
    await flush();

    expect(h.deps.startTyping).toHaveBeenCalled();
    expect(h.deps.callProxy).toHaveBeenCalledWith("Anderson: bom dia", []);
    expect(h.deps.stopTyping).toHaveBeenCalled();
    expect(h.deps.sendBubbleMessage).toHaveBeenCalledWith("Bom dia!");
  });

  it("ignores its own messages (no remote author)", async () => {
    h.sayAsBot("Bom dia!");
    await flush();
    expect(h.deps.callProxy).not.toHaveBeenCalled();
  });

  it("ignores movement commands", async () => {
    h.say("Manu, vai pro squad de vendas");
    await flush();
    expect(h.deps.callProxy).not.toHaveBeenCalled();
  });

  it("in a group bubble, only replies when the bot is mentioned", async () => {
    (h.deps.callProxy as any).mockResolvedValue("Oi, pessoal");
    h.setParticipants(2);

    h.say("vamos almoçar?");
    await flush();
    expect(h.deps.callProxy).not.toHaveBeenCalled();

    h.say("manu, tudo bem?");
    await flush();
    expect(h.deps.callProxy).toHaveBeenCalledWith("Anderson: manu, tudo bem?", []);
  });

  it("does not treat names containing the bot name as a mention", async () => {
    h.setParticipants(2);
    h.say("falei com o Manuel ontem");
    await flush();
    expect(h.deps.callProxy).not.toHaveBeenCalled();
  });

  it("keeps history within the bubble and resets it when the bubble ends", async () => {
    (h.deps.callProxy as any).mockResolvedValueOnce("Primeira resposta");
    (h.deps.callProxy as any).mockResolvedValueOnce("Segunda resposta");
    (h.deps.callProxy as any).mockResolvedValueOnce("Terceira resposta");

    h.say("primeira");
    await flush();
    h.say("segunda", "Maria");
    await flush();

    expect(h.deps.callProxy).toHaveBeenLastCalledWith("Maria: segunda", [
      { role: "user", content: "Anderson: primeira" },
      { role: "assistant", content: "Primeira resposta" },
    ]);

    h.leaveBubble();
    h.say("terceira");
    await flush();
    expect(h.deps.callProxy).toHaveBeenLastCalledWith("Anderson: terceira", []);
  });

  it("drops a message that arrives while still waiting for a reply", async () => {
    let resolveFirst: (value: string) => void = () => {};
    (h.deps.callProxy as any).mockReturnValueOnce(
      new Promise<string>((resolve) => { resolveFirst = resolve; })
    );

    h.say("primeira");
    h.say("segunda");
    expect(h.deps.callProxy).toHaveBeenCalledTimes(1);

    resolveFirst("resposta");
    await flush();
    expect(h.deps.sendBubbleMessage).toHaveBeenCalledWith("resposta");
  });

  it("sends a fallback message when the proxy fails", async () => {
    (h.deps.callProxy as any).mockRejectedValue(new Error("network"));

    h.say("oi");
    await flush();

    expect(h.deps.stopTyping).toHaveBeenCalled();
    expect(h.deps.sendBubbleMessage).toHaveBeenCalledWith(
      "Desculpa, não consegui responder agora. Tenta de novo em instantes."
    );
  });
});
