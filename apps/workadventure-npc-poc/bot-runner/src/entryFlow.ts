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

  // Locale-independent: the visible label is "Salvar" in pt-BR but "Save" in en-US
  // (and likely other locales) since the browser context's locale isn't fixed here —
  // that happens later, when index.ts constructs the context. The button's classes
  // (btn-secondary + type="submit") are stable across locales and distinguish it from
  // the two "Editar"/"Edit" buttons (type="button", no btn-lg) and the hidden
  // "Cancelar"/"Cancel" button (no btn-secondary class) on the same screen.
  await page.locator('button.btn-secondary[type="submit"]').click();

  // Both of the following are optional/conditional — they don't always appear.
  await clickIfPresent(page.getByTestId("onboarding-button-welcome-skip"), 5000);
  // Locale-independent for the same reason as above: "Continuar sem webcam e microfone"
  // becomes "Continue without webcam and microphone" in en-US. btn-danger + type="submit"
  // is stable and distinguishes it from the "Permitir webcam e microfone"/"Allow webcam
  // and microphone" button (btn-success, type="button") on the same popup.
  await clickIfPresent(page.locator('button.btn-danger[type="submit"]'), 5000);
}
