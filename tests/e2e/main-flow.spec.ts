import { expect, test, type Page } from "@playwright/test";
import { PASSWORD, snap, uniqueEmail } from "./helpers";

/**
 * Hauptablauf mit zwei getrennten Benutzersitzungen (eigene Browser-Kontexte, eigene Cookies):
 * Projekt anlegen → einladen → beitreten → übernehmen → zurückgeben → übernehmen → abschließen
 * → Projekt abschließen → Vorlage erzeugen → neues Projekt starten.
 */
test("Hauptablauf: zwei Personen vom Projekt bis zum neuen Projekt aus der Vorlage", async ({ browser }, info) => {
  const use = info.project.use;
  const baseURL = "http://localhost:3100";
  const ctxOptions = { ...use, baseURL, locale: "de-DE", timezoneId: "Europe/Berlin" };
  const orgaCtx = await browser.newContext(ctxOptions);
  const memberCtx = await browser.newContext(ctxOptions);
  const orga = await orgaCtx.newPage();
  const member = await memberCtx.newPage();
  const w = use.viewport?.width ?? 0;
  const orgaName = `Ilse ${w}`;
  const memberName = `Mehmet ${w}`;

  const mission = (page: Page, title: string) => page.locator(`[data-testid="mission"][data-title="${title}"]`);

  // --- Startseite und Registrierung (Organisatorin) ---
  await orga.goto("/");
  await expect(orga.getByRole("heading", { level: 1 })).toContainText("Aus einer Idee");
  await snap(orga, info, "01-landing");
  await orga.goto("/registrieren");
  await snap(orga, info, "02-registrieren");
  await orga.getByLabel("Dein Name").fill(orgaName);
  await orga.getByLabel("E-Mail-Adresse").fill(uniqueEmail("ilse"));
  await orga.getByLabel("Passwort").fill(PASSWORD);
  // Ohne Volljährigkeitsbestätigung wird abgewiesen
  await orga.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(orga.locator("main").getByRole("alert")).toContainText("nur für Erwachsene");
  await orga.getByLabel(/Ich bin volljährig/).check();
  await orga.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(orga).toHaveURL(/\/start$/);
  await expect(orga.getByTestId("focus-empty")).toContainText("noch in keinem aktiven Projekt");
  await snap(orga, info, "03-start-leer");

  // --- Projekt anlegen (mit Validierung) ---
  await orga.getByRole("link", { name: "Neues Projekt" }).first().click();
  await expect(orga).toHaveURL(/\/projekte\/neu$/);
  await orga.getByRole("button", { name: "Projekt anlegen" }).click();
  await expect(orga.locator("main").getByRole("alert")).toHaveText("Bitte prüfe die 3 markierten Felder.");
  await expect(orga.getByText("Titel: mindestens 3 Zeichen.")).toBeVisible();
  await snap(orga, info, "04-projekt-neu-fehler");
  await orga.getByLabel("Titel").fill("Generationen-Ofen");
  await orga.getByLabel("Beschreibung").fill("Pizza-Backtag im Hof mit Jung und Alt (fiktiv).");
  await orga.getByLabel("Ziel").fill("Zwölf Pizzen aus dem Lehmofen");
  await orga.getByLabel(/Termin/).fill("2026-11-21");
  await orga.getByRole("button", { name: "Projekt anlegen" }).click();
  await expect(orga).toHaveURL(/\/projekte\/[0-9a-f-]{36}$/);
  const projectUrl = orga.url();
  await expect(orga.getByRole("heading", { level: 1 })).toHaveText("Generationen-Ofen");

  // --- Missionen anlegen, zweite hängt von der ersten ab ---
  await orga.getByRole("link", { name: "Erste Mission anlegen" }).click();
  await orga.getByLabel("Titel").fill("Teig ansetzen");
  await orga.getByLabel("Was ist genau zu tun?").fill("Teig für zwölf Pizzen ansetzen und kühl stellen.");
  await orga.getByLabel("Geschätzte Dauer in Minuten").fill("40");
  await orga.getByLabel("Benötigte Energie").selectOption("medium");
  await snap(orga, info, "05-mission-neu");
  await orga.getByRole("button", { name: "Mission speichern" }).click();
  await expect(orga).toHaveURL(projectUrl);
  await orga.getByRole("link", { name: "Mission hinzufügen" }).click();
  await orga.getByLabel("Titel").fill("Pizzen backen");
  await orga.getByLabel("Was ist genau zu tun?").fill("Pizzen belegen und nacheinander im Ofen backen.");
  await orga.getByLabel("Geschätzte Dauer in Minuten").fill("60");
  await orga.getByLabel("Benötigte Energie").selectOption("high");
  await orga.getByLabel("Teig ansetzen").check();
  await orga.getByRole("button", { name: "Mission speichern" }).click();
  await expect(orga).toHaveURL(projectUrl);
  await expect(mission(orga, "Pizzen backen")).toHaveAttribute("data-state", "blockiert");
  await expect(mission(orga, "Teig ansetzen")).toHaveAttribute("data-state", "offen");
  await snap(orga, info, "06-projekt-organisation");

  // --- Einladung erstellen ---
  await orga.getByRole("link", { name: "Mitglieder einladen" }).click();
  await orga.getByRole("button", { name: "Einladungslink erstellen" }).click();
  const inviteLink = (await orga.getByTestId("invite-link").innerText()).trim();
  expect(inviteLink).toMatch(/^http:\/\/localhost:3100\/einladung\/[A-Za-z0-9_-]{43}$/);
  await expect(orga.getByTestId("invite-row")).toHaveCount(1);
  await snap(orga, info, "07-einladungen");

  // --- Zweite Sitzung: Einladung erfordert Anmeldung ---
  await member.goto(inviteLink);
  await expect(member).toHaveURL(/\/anmelden\?weiter=%2Feinladung%2F/);
  await expect(member.getByText("Du wurdest eingeladen")).toBeVisible();
  await snap(member, info, "08-einladung-anmelden");
  await member.getByRole("link", { name: "Konto erstellen" }).last().click();
  await expect(member).toHaveURL(/\/registrieren\?weiter=/);
  await member.getByLabel("Dein Name").fill(memberName);
  await member.getByLabel("E-Mail-Adresse").fill(uniqueEmail("mehmet"));
  await member.getByLabel("Passwort").fill(PASSWORD);
  await member.getByLabel(/Ich bin volljährig/).check();
  await member.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(member).toHaveURL(/\/einladung\//);
  await expect(member.getByRole("heading", { level: 1 })).toHaveText("Generationen-Ofen");
  await snap(member, info, "09-einladung-beitreten");
  await member.getByRole("button", { name: "Projekt beitreten" }).click();
  await expect(member).toHaveURL(projectUrl);
  await expect(member.getByText(`${memberName} (du)`)).toBeVisible();
  // Mitglied sieht keine Organisationsfunktionen
  await expect(member.getByRole("link", { name: "Mitglieder einladen" })).toHaveCount(0);
  await expect(member.getByText("Organisation: Zuständigkeit")).toHaveCount(0);

  // --- Fokus: Vorschlag und Leerzustand ---
  await member.goto("/start?zeit=60&energie=medium");
  const suggestions = member.getByTestId("suggestions").locator("> li");
  await expect(suggestions).toHaveCount(1);
  await expect(suggestions.first()).toContainText("Teig ansetzen");
  await expect(suggestions.first()).toContainText("Schaltet 1 weitere Mission frei.");
  await snap(member, info, "10-fokus-vorschlag");
  await member.goto("/start?zeit=15&energie=low");
  await expect(member.getByTestId("focus-empty")).toContainText("Keine freie Mission passt in 15 Min. mit wenig Energie");
  await expect(member.getByTestId("focus-empty")).toContainText("etwa 40 Min.");
  await snap(member, info, "11-fokus-leer");

  // --- Übernehmen, zurückgeben, erneut übernehmen, abschließen ---
  await member.goto(projectUrl);
  await expect(mission(member, "Pizzen backen").getByRole("button", { name: "Mission übernehmen" })).toHaveCount(0);
  const blocked = await member.request.post(`/api/missions/${await missionId(member, "Pizzen backen")}/claim`, { headers: { origin: "http://localhost:3100" } });
  expect(blocked.status()).toBe(409);
  expect((await blocked.json()).error).toBe("Diese Mission ist noch blockiert. Zuerst muss „Teig ansetzen“ abgeschlossen sein.");

  await mission(member, "Teig ansetzen").getByRole("button", { name: "Mission übernehmen" }).click();
  await expect(mission(member, "Teig ansetzen")).toHaveAttribute("data-state", "übernommen");
  await expect(member.getByTestId("flash")).toHaveText(/Du hast „Teig ansetzen“ übernommen\./);
  await snap(member, info, "12-mission-uebernommen");
  await mission(member, "Teig ansetzen").getByRole("button", { name: "Zurückgeben" }).click();
  await expect(mission(member, "Teig ansetzen")).toHaveAttribute("data-state", "offen");
  await mission(member, "Teig ansetzen").getByRole("button", { name: "Mission übernehmen" }).click();
  await expect(mission(member, "Teig ansetzen")).toHaveAttribute("data-state", "übernommen");
  await mission(member, "Teig ansetzen").getByRole("button", { name: "Als erledigt markieren" }).click();
  await expect(mission(member, "Teig ansetzen")).toHaveAttribute("data-state", "abgeschlossen");
  await expect(mission(member, "Pizzen backen")).toHaveAttribute("data-state", "offen");

  // Organisatorin sieht die Teil-Fortschritte und tatsächliche Änderungen
  await orga.goto(projectUrl);
  const reentry = orga.getByTestId("reentry");
  await expect(reentry).toContainText(`${memberName} ist dem Projekt beigetreten.`);
  await expect(reentry).toContainText(`${memberName} hat „Teig ansetzen“ übernommen.`);
  await expect(reentry).toContainText(`${memberName} hat „Teig ansetzen“ zurückgegeben. Sie ist wieder frei.`);
  await expect(reentry).toContainText(`${memberName} hat „Teig ansetzen“ abgeschlossen.`);
  await expect(orga.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  await expect(orga.getByTestId("open-items")).toContainText("„Pizzen backen“");
  await snap(orga, info, "13-wiedereinstieg");
  await reentry.getByRole("button", { name: "Gelesen, ausblenden" }).click();
  await expect(orga.getByTestId("reentry")).toHaveCount(0);

  // Mitglied erledigt die zweite Mission über den „nächsten Schritt“
  await member.reload();
  await mission(member, "Pizzen backen").getByRole("button", { name: "Mission übernehmen" }).click();
  await expect(mission(member, "Pizzen backen")).toHaveAttribute("data-state", "übernommen");
  await mission(member, "Pizzen backen").getByRole("button", { name: "Als erledigt markieren" }).click();
  await expect(mission(member, "Pizzen backen")).toHaveAttribute("data-state", "abgeschlossen");

  // --- Projekt abschließen und Vorlage erzeugen ---
  await orga.reload();
  await expect(orga.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  await expect(orga.getByText("Ofen ist heiß")).toBeVisible();
  await snap(orga, info, "14-alles-erledigt");
  await orga.getByTestId("complete-project").click();
  await expect(orga.getByText("Abgeschlossenes Projekt")).toBeVisible();
  await orga.getByTestId("create-template").click();
  await expect(orga).toHaveURL(/\/vorlagen\/[0-9a-f-]{36}$/);
  await expect(orga.getByTestId("template-mission")).toHaveCount(2);
  const templateText = await orga.locator("main").innerText();
  expect(templateText).not.toContain(memberName);
  expect(templateText).not.toContain(orgaName);
  await expect(orga.getByText("Hängt ab von: „Teig ansetzen“")).toBeVisible();
  await snap(orga, info, "15-vorlage");

  // --- Neues Projekt aus Vorlage ---
  await orga.getByLabel("Titel des neuen Projekts").fill("Generationen-Ofen Frühling");
  await orga.getByRole("button", { name: "Projekt starten" }).click();
  await expect(orga).toHaveURL(/\/projekte\/[0-9a-f-]{36}$/);
  expect(orga.url()).not.toBe(projectUrl);
  await expect(orga.getByRole("heading", { level: 1 })).toHaveText("Generationen-Ofen Frühling");
  await expect(mission(orga, "Teig ansetzen")).toHaveAttribute("data-state", "offen");
  await expect(mission(orga, "Pizzen backen")).toHaveAttribute("data-state", "blockiert");
  await expect(orga.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  const newProjectText = await orga.locator("main").innerText();
  expect(newProjectText).not.toContain(memberName);
  expect(newProjectText).not.toContain("Zuständig:");
  await expect(orga.getByRole("heading", { name: "Dabei (1)" })).toBeVisible();
  await expect(orga.getByTestId("reentry")).toHaveCount(0);
  await snap(orga, info, "16-neues-projekt-aus-vorlage");

  // Das Mitglied hat keinen Zugriff auf das neue Projekt
  const newUrl = orga.url();
  await member.goto(newUrl);
  await expect(member.getByRole("heading", { level: 1 })).toHaveText("Nicht gefunden");
  await snap(member, info, "17-kein-zugriff");

  await orgaCtx.close();
  await memberCtx.close();
});

async function missionId(page: Page, title: string) {
  const href = await page
    .locator(`[data-testid="mission"][data-title="${title}"]`)
    .getAttribute("data-id");
  if (!href) throw new Error(`Mission ${title} ohne id`);
  return href;
}
