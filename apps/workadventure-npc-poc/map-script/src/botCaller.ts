import { parseDestinationCommand, type DestinationDefinition } from "./destinationParser.js";

export interface BotCallerDeps {
  onLocalChatMessage: (callback: (message: string) => void) => void;
  callBot: (botName: string, destinationArea: string) => Promise<void>;
  onError?: (error: unknown) => void;
}

export function setupBotCaller(
  botName: string,
  destinations: DestinationDefinition[],
  deps: BotCallerDeps
): void {
  deps.onLocalChatMessage((message: string) => {
    const destinationArea = parseDestinationCommand(message, botName, destinations);
    if (!destinationArea) {
      return;
    }

    deps.callBot(botName, destinationArea).catch((error) => {
      deps.onError?.(error);
    });
  });
}
