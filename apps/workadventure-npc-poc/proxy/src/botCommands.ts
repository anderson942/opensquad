export interface BotCommand {
  destinationArea: string;
}

export interface BotCommandStore {
  setCommand(botName: string, command: BotCommand): void;
  takeCommand(botName: string): BotCommand | undefined;
}

export function createBotCommandStore(): BotCommandStore {
  const pending = new Map<string, BotCommand>();

  return {
    setCommand(botName: string, command: BotCommand): void {
      pending.set(botName, command);
    },
    takeCommand(botName: string): BotCommand | undefined {
      const command = pending.get(botName);
      pending.delete(botName);
      return command;
    },
  };
}
