export interface DestinationDefinition {
  areaName: string;
  aliases: string[];
}

const SUMMON_PHRASES = ["vem aqui", "vem cá", "vem ca", "vem até mim", "vem ate mim"];

export function isSummonCommand(message: string, botName: string): boolean {
  const lowerMessage = message.toLowerCase();
  if (!lowerMessage.includes(botName.toLowerCase())) {
    return false;
  }
  return SUMMON_PHRASES.some((phrase) => lowerMessage.includes(phrase));
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
