export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface NpcInteractionDeps {
  onEnterZone: (zoneName: string, callback: () => void) => void;
  onLeaveZone: (zoneName: string, callback: () => void) => void;
  onLocalChatMessage: (callback: (message: string) => void) => void;
  sendLocalMessage: (message: string, authorName: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
  callProxy: (message: string, history: ChatMessage[]) => Promise<string>;
}

const FALLBACK_ERROR_MESSAGE =
  "Desculpa, não consegui responder agora. Tenta de novo em instantes.";

export function setupNpcInteraction(
  zoneName: string,
  npcName: string,
  deps: NpcInteractionDeps
): void {
  let isNear = false;
  let isWaiting = false;
  let history: ChatMessage[] = [];

  deps.onEnterZone(zoneName, () => {
    isNear = true;
  });

  deps.onLeaveZone(zoneName, () => {
    isNear = false;
    history = []; // conversation resets when the player walks away
  });

  deps.onLocalChatMessage((message: string) => {
    if (!isNear || isWaiting) return;

    isWaiting = true;
    deps.startTyping();

    deps
      .callProxy(message, history)
      .then((reply) => {
        history = [
          ...history,
          { role: "user", content: message },
          { role: "assistant", content: reply },
        ];
        isWaiting = false;
        deps.stopTyping();
        deps.sendLocalMessage(reply, npcName);
      })
      .catch((error) => {
        console.error("[npcInteraction] callProxy failed", error);
        isWaiting = false;
        deps.stopTyping();
        deps.sendLocalMessage(FALLBACK_ERROR_MESSAGE, npcName);
      });
  });
}
