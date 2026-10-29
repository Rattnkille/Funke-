import { spawn } from "node:child_process";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addUser, freshDb, scenario } from "./helpers";
import { DomainError } from "@/server/errors";
import { assignMission, claimMission, completeMission, listMissions, releaseMission, updateMission, deleteMission } from "@/server/missions";
import { acceptInvite } from "@/server/invites";
import { completeProject, getProject } from "@/server/projects";
import { wouldCreateCycle, buildDependencyMap } from "@/server/graph";
import type { Db } from "@/db/client";

let ctx: ReturnType<typeof freshDb>;
let db: Db;
beforeEach(() => {
  ctx = freshDb();
  db = ctx.db;
});
afterEach(() => ctx.close());

function err(fn: () => unknown): DomainError {
  try {
    fn();
  } catch (e) {
    return e as DomainError;
  }
  throw new Error("Fehler erwartet");
}
const stateOf = (projectId: string, userId: string, id: string) => listMissions(db, userId, projectId).find((m) => m.id === id)!;

describe("A3: Übernehmen, zurückgeben, abschließen", () => {
  it("durchläuft offen → übernommen → offen → übernommen → abgeschlossen", () => {
    const s = scenario(db);
    const m = s.mission("Teig ansetzen");
    expect(stateOf(s.projectId, s.member, m).state).toBe("offen");
    claimMission(db, s.member, m);
    expect(stateOf(s.projectId, s.member, m)).toMatchObject({ state: "übernommen", assigneeId: s.member, assigneeName: "Mehmet" });
    releaseMission(db, s.member, m);
    expect(stateOf(s.projectId, s.member, m)).toMatchObject({ state: "offen", assigneeId: null });
    claimMission(db, s.member, m);
    completeMission(db, s.member, m);
    expect(stateOf(s.projectId, s.member, m).state).toBe("abgeschlossen");
    expect(getProject(db, s.member, s.projectId).progress).toEqual({ total: 1, done: 1, percent: 100 });
  });

  it("höchstens eine verantwortliche Person; fremde Missionen nicht zurückgeben oder abschließen", () => {
    const s = scenario(db);
    const m = s.mission("Holz hacken");
    claimMission(db, s.orga, m);
    expect(err(() => claimMission(db, s.member, m)).message).toMatch(/Ilse hat diese Mission gerade übernommen/);
    expect(err(() => releaseMission(db, s.member, m)).code).toBe("CONFLICT");
    expect(err(() => completeMission(db, s.member, m)).code).toBe("CONFLICT");
    expect(err(() => completeMission(db, s.member, s.mission("Noch frei"))).code).toBe("CONFLICT");
    completeMission(db, s.orga, m);
    expect(err(() => claimMission(db, s.member, m)).message).toMatch(/bereits abgeschlossen/);
    expect(err(() => assignMission(db, s.orga, m, { userId: s.member })).code).toBe("CONFLICT");
    expect(err(() => deleteMission(db, s.orga, m)).code).toBe("CONFLICT");
  });
});

describe("A8: Abhängigkeiten und Zyklen", () => {
  it("blockierte Missionen können erst nach Abschluss der Voraussetzungen übernommen werden", () => {
    const s = scenario(db);
    const teig = s.mission("Teig ansetzen");
    const ofen = s.mission("Ofen anheizen");
    const backen = s.mission("Pizzen backen", { dependsOn: [teig, ofen] });
    expect(stateOf(s.projectId, s.member, backen).state).toBe("blockiert");
    const e = err(() => claimMission(db, s.member, backen));
    expect(e.code).toBe("CONFLICT");
    expect(e.message).toBe("Diese Mission ist noch blockiert. Zuerst müssen „Teig ansetzen“ und „Ofen anheizen“ abgeschlossen sein.");
    expect(err(() => assignMission(db, s.orga, backen, { userId: s.member })).code).toBe("CONFLICT");
    claimMission(db, s.member, teig);
    completeMission(db, s.member, teig);
    expect(err(() => claimMission(db, s.member, backen)).message).toBe("Diese Mission ist noch blockiert. Zuerst muss „Ofen anheizen“ abgeschlossen sein.");
    claimMission(db, s.orga, ofen);
    completeMission(db, s.orga, ofen);
    expect(stateOf(s.projectId, s.member, backen).state).toBe("offen");
    claimMission(db, s.member, backen);
    expect(stateOf(s.projectId, s.member, backen).state).toBe("übernommen");
  });

  it("weist direkte, indirekte und Selbst-Zyklen ab und lässt den Bestand unverändert", () => {
    const s = scenario(db);
    const a = s.mission("A Mehl holen");
    const b = s.mission("B Teig kneten", { dependsOn: [a] });
    const c = s.mission("C Pizzen belegen", { dependsOn: [b] });
    expect(err(() => updateMission(db, s.orga, a, { dependsOn: [b] })).message).toMatch(/Kreis/);
    expect(err(() => updateMission(db, s.orga, a, { dependsOn: [c] })).code).toBe("INVALID");
    expect(err(() => updateMission(db, s.orga, a, { dependsOn: [a] })).code).toBe("INVALID");
    expect(stateOf(s.projectId, s.orga, a).dependsOn).toEqual([]);
    // Zulässige Änderung: C hängt zusätzlich direkt von A ab
    updateMission(db, s.orga, c, { dependsOn: [b, a] });
    expect(stateOf(s.projectId, s.orga, c).dependsOn.map((d) => d.id).sort()).toEqual([a, b].sort());
  });

  it("Graph-Funktion erkennt Zyklen", () => {
    const deps = buildDependencyMap([
      { missionId: "b", dependsOnId: "a" },
      { missionId: "c", dependsOnId: "b" },
    ]);
    expect(wouldCreateCycle(deps, "a", ["c"])).toBe(true);
    expect(wouldCreateCycle(deps, "c", ["a"])).toBe(false);
    expect(wouldCreateCycle(deps, "x", ["x"])).toBe(true);
  });
});

describe("A7: Konkurrierende Übernahme", () => {
  it("bei verzahnten Anfragen gewinnt genau eine Person, die andere bekommt eine verständliche Meldung", () => {
    const s = scenario(db);
    const m = s.mission("Lehmofen fegen");
    // Beide sehen die Mission als offen
    expect(stateOf(s.projectId, s.orga, m).state).toBe("offen");
    expect(stateOf(s.projectId, s.member, m).state).toBe("offen");
    claimMission(db, s.member, m);
    const e = err(() => claimMission(db, s.orga, m));
    expect(e.code).toBe("CONFLICT");
    expect(e.message).toBe("Mehmet hat diese Mission gerade übernommen. Schau dir eine andere freie Mission an.");
    expect(stateOf(s.projectId, s.orga, m).assigneeId).toBe(s.member);
  });

  it("echte Parallelität: 8 Prozesse mit eigenen Verbindungen, genau ein Gewinner", async () => {
    const s = scenario(db);
    const others = Array.from({ length: 6 }, (_, i) => addUser(db, `Person${i}`));
    for (const u of others) acceptInvite(db, u, s.token);
    const m = s.mission("Basilikum pflücken");
    const users = [s.orga, s.member, ...others];
    const startAt = Date.now() + 1500;
    const worker = path.resolve(__dirname, "fixtures/claim-worker.ts");
    const tsx = path.resolve(process.cwd(), "node_modules/.bin/tsx");
    const results = await Promise.all(
      users.map(
        (u) =>
          new Promise<{ userId: string; ok: boolean; code?: string; message?: string }>((resolve, reject) => {
            const child = spawn(tsx, [worker, ctx.file, u, m, String(startAt)], { cwd: process.cwd() });
            let out = "";
            let errOut = "";
            child.stdout.on("data", (d) => (out += d));
            child.stderr.on("data", (d) => (errOut += d));
            child.on("close", () => {
              try {
                resolve(JSON.parse(out));
              } catch {
                reject(new Error(`Worker-Ausgabe ungültig: ${out} ${errOut}`));
              }
            });
          }),
      ),
    );
    const winners = results.filter((r) => r.ok);
    expect(winners).toHaveLength(1);
    const losers = results.filter((r) => !r.ok);
    expect(losers).toHaveLength(users.length - 1);
    for (const l of losers) {
      expect(l.code).toBe("CONFLICT");
      expect(l.message).toMatch(/hat diese Mission gerade übernommen/);
    }
    expect(stateOf(s.projectId, s.orga, m).assigneeId).toBe(winners[0]!.userId);
  }, 30_000);
});

describe("D2: Projektabschluss", () => {
  it("zeigt offene Punkte, bis alle Missionen abgeschlossen sind", () => {
    const s = scenario(db);
    expect(err(() => completeProject(db, s.orga, s.projectId)).message).toMatch(/ohne Missionen/);
    const a = s.mission("Tische aufstellen");
    const b = s.mission("Aufräumen");
    const e = err(() => completeProject(db, s.orga, s.projectId));
    expect(e.message).toMatch(/„Tische aufstellen“.*„Aufräumen“/);
    expect(getProject(db, s.orga, s.projectId).openItems).toHaveLength(2);
    for (const id of [a, b]) {
      claimMission(db, s.member, id);
      completeMission(db, s.member, id);
    }
    expect(getProject(db, s.orga, s.projectId).canComplete).toBe(true);
    completeProject(db, s.orga, s.projectId);
    expect(getProject(db, s.orga, s.projectId).project.status).toBe("completed");
    expect(err(() => s.mission("Später")).code).toBe("CONFLICT");
  });
});
