// apps/workadventure-npc-poc/map-script/src/index.ts

/// <reference path="../node_modules/@workadventure/iframe-api-typings/iframe_api.d.ts" />

import { setupNpcInteraction, ChatMessage } from "./npcInteraction.js";
import { checkForCommandAndMove } from "./botMovement.js";
import { setupBotCaller } from "./botCaller.js";
import type { DestinationDefinition } from "./destinationParser.js";

const NPC_ZONE_NAME = "npc-manu-zone";
const NPC_NAME = "Manu";
const PROXY_BASE_URL = "https://npc-proxy.andersonautomacoes.com.br";
const PROXY_CHAT_URL = `${PROXY_BASE_URL}/npc/chat`;

const BOT_NAME = "Manu";
const BOT_POLL_INTERVAL_MS = 1500;
const KNOWN_DESTINATIONS: DestinationDefinition[] = [
  { areaName: "mesa-squad-vendas", aliases: ["squad de vendas", "squad vendas"] },
  { areaName: "mesa-manu", aliases: ["casa", "mesa dela", "mesa do manu"] },
];

WA.onInit().then(() => {
  // Existing fixed-NPC chat feature — unchanged, runs for every visitor including the bot.
  setupNpcInteraction(NPC_ZONE_NAME, NPC_NAME, {
    onEnterZone: (zone, cb) => {
      WA.room.area.onEnter(zone).subscribe(cb);
    },
    onLeaveZone: (zone, cb) => {
      WA.room.area.onLeave(zone).subscribe(cb);
    },
    onLocalChatMessage: (cb) => {
      WA.chat.onChatMessage(cb, { scope: "local" });
    },
    sendLocalMessage: (message, author) => {
      WA.chat.sendChatMessage(message, { scope: "local", author });
    },
    startTyping: () => {
      WA.chat.startTyping({ scope: "local", author: NPC_NAME });
    },
    stopTyping: () => {
      WA.chat.stopTyping({ scope: "local" });
    },
    callProxy: async (message: string, history: ChatMessage[]) => {
      const response = await fetch(PROXY_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      if (!response.ok) {
        throw new Error(`Proxy returned ${response.status}`);
      }
      const data = (await response.json()) as { reply: string };
      return data.reply;
    },
  });

  // New: role-aware bot movement feature.
  const isBot = WA.player.name === BOT_NAME;

  if (isBot) {
    const runBotMovementLoop = () => {
      checkForCommandAndMove({
        pollForCommand: async () => {
          const response = await fetch(
            `${PROXY_BASE_URL}/bot/pending?botName=${encodeURIComponent(BOT_NAME)}`
          );
          if (!response.ok) {
            return null;
          }
          const data = (await response.json()) as { command: { destinationArea: string } | null };
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
      onError: (error) => console.error("[botCaller] error", error),
    });
  }
});
