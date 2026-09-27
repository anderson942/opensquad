import { describe, it, expect } from "vitest";
import { createBotCommandStore } from "../botCommands";

describe("createBotCommandStore", () => {
  it("returns undefined when no command was ever set for a bot", () => {
    const store = createBotCommandStore();
    expect(store.takeCommand("Manu")).toBeUndefined();
  });

  it("returns a command that was set, then clears it", () => {
    const store = createBotCommandStore();
    store.setCommand("Manu", { destinationArea: "mesa-squad-vendas" });

    expect(store.takeCommand("Manu")).toEqual({ destinationArea: "mesa-squad-vendas" });
    expect(store.takeCommand("Manu")).toBeUndefined();
  });

  it("overwrites a pending command with the latest one (no queue)", () => {
    const store = createBotCommandStore();
    store.setCommand("Manu", { destinationArea: "mesa-squad-vendas" });
    store.setCommand("Manu", { destinationArea: "mesa-manu" });

    expect(store.takeCommand("Manu")).toEqual({ destinationArea: "mesa-manu" });
  });

  it("keeps commands for different bots independent", () => {
    const store = createBotCommandStore();
    store.setCommand("Manu", { destinationArea: "mesa-squad-vendas" });
    store.setCommand("Bruno", { destinationArea: "mesa-manu" });

    expect(store.takeCommand("Manu")).toEqual({ destinationArea: "mesa-squad-vendas" });
    expect(store.takeCommand("Bruno")).toEqual({ destinationArea: "mesa-manu" });
  });
});
