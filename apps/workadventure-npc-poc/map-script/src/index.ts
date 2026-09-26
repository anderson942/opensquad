// apps/workadventure-npc-poc/map-script/src/index.ts

/// <reference path="../node_modules/@workadventure/iframe-api-typings/iframe_api.d.ts" />

import { setupNpcInteraction, ChatMessage } from "./npcInteraction";

const NPC_ZONE_NAME = "npc-manu-zone";
const NPC_NAME = "Manu";
const PROXY_URL = "https://npc-proxy.andersonautomacoes.com.br/npc/chat";

WA.onInit().then(() => {
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
      const response = await fetch(PROXY_URL, {
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
});
