import { expect, request as pwRequest, test, type APIRequestContext } from "@playwright/test";
import Database from "better-sqlite3";
import path from "node:path";
import { ORIGIN, PASSWORD, apiUser, uniqueEmail } from "./helpers";

const BASE = "http://localhost:3100";
const DB_FILE = path.resolve("./data/e2e/funke-e2e.db");

async function session(name: string) {
  const ctx = await pwRequest.newContext({ baseURL: BASE });
  await apiUser(ctx, name);
  return ctx;
}
const post = (ctx: APIRequestContext, url: string, data?: unknown) => ctx.post(url, { data, headers: ORIGIN });

// Läuft einmal im Projekt „api“ (siehe playwright.config.ts), da unabhängig von der Bildschirmbreite.

test.describe("Direkte Serveranfragen", () => {
  let orga: APIRequestContext;
  let member: APIRequestContext;
  let outsider: APIRequestContext;
  let anon: APIRequestContext;
  let projectId: string;
  let missionId: string;
  let inviteToken: string;
  let inviteId: string;

  test.beforeAll(async () => {
    orga = await session("Orga");
    member = await session("Mitglied");
    outsider = await session("Fremd");
    anon = await pwRequest.newContext({ baseURL: BASE });
    const p = await post(orga, "/api/projects", { title: "Geheimes Backprojekt", description: "Nur für Mitglieder.", goal: "Pizza", eventDate: "" });
    expect(p.status()).toBe(200);
    projectId = (await p.json()).id;
    const m = await post(orga, `/api/projects/${projectId}/missions`, { title: "Ofen fegen", description: "Asche aus dem Ofen kehren.", durationMinutes: 15, energy: "low" });
    expect(m.status(), await m.text()).toBe(200);
    missionId = (await m.json()).id;
    const inv = await post(orga, `/api/projects/${projectId}/invites`, { days: 7 });
    ({ token: inviteToken, id: inviteId } = await inv.json());
    expect((await post(member, "/api/invites/accept", { token: inviteToken })).status()).toBe(200);
  });

  test("A4: Nichtmitglieder können weder lesen noch verändern", async () => {
    const reads = [
      `/api/projects/${projectId}`,
      `/api/projects/${projectId}/missions`,
      `/api/projects/${projectId}/seen`,
      `/api/projects/${projectId}/invites`,
    ];
    for (const url of reads) {
      const r = await outsider.get(url);
      expect(r.status(), url).toBe(404);
      expect(await r.text()).not.toContain("Geheimes Backprojekt");
    }
    const writes: [string, string, unknown?][] = [
      ["PATCH", `/api/projects/${projectId}`, { title: "Gekapert", description: "x", goal: "xyz" }],
      ["POST", `/api/projects/${projectId}/missions`, { title: "Fremd", description: "Fremde Mission anlegen.", durationMinutes: 10, energy: "low" }],
      ["POST", `/api/missions/${missionId}/claim`],
      ["POST", `/api/missions/${missionId}/complete`],
      ["POST", `/api/missions/${missionId}/assign`, { userId: null }],
      ["PATCH", `/api/missions/${missionId}`, { title: "Gekapert" }],
      ["DELETE", `/api/missions/${missionId}`],
      ["POST", `/api/projects/${projectId}/invites`, { days: 7 }],
      ["POST", `/api/invites/${inviteId}/revoke`],
      ["POST", `/api/projects/${projectId}/complete`],
      ["POST", `/api/projects/${projectId}/template`],
      ["POST", `/api/projects/${projectId}/seen`],
    ];
    for (const [method, url, data] of writes) {
      const r = await outsider.fetch(url, { method, data, headers: ORIGIN });
      expect(r.status(), `${method} ${url}`).toBe(404);
    }
    // Seite selbst ebenfalls nicht lesbar
    const page = await outsider.get(`/projekte/${projectId}`);
    expect(page.status()).toBe(404);
    expect(await page.text()).not.toContain("Geheimes Backprojekt");
    // Nichts wurde verändert
    const view = await (await orga.get(`/api/projects/${projectId}`)).json();
    expect(view.project.title).toBe("Geheimes Backprojekt");
    expect(view.missions).toHaveLength(1);
    expect(view.missions[0].assigneeId).toBeNull();
    expect(view.members).toHaveLength(2);
  });

  test("A4: Ohne Anmeldung gibt es keine Daten", async () => {
    expect((await anon.get(`/api/projects/${projectId}`)).status()).toBe(401);
    expect((await anon.post(`/api/missions/${missionId}/claim`, { headers: ORIGIN })).status()).toBe(401);
    expect((await anon.post("/api/invites/accept", { data: { token: inviteToken }, headers: ORIGIN })).status()).toBe(401);
    const page = await anon.get(`/projekte/${projectId}`, { maxRedirects: 0 });
    expect(page.status()).toBe(307);
    expect(page.headers()["location"]).toContain("/anmelden");
  });

  test("Anfragen fremder Herkunft werden abgewiesen", async () => {
    const r = await member.post(`/api/missions/${missionId}/claim`, { headers: { origin: "https://boese.example" } });
    expect(r.status()).toBe(403);
  });

  test("A5: Mitglieder können keine Organisatorrechte ausüben", async () => {
    const attempts: [string, string, unknown?][] = [
      ["PATCH", `/api/projects/${projectId}`, { title: "Umbenannt", description: "x", goal: "xyz" }],
      ["POST", `/api/projects/${projectId}/missions`, { title: "Eigenmächtig", description: "Mission ohne Recht anlegen.", durationMinutes: 10, energy: "low" }],
      ["PATCH", `/api/missions/${missionId}`, { title: "Umbenannt" }],
      ["DELETE", `/api/missions/${missionId}`],
      ["POST", `/api/missions/${missionId}/assign`, { userId: null }],
      ["POST", `/api/projects/${projectId}/invites`, { days: 7 }],
      ["GET", `/api/projects/${projectId}/invites`],
      ["POST", `/api/invites/${inviteId}/revoke`],
      ["POST", `/api/projects/${projectId}/complete`],
      ["POST", `/api/projects/${projectId}/template`],
    ];
    for (const [method, url, data] of attempts) {
      const r = await member.fetch(url, { method, data, headers: ORIGIN });
      expect(r.status(), `${method} ${url}`).toBe(403);
      expect((await r.json()).error).toMatch(/Nur Organisatorinnen und Organisatoren/);
    }
    expect((await member.get(`/projekte/${projectId}/einladungen`)).status()).toBe(404);
    expect((await member.get(`/projekte/${projectId}/missionen/neu`)).status()).toBe(404);
    // Lesen ist erlaubt
    expect((await member.get(`/api/projects/${projectId}`)).status()).toBe(200);
  });

  test("A6: Widerrufene und abgelaufene Einladungen werden abgewiesen", async () => {
    const late = await session("Spät");
    // Widerrufen
    const inv = await (await post(orga, `/api/projects/${projectId}/invites`, { days: 1 })).json();
    expect((await post(orga, `/api/invites/${inv.id}/revoke`)).status()).toBe(200);
    const revoked = await post(late, "/api/invites/accept", { token: inv.token });
    expect(revoked.status()).toBe(410);
    expect((await revoked.json()).error).toMatch(/zurückgezogen/);
    const revokedPage = await late.get(`/einladung/${inv.token}`);
    expect(await revokedPage.text()).toContain("Diese Einladung wurde zurückgezogen");
    // Abgelaufen: Ablaufzeit in der Test-Datenbank in die Vergangenheit setzen
    const inv2 = await (await post(orga, `/api/projects/${projectId}/invites`, { days: 1 })).json();
    const db = new Database(DB_FILE);
    db.prepare("update invite set expires_at = ? where id = ?").run(Date.now() - 1000, inv2.id);
    db.close();
    const expired = await post(late, "/api/invites/accept", { token: inv2.token });
    expect(expired.status()).toBe(410);
    expect((await expired.json()).error).toMatch(/abgelaufen/);
    // Ungültig
    expect((await post(late, "/api/invites/accept", { token: "x".repeat(43) })).status()).toBe(404);
    // Nicht beigetreten
    expect((await late.get(`/api/projects/${projectId}`)).status()).toBe(404);
    const list = await (await orga.get(`/api/projects/${projectId}/invites`)).json();
    const statuses = list.invites.map((i: { status: string }) => i.status);
    expect(statuses).toContain("widerrufen");
    expect(statuses).toContain("abgelaufen");
  });

  test("A7: Bei konkurrierender Übernahme gewinnt genau eine Person", async () => {
    const extra = await Promise.all(["Anna", "Bert", "Cem", "Dora"].map((n) => session(n)));
    for (const ctx of extra) expect((await post(ctx, "/api/invites/accept", { token: inviteToken })).status()).toBe(200);
    const m = await post(orga, `/api/projects/${projectId}/missions`, { title: "Basilikum holen", description: "Basilikum im Garten pflücken.", durationMinutes: 10, energy: "low" });
    const id = (await m.json()).id;
    const contenders = [member, orga, ...extra];
    // Mehrere gleichzeitige Anfragen pro Person
    const responses = await Promise.all(contenders.flatMap((c) => [post(c, `/api/missions/${id}/claim`), post(c, `/api/missions/${id}/claim`)]));
    const statuses = responses.map((r) => r.status());
    const bodies = await Promise.all(responses.map((r) => r.json()));
    const view = await (await orga.get(`/api/projects/${projectId}`)).json();
    const winner = view.missions.find((x: { id: string }) => x.id === id).assigneeId;
    expect(winner).toBeTruthy();
    // Genau eine Person ist zuständig; alle anderen erhalten 409 mit verständlicher Meldung
    const losers = bodies.filter((_, i) => statuses[i] === 409);
    expect(statuses.filter((s) => s === 200).length).toBeGreaterThanOrEqual(1);
    expect(statuses.filter((s) => s === 200).length).toBeLessThanOrEqual(2); // ggf. Doppelklick derselben Person
    expect(statuses.every((s) => s === 200 || s === 409)).toBe(true);
    expect(losers.length).toBeGreaterThanOrEqual(contenders.length * 2 - 2);
    for (const l of losers) expect(l.error).toMatch(/hat diese Mission gerade übernommen/);
    const winnerCtxIndexes = statuses.map((s, i) => (s === 200 ? Math.floor(i / 2) : -1)).filter((i) => i >= 0);
    expect(new Set(winnerCtxIndexes).size).toBe(1);
  });

  test("A8: Zyklen werden auch über die API abgewiesen", async () => {
    const a = (await (await post(orga, `/api/projects/${projectId}/missions`, { title: "Schritt A", description: "Erster Schritt im Ablauf.", durationMinutes: 10, energy: "low" })).json()).id;
    const b = (await (await post(orga, `/api/projects/${projectId}/missions`, { title: "Schritt B", description: "Zweiter Schritt im Ablauf.", durationMinutes: 10, energy: "low", dependsOn: [a] })).json()).id;
    const cyc = await orga.fetch(`/api/missions/${a}`, { method: "PATCH", data: { dependsOn: [b] }, headers: ORIGIN });
    expect(cyc.status()).toBe(400);
    expect((await cyc.json()).error).toMatch(/Kreis/);
    const claimB = await post(member, `/api/missions/${b}/claim`);
    expect(claimB.status()).toBe(409);
    expect((await claimB.json()).error).toMatch(/blockiert/);
  });

  test("Serverseitige Validierung liefert verständliche Feldfehler", async () => {
    const r = await post(orga, `/api/projects/${projectId}/missions`, { title: "x", description: "", durationMinutes: 9999, energy: "riesig" });
    expect(r.status()).toBe(400);
    const body = await r.json();
    expect(body.details.title).toBe("Titel: mindestens 3 Zeichen.");
    expect(body.details.durationMinutes).toMatch(/höchstens 480/);
    const bad = await orga.post("/api/projects", { data: "{kaputt", headers: { ...ORIGIN, "content-type": "application/json" } });
    expect(bad.status()).toBe(400);
    void PASSWORD;
    void uniqueEmail;
  });
});
