export interface DestinationDefinition {
  areaName: string;
  aliases: string[];
}

export function parseDestinationCommand(
  message: string,
  botName: string,
  destinations: DestinationDefinition[]
): string | null {
  const lowerMessage = message.toLowerCase();

  if (!lowerMessage.includes(botName.toLowerCase())) {
    return null;
  }

  for (const destination of destinations) {
    const matchesAlias = destination.aliases.some((alias) =>
      lowerMessage.includes(alias.toLowerCase())
    );
    if (matchesAlias) {
      return destination.areaName;
    }
  }

  return null;
}
