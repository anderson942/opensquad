import { describe, it, expect, vi } from "vitest";
import { checkForCommandAndMove, type BotMovementDeps } from "../botMovement";

function createFakeDeps(overrides: Partial<BotMovementDeps> = {}): BotMovementDeps {
  return {
    pollForCommand: vi.fn().mockResolvedValue(null),
    getAreaCenter: vi.fn().mockResolvedValue(null),
    moveTo: vi.fn().mockResolvedValue(undefined),
    onError: vi.fn(),
    ...overrides,
  };
}

describe("checkForCommandAndMove", () => {
  it("does nothing when there is no pending command", async () => {
    const deps = createFakeDeps({ pollForCommand: vi.fn().mockResolvedValue(null) });

    await checkForCommandAndMove(deps);

    expect(deps.getAreaCenter).not.toHaveBeenCalled();
    expect(deps.moveTo).not.toHaveBeenCalled();
  });

  it("resolves the destination area and moves there when a command is pending", async () => {
    const deps = createFakeDeps({
      pollForCommand: vi.fn().mockResolvedValue({ destinationArea: "mesa-squad-vendas" }),
      getAreaCenter: vi.fn().mockResolvedValue({ x: 300, y: 150 }),
    });

    await checkForCommandAndMove(deps);

    expect(deps.getAreaCenter).toHaveBeenCalledWith("mesa-squad-vendas");
    expect(deps.moveTo).toHaveBeenCalledWith(300, 150);
  });

  it("moves straight to the given position for a summon command", async () => {
    const deps = createFakeDeps({
      pollForCommand: vi.fn().mockResolvedValue({ position: { x: 420, y: 310 } }),
    });

    await checkForCommandAndMove(deps);

    expect(deps.getAreaCenter).not.toHaveBeenCalled();
    expect(deps.moveTo).toHaveBeenCalledWith(420, 310);
  });

  it("does not move when the destination area can't be resolved", async () => {
    const deps = createFakeDeps({
      pollForCommand: vi.fn().mockResolvedValue({ destinationArea: "does-not-exist" }),
      getAreaCenter: vi.fn().mockResolvedValue(null),
    });

    await checkForCommandAndMove(deps);

    expect(deps.moveTo).not.toHaveBeenCalled();
  });

  it("reports errors instead of throwing", async () => {
    const deps = createFakeDeps({
      pollForCommand: vi.fn().mockRejectedValue(new Error("network error")),
    });

    await expect(checkForCommandAndMove(deps)).resolves.toBeUndefined();
    expect(deps.onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
