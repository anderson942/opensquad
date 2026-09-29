import {
  isSummonCommand,
  parseDestinationCommand,
  type DestinationDefinition,
} from "./destinationParser.js";
import type { Position } from "./botMovement.js";

export interface BotCallerDeps {
  onLocalChatMessage: (callback: (message: string) => void) => void;
  callBot: (botName: string, destinationArea: string) => Promise<void>;
  summonBot: (botName: string, position: Position) => Promise<void>;
  getPosition: () => Promise<Position>;
  onError?: (error: unknown) => void;
}

export function setupBotCaller(
  botName: string,
  destinations: DestinationDefinition[],
  deps: BotCallerDeps
): void {
  deps.onLocalChatMessage((message: string) => {
    if (isSummonCommand(message, botName)) {
      deps
        .getPosition()
        .then((position) => deps.summonBot(botName, position))
        .catch((error) => deps.onError?.(error));
      return;
    }

    const destinationArea = parseDestinationCommand(message, botName, destinations);
    if (!destinationArea) {
      return;
    }

    deps.callBot(botName, destinationArea).catch((error) => {
      deps.onError?.(error);
    });
  });
}
