import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupNpcInteraction, NpcInteractionDeps } from "../npcInteraction";

function createFakeDeps() {
  let enterCb: () => void = () => {};
  let leaveCb: () => void = () => {};
  let messageCb: (message: string) => void = () => {};

  const deps: NpcInteractionDeps = {
    onEnterZone: (_zone, cb) => { enterCb = cb; },
    onLeaveZone: (_zone, cb) => { leaveCb = cb; },
    onLocalChatMessage: (cb) => { messageCb = cb; },
    sendLocalMessage: vi.fn(),
    startTyping: vi.fn(),
    stopTyping: vi.fn(),
    callProxy: vi.fn(),
  };

  return {
    deps,
    triggerEnter: () => enterCb(),
    triggerLeave: () => leaveCb(),
    triggerMessage: (message: string) => messageCb(message),
  };
}

describe("setupNpcInteraction", () => {
  let harness: ReturnType<typeof createFakeDeps>;

  beforeEach(() => {
    harness = createFakeDeps();
    setupNpcInteraction("npc-zone", "Manu", harness.deps);
  });

  it("ignores messages when the player is not near the NPC", () => {
    harness.triggerMessage("oi");
    expect(harness.deps.callProxy).not.toHaveBeenCalled();
  });

  it("calls the proxy and sends the reply when the player is near", async () => {
    (harness.deps.callProxy as any).mockResolvedValue("Oi! Tudo bem?");
    harness.triggerEnter();

    harness.triggerMessage("oi");
    await Promise.resolve();
    await Promise.resolve();

    expect(harness.deps.callProxy).toHaveBeenCalledWith("oi", []);
    expect(harness.deps.sendLocalMessage).toHaveBeenCalledWith("Oi! Tudo bem?", "Manu");
  });

  it("resets the conversation history when the player leaves the zone", async () => {
    (harness.deps.callProxy as any).mockResolvedValue("Primeira resposta");
    harness.triggerEnter();
    harness.triggerMessage("primeira mensagem");
    await Promise.resolve();
    await Promise.resolve();

    harness.triggerLeave();
    harness.triggerEnter();
    harness.triggerMessage("segunda mensagem");
    await Promise.resolve();
    await Promise.resolve();

    expect(harness.deps.callProxy).toHaveBeenLastCalledWith("segunda mensagem", []);
  });

  it("ignores a second message while the first is still waiting for a reply", async () => {
    let resolveFirst: (value: string) => void;
    (harness.deps.callProxy as any).mockReturnValueOnce(
      new Promise<string>((resolve) => { resolveFirst = resolve; })
    );
    harness.triggerEnter();

    harness.triggerMessage("primeira");
    harness.triggerMessage("segunda"); // sent while "primeira" is still in flight

    expect(harness.deps.callProxy).toHaveBeenCalledTimes(1);
    expect(harness.deps.callProxy).toHaveBeenCalledWith("primeira", []);

    resolveFirst!("resposta");
    await Promise.resolve();
    await Promise.resolve();

    expect(harness.deps.sendLocalMessage).toHaveBeenCalledWith("resposta", "Manu");
  });

  it("sends a friendly error message when the proxy call fails", async () => {
    (harness.deps.callProxy as any).mockRejectedValue(new Error("network error"));
    harness.triggerEnter();

    harness.triggerMessage("oi");
    await Promise.resolve();
    await Promise.resolve();

    expect(harness.deps.sendLocalMessage).toHaveBeenCalledWith(
      "Desculpa, não consegui responder agora. Tenta de novo em instantes.",
      "Manu"
    );
  });
});
