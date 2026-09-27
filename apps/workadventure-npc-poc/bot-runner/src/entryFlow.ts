import type { Page, Locator } from "playwright";

async function clickIfPresent(locator: Locator, timeoutMs: number): Promise<void> {
  try {
    await locator.waitFor({ state: "visible", timeout: timeoutMs });
    await locator.click();
  } catch {
    // Not present within the timeout — this optional step doesn't apply this time,
    // which is expected (e.g. a returning session may skip the onboarding tutorial).
  }
}

/**
 * Drives a fresh browser page through the real WorkAdventure entry flow:
 * name entry -> WOKA (character) selection -> camera/mic setup -> optional
 * onboarding/webcam popups, ending with the player fully present in the room.
 *
 * Selectors were validated against the real, live deployment at
 * https://workadventure.andersonautomacoes.com.br in headless Chromium.
 */
export async function completeEntryFlow(page: Page, playerName: string, roomUrl: string): Promise<void> {
  await page.goto(roomUrl, { waitUntil: "networkidle" });

  await page.getByTestId("loginSceneNameInput").fill(playerName);
  await page.locator(".loginSceneFormSubmit").click();

  await page.locator(".selectCharacterSceneFormSubmit").click();

  await page.locator('button:has-text("Salvar")').click();

  // Both of the following are optional/conditional — they don't always appear.
  await clickIfPresent(page.getByTestId("onboarding-button-welcome-skip"), 5000);
  await clickIfPresent(page.getByText("Continuar sem webcam e microfone"), 5000);
}
