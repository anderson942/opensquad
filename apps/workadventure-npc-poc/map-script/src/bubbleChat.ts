export interface BubbleChatDeps {
  // authorName is undefined for the bot's own messages
  onBubbleMessage: (callback: (message: string, authorName: string | undefined) => void) => void;
  getParticipantCount: () => number;
  isMovementCommand: (message: string) => boolean;
  sendBubbleMessage: (message: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
  // Conversation memory lives server-side (Hermes session), so only the new message is sent.
  callProxy: (message: string) => Promise<string>;
}

const FALLBACK_ERROR_MESSAGE =
  "Desculpa, não consegui responder agora. Tenta de novo em instantes.";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function setupBubbleChat(botName: string, deps: BubbleChatDeps): void {
  const mentionPattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(botName)}($|[^\\p{L}\\p{N}])`, "iu");
  let isWaiting = false;

  deps.onBubbleMessage((message, authorName) => {
    if (authorName === undefined) return;
    if (deps.isMovementCommand(message)) return;
    if (deps.getParticipantCount() > 1 && !mentionPattern.test(message)) return;
    if (isWaiting) return;

    isWaiting = true;
    deps.startTyping();

    deps
      .callProxy(`${authorName}: ${message}`)
      .then((reply) => {
        isWaiting = false;
        deps.stopTyping();
        deps.sendBubbleMessage(reply);
      })
      .catch((error) => {
        console.error("[bubbleChat] callProxy failed", error);
        isWaiting = false;
        deps.stopTyping();
        deps.sendBubbleMessage(FALLBACK_ERROR_MESSAGE);
      });
  });
}
