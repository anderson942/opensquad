import { chromium } from "playwright";
import { runSessionWithRelaunch } from "./sessionManager.js";
import { completeEntryFlow } from "./entryFlow.js";

const BOT_NAME = process.env.BOT_NAME ?? "Manu";
const ROOM_URL = process.env.ROOM_URL ?? "";

if (!ROOM_URL) {
  console.error("Missing required env var: ROOM_URL");
  process.exit(1);
}

async function launchSession(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ permissions: [], locale: "pt-BR" });
    const page = await context.newPage();
    await completeEntryFlow(page, BOT_NAME, ROOM_URL);

    // Keep this session open until the browser itself disconnects (crash, or
    // the page/tab being closed) — that's what "the session ended" means here.
    await new Promise<void>((resolve) => {
      browser.on("disconnected", () => resolve());
    });
  } finally {
    await browser.close().catch(() => {});
  }
}

runSessionWithRelaunch(launchSession, { relaunchDelayMs: 5000 });
