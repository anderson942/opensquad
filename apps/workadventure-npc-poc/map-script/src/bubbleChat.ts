export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BubbleChatDeps {
  // authorName is undefined for the bot's own messages
  onBubbleMessage: (callback: (message: string, authorName: string | undefined) => void) => void;
  onBubbleLeave: (callback: () => void) => void;
  getParticipantCount: () => number;
  isMovementCommand: (message: string) => boolean;
  sendBubbleMessage: (message: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
  callProxy: (message: string, history: ChatMessage[]) => Promise<string>;
}

const FALLBACK_ERROR_MESSAGE =
  "Desculpa, não consegui responder agora. Tenta de novo em instantes.";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function setupBubbleChat(botName: string, deps: BubbleChatDeps): void {
  const mentionPattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(botName)}($|[^\\p{L}\\p{N}])`, "iu");
  let history: ChatMessage[] = [];
  let isWaiting = false;
  // Bumped when the bubble ends, so a reply arriving late doesn't leak into the next conversation.
  let bubbleGeneration = 0;

  deps.onBubbleLeave(() => {
    history = [];
    bubbleGeneration++;
  });

  deps.onBubbleMessage((message, authorName) => {
    if (authorName === undefined) return;
    if (deps.isMovementCommand(message)) return;
    if (deps.getParticipantCount() > 1 && !mentionPattern.test(message)) return;
    if (isWaiting) return;

    isWaiting = true;
    const generation = bubbleGeneration;
    const userContent = `${authorName}: ${message}`;
    deps.startTyping();

    deps
      .callProxy(userContent, history)
      .then((reply) => {
        if (generation === bubbleGeneration) {
          history = [
            ...history,
            { role: "user", content: userContent },
            { role: "assistant", content: reply },
          ];
        }
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
