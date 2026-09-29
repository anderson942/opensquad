// apps/workadventure-npc-poc/map-script/src/index.ts

/// <reference path="../node_modules/@workadventure/iframe-api-typings/iframe_api.d.ts" />

import { setupBubbleChat } from "./bubbleChat.js";
import { checkForCommandAndMove, type PendingCommand, type Position } from "./botMovement.js";
import { setupBotCaller } from "./botCaller.js";
import {
  isSummonCommand,
  parseDestinationCommand,
  type DestinationDefinition,
} from "./destinationParser.js";

const PROXY_BASE_URL = "https://npc-proxy.andersonautomacoes.com.br";
const PROXY_CHAT_URL = `${PROXY_BASE_URL}/npc/chat`;

const BOT_NAME = "Manu";
const BOT_POLL_INTERVAL_MS = 5000;
const KNOWN_DESTINATIONS: DestinationDefinition[] = [
  { areaName: "mesa-squad-vendas", aliases: ["squad de vendas", "squad vendas"] },
  { areaName: "mesa-manu", aliases: ["casa", "mesa dela", "mesa do manu"] },
];

WA.onInit().then(async () => {
  const isBot = WA.player.name === BOT_NAME;

  if (isBot) {
    // Without player tracking, chat events arrive with `author` undefined.
    await WA.players.configureTracking({ players: true, movement: false });

    let bubbleParticipantCount = 0;

    WA.player.meetings.onJoin().subscribe((meeting) => {
      console.log("[bubbleChat] meeting joined", { kind: meeting.kind, participants: meeting.participants.length });
      if (meeting.kind !== "proximity") return;
      bubbleParticipantCount = meeting.participants.length;
      meeting.onParticipantJoin().subscribe(() => {
        bubbleParticipantCount++;
      });
      meeting.onParticipantLeave().subscribe(() => {
        bubbleParticipantCount = Math.max(0, bubbleParticipantCount - 1);
      });
      meeting.onLeave().subscribe(() => {
        bubbleParticipantCount = 0;
      });
    });

    setupBubbleChat(BOT_NAME, {
      onBubbleMessage: (cb) => {
        WA.chat.onChatMessage(
          (message, event) => {
            console.log("[bubbleChat] received", { authorId: event.authorId, author: event.author?.name });
            // authorId is undefined only for the bot's own messages
            const authorName = event.authorId === undefined ? undefined : event.author?.name ?? "Alguém";
            cb(message, authorName);
          },
          { scope: "bubble" }
        );
      },
      getParticipantCount: () => bubbleParticipantCount,
      isMovementCommand: (message) =>
        isSummonCommand(message, BOT_NAME) ||
        parseDestinationCommand(message, BOT_NAME, KNOWN_DESTINATIONS) !== null,
      sendBubbleMessage: (message) => {
        WA.chat.sendChatMessage(message, { scope: "bubble" });
      },
      startTyping: () => {
        WA.chat.startTyping({ scope: "bubble" });
      },
      stopTyping: () => {
        WA.chat.stopTyping({ scope: "bubble" });
      },
      callProxy: async (message: string) => {
        const response = await fetch(PROXY_CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
        if (!response.ok) {
          throw new Error(`Proxy returned ${response.status}`);
        }
        const data = (await response.json()) as { reply: string };
        return data.reply;
      },
    });

    const runBotMovementLoop = () => {
      checkForCommandAndMove({
        pollForCommand: async () => {
          const response = await fetch(
            `${PROXY_BASE_URL}/bot/pending?botName=${encodeURIComponent(BOT_NAME)}`
          );
          if (!response.ok) {
            return null;
          }
          const data = (await response.json()) as { command: PendingCommand | null };
          return data.command;
        },
        getAreaCenter: async (areaName: string) => {
          const area = await WA.room.area.get(areaName);
          if (!area) {
            return null;
          }
          return { x: area.x + area.width / 2, y: area.y + area.height / 2 };
        },
        moveTo: async (x: number, y: number) => {
          await WA.player.moveTo(x, y);
        },
        onError: (error) => console.error("[botMovement] error", error),
      }).finally(() => {
        setTimeout(runBotMovementLoop, BOT_POLL_INTERVAL_MS);
      });
    };
    runBotMovementLoop();
  } else {
    setupBotCaller(BOT_NAME, KNOWN_DESTINATIONS, {
      onLocalChatMessage: (cb) => {
        WA.chat.onChatMessage(cb, { scope: "local" });
      },
      callBot: async (botName: string, destinationArea: string) => {
        const response = await fetch(`${PROXY_BASE_URL}/bot/call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ botName, destinationArea }),
        });
        if (!response.ok) {
          throw new Error(`Proxy returned ${response.status}`);
        }
      },
      summonBot: async (botName: string, position: Position) => {
        const response = await fetch(`${PROXY_BASE_URL}/bot/call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ botName, position }),
        });
        if (!response.ok) {
          throw new Error(`Proxy returned ${response.status}`);
        }
      },
      getPosition: async () => {
        const { x, y } = await WA.player.getPosition();
        return { x, y };
      },
      onError: (error) => console.error("[botCaller] error", error),
    });
  }
});
