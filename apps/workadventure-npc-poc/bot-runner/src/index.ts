import { chromium } from "playwright";
import { runSessionWithRelaunch } from "./sessionManager.js";
import { completeEntryFlow } from "./entryFlow.js";

const BOT_NAME = process.env.BOT_NAME ?? "Manu";
const ROOM_URL = process.env.ROOM_URL ?? "";
// Each attempt launches a full Chromium + Phaser/WebGL session, which is a
// genuinely heavy workload — a short relaunch delay was found to spike host
// CPU enough to destabilize sibling containers (redis was observed
// restarting repeatedly under a 5s delay). Default to a much more
// conservative cadence while entry-flow reliability is still being fixed.
const RELAUNCH_DELAY_MS = Number(process.env.RELAUNCH_DELAY_MS ?? 60000);

if (!ROOM_URL) {
  console.error("Missing required env var: ROOM_URL");
  process.exit(1);
}

async function launchSession(): Promise<void> {
  // WorkAdventure tries to access the camera/microphone during its own boot
  // sequence (before the entry flow even reaches the login field). Headless
  // Chromium has no real media devices, so getUserMedia() throws
  // NotFoundError, which appears to disrupt page initialization. Fake
  // devices make getUserMedia() succeed instead, avoiding that entirely.
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
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

runSessionWithRelaunch(launchSession, { relaunchDelayMs: RELAUNCH_DELAY_MS });
