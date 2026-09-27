import { describe, it, expect, vi } from "vitest";
import { setupBotCaller, type BotCallerDeps } from "../botCaller";
import type { DestinationDefinition } from "../destinationParser";

const DESTINATIONS: DestinationDefinition[] = [
  { areaName: "mesa-squad-vendas", aliases: ["squad de vendas"] },
];

function createFakeDeps() {
  let messageCb: (message: string) => void = () => {};

  const deps: BotCallerDeps = {
    onLocalChatMessage: (cb) => {
      messageCb = cb;
    },
    callBot: vi.fn().mockResolvedValue(undefined),
    onError: vi.fn(),
  };

  return { deps, triggerMessage: (message: string) => messageCb(message) };
}

describe("setupBotCaller", () => {
  it("does not call the bot when the message doesn't match", () => {
    const { deps, triggerMessage } = createFakeDeps();
    setupBotCaller("Manu", DESTINATIONS, deps);

    triggerMessage("oi, tudo bem?");

    expect(deps.callBot).not.toHaveBeenCalled();
  });

  it("calls the bot with the matched destination", async () => {
    const { deps, triggerMessage } = createFakeDeps();
    setupBotCaller("Manu", DESTINATIONS, deps);

    triggerMessage("Manu, vai pro squad de vendas");
    await Promise.resolve();

    expect(deps.callBot).toHaveBeenCalledWith("Manu", "mesa-squad-vendas");
  });

  it("reports an error instead of throwing when the call to the bot fails", async () => {
    const { deps, triggerMessage } = createFakeDeps();
    (deps.callBot as any).mockRejectedValue(new Error("network error"));
    setupBotCaller("Manu", DESTINATIONS, deps);

    triggerMessage("Manu, vai pro squad de vendas");
    await Promise.resolve();
    await Promise.resolve();

    expect(deps.onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
