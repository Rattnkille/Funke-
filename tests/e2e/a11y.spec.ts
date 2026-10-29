import { expect, test } from "@playwright/test";
import { PASSWORD, uniqueEmail } from "./helpers";

test("G.7: Registrierung und Projektanlage nur mit der Tastatur, Fokus sichtbar", async ({ page }) => {
  await page.goto("/registrieren");
  // Erster Tab-Halt ist der Sprunglink
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Zum Inhalt springen" })).toBeFocused();
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe("none");

  await page.getByLabel("Dein Name").focus();
  await page.keyboard.type("Tastatur Test");
  await page.keyboard.press("Tab");
  await page.keyboard.type(uniqueEmail("tastatur"));
  await page.keyboard.press("Tab");
  // Fokus auf Passwortfeld ist sichtbar umrandet
  await expect(page.getByLabel("Passwort")).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)).not.toBe("none");
  await page.keyboard.type(PASSWORD);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await expect(page.getByLabel(/Ich bin volljährig/)).toBeChecked();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/start$/);

  await page.goto("/projekte/neu");
  await page.getByLabel("Titel").focus();
  await page.keyboard.type("Tastatur-Projekt");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Nur mit Tastatur angelegt.");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Barrierearm");
  // Das Datumsfeld hat in Chromium eigene Tab-Stopps für Tag, Monat und Jahr.
  const submit = page.getByRole("button", { name: "Projekt anlegen" });
  for (let i = 0; i < 6 && !(await submit.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(submit).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tastatur-Projekt");
});

test("G.6: Reduzierte Bewegung wird respektiert", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/anmelden");
  const duration = await page.evaluate(() => getComputedStyle(document.querySelector(".btn")!).transitionDuration);
  expect(duration.split(",").every((d) => parseFloat(d) <= 0.001)).toBe(true);
});

test("G.7: Fehlermeldung bei falscher Anmeldung ist verständlich", async ({ page }) => {
  await page.goto("/anmelden");
  await page.getByLabel("E-Mail-Adresse").fill("niemand@e2e.funke.test");
  await page.getByLabel("Passwort").fill("falsches-passwort");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("E-Mail-Adresse oder Passwort stimmt nicht.");
});
