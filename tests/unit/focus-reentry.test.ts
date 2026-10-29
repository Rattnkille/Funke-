import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { freshDb, scenario, addUser, PROJECT } from "./helpers";
import { getFocus } from "@/server/focus";
import { getReentry, markSeen } from "@/server/reentry";
import { claimMission, completeMission, releaseMission } from "@/server/missions";
import { completeProject, createProject, listMyProjects } from "@/server/projects";
import { activity } from "@/db/schema";
import type { Db } from "@/db/client";

let ctx: ReturnType<typeof freshDb>;
let db: Db;
beforeEach(() => {
  ctx = freshDb();
  db = ctx.db;
});
afterEach(() => ctx.close());

describe("A9: Fokus nach Zeit und Energie", () => {
  it("liefert höchstens drei passende, ausführbare Missionen mit Begründung", () => {
    const s = scenario(db);
    const kurz1 = s.mission("Zutatenliste schreiben", { durationMinutes: 15, energy: "low" });
    s.mission("Zutaten einkaufen", { durationMinutes: 20, energy: "low" });
    s.mission("Tische abwischen", { durationMinutes: 10, energy: "low" });
    s.mission("Servietten falten", { durationMinutes: 25, energy: "low" });
    s.mission("Holz spalten", { durationMinutes: 20, energy: "high" }); // zu anstrengend
    s.mission("Ofen bauen", { durationMinutes: 240, energy: "low" }); // zu lang
    s.mission("Belegen", { durationMinutes: 10, energy: "low", dependsOn: [kurz1] }); // blockiert
    const taken = s.mission("Kerzen kaufen", { durationMinutes: 10, energy: "low" });
    claimMission(db, s.orga, taken); // gehört jemand anderem
    const done = s.mission("Plakat malen", { durationMinutes: 10, energy: "low" });
    claimMission(db, s.member, done);
    completeMission(db, s.member, done);

    const r = getFocus(db, s.member, { minutes: 30, energy: "low" });
    expect(r.suggestions).toHaveLength(3);
    const titles = r.suggestions.map((x) => x.mission.title);
    for (const t of titles) expect(["Zutatenliste schreiben", "Zutaten einkaufen", "Tische abwischen", "Servietten falten"]).toContain(t);
    // „Zutatenliste“ schaltet „Belegen“ frei und steht deshalb vorn
    expect(titles[0]).toBe("Zutatenliste schreiben");
    expect(r.suggestions[0]!.reasons.join(" ")).toMatch(/Schaltet 1 weitere Mission frei/);
    expect(r.suggestions[0]!.reasons.join(" ")).toMatch(/Passt in deine 30 Minuten/);
    for (const sug of r.suggestions) {
      expect(sug.mission.durationMinutes).toBeLessThanOrEqual(30);
      expect(sug.mission.energy).toBe("low");
      expect(sug.projectTitle).toBe(PROJECT.title);
    }
  });

  it("bevorzugt eigene übernommene Missionen", () => {
    const s = scenario(db);
    s.mission("Frei A", { durationMinutes: 10 });
    const mine = s.mission("Meine", { durationMinutes: 10 });
    claimMission(db, s.member, mine);
    const r = getFocus(db, s.member, { minutes: 60, energy: "high" });
    expect(r.suggestions[0]!.mission.id).toBe(mine);
    expect(r.suggestions[0]!.reasons[0]).toBe("Du hast sie schon übernommen.");
  });

  it("zeigt einen korrekten Leerzustand statt erfundener Aufgaben", () => {
    const s = scenario(db);
    const a = s.mission("Lange Aufgabe", { durationMinutes: 90, energy: "high" });
    s.mission("Danach", { durationMinutes: 10, energy: "low", dependsOn: [a] });
    const r = getFocus(db, s.member, { minutes: 15, energy: "low" });
    expect(r.suggestions).toEqual([]);
    expect(r.empty).toEqual({ executableCount: 1, shortestMinutes: 90, lowestEnergy: "high", blockedCount: 1 });

    const leer = addUser(db, "Neu");
    const r2 = getFocus(db, leer, { minutes: 60, energy: "high" });
    expect(r2.suggestions).toEqual([]);
    expect(r2.empty).toEqual({ executableCount: 0, shortestMinutes: null, lowestEnergy: null, blockedCount: 0 });
  });

  it("ignoriert abgeschlossene Projekte und validiert Eingaben", () => {
    const s = scenario(db);
    const m = s.mission("Einzige", { durationMinutes: 10, energy: "low" });
    claimMission(db, s.member, m);
    completeMission(db, s.member, m);
    completeProject(db, s.orga, s.projectId);
    const other = createProject(db, s.orga, { ...PROJECT, title: "Zweites Projekt" });
    expect(getFocus(db, s.orga, { minutes: 60, energy: "high" }).suggestions).toEqual([]);
    expect(other.id).toBeTruthy();
    expect(() => getFocus(db, s.member, { minutes: 1, energy: "low" })).toThrow();
    expect(() => getFocus(db, s.member, { minutes: 30, energy: "extrem" })).toThrow();
  });
});

describe("A10: Wiedereinstieg zeigt tatsächliche Änderungen", () => {
  it("listet nur Änderungen anderer seit dem letzten Besuch und einen nächsten Schritt", () => {
    const s = scenario(db);
    const teig = s.mission("Teig ansetzen", { durationMinutes: 20 });
    const backen = s.mission("Pizzen backen", { dependsOn: [teig] });
    markSeen(db, s.orga, s.projectId, Date.now());
    markSeen(db, s.member, s.projectId, Date.now());
    // eine kleine Pause
    const later = Date.now() + 5;
    while (Date.now() < later) {
      /* warten */
    }
    claimMission(db, s.member, teig);
    completeMission(db, s.member, teig);

    const r = getReentry(db, s.orga, s.projectId);
    expect(r.total).toBe(2);
    expect(r.changes.map((c) => c.text)).toEqual([
      "Mehmet hat „Teig ansetzen“ abgeschlossen.",
      "Mehmet hat „Teig ansetzen“ übernommen.",
    ]);
    expect(r.nextStep?.id).toBe(backen);
    // Eigene Aktionen erscheinen nicht als Neuigkeit
    expect(getReentry(db, s.member, s.projectId).total).toBe(0);
    expect(listMyProjects(db, s.orga)[0]!.changesSinceVisit).toBe(2);

    markSeen(db, s.orga, s.projectId, Date.now() + 1);
    expect(getReentry(db, s.orga, s.projectId).total).toBe(0);
    expect(listMyProjects(db, s.orga)[0]!.changesSinceVisit).toBe(0);
  });

  it("Änderungen beruhen auf echten Aktivitäten in der Datenbank", () => {
    const s = scenario(db);
    const m = s.mission("Ofen fegen");
    markSeen(db, s.orga, s.projectId, Date.now());
    const later = Date.now() + 5;
    while (Date.now() < later) {
      /* warten */
    }
    claimMission(db, s.member, m);
    releaseMission(db, s.member, m);
    const rows = db.select().from(activity).all().filter((a) => a.actorId === s.member && a.type.startsWith("mission_"));
    expect(rows.map((r) => r.type).sort()).toEqual(["mission_claimed", "mission_released"]);
    expect(getReentry(db, s.orga, s.projectId).changes[0]!.text).toBe("Mehmet hat „Ofen fegen“ zurückgegeben. Sie ist wieder frei.");
  });
});
