import { describe, it, expect } from "vitest";
import { parseDestinationCommand, isSummonCommand, type DestinationDefinition } from "../destinationParser";

const DESTINATIONS: DestinationDefinition[] = [
  { areaName: "mesa-squad-vendas", aliases: ["squad de vendas", "squad vendas"] },
  { areaName: "mesa-manu", aliases: ["casa", "mesa dela"] },
];

describe("parseDestinationCommand", () => {
  it("returns null when the message doesn't mention the bot's name", () => {
    expect(parseDestinationCommand("vai pro squad de vendas", "Manu", DESTINATIONS)).toBeNull();
  });

  it("returns null when the message mentions the bot but no known destination", () => {
    expect(parseDestinationCommand("Manu, tudo bem?", "Manu", DESTINATIONS)).toBeNull();
  });

  it("matches a destination by alias, case-insensitively", () => {
    expect(parseDestinationCommand("Manu, vai pro Squad De Vendas", "Manu", DESTINATIONS)).toBe(
      "mesa-squad-vendas"
    );
  });

  it("matches a different destination by a different alias", () => {
    expect(parseDestinationCommand("manu, volta pra casa", "Manu", DESTINATIONS)).toBe("mesa-manu");
  });

  it("matches using the bot's own name regardless of case", () => {
    expect(parseDestinationCommand("MANU vai pro squad vendas", "Manu", DESTINATIONS)).toBe(
      "mesa-squad-vendas"
    );
  });
});

describe("isSummonCommand", () => {
  it("recognizes 'vem aqui' / 'vem cá' when the bot is mentioned", () => {
    expect(isSummonCommand("Manu, vem aqui", "Manu")).toBe(true);
    expect(isSummonCommand("manu vem cá por favor", "Manu")).toBe(true);
    expect(isSummonCommand("Manu, vem ca", "Manu")).toBe(true);
    expect(isSummonCommand("Manu, vem até mim", "Manu")).toBe(true);
  });

  it("ignores summon phrases that don't mention the bot", () => {
    expect(isSummonCommand("vem aqui", "Manu")).toBe(false);
  });

  it("ignores messages mentioning the bot without a summon phrase", () => {
    expect(isSummonCommand("Manu, tudo bem?", "Manu")).toBe(false);
  });
});
