import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { freshDb, scenario, missionData, PROJECT } from "./helpers";
import { DomainError } from "@/server/errors";
import { completeProject, getProject, listMyProjects, updateProject } from "@/server/projects";
import { assignMission, claimMission, createMission, deleteMission, listMissions, updateMission } from "@/server/missions";
import { createInvite, listInvites, revokeInvite } from "@/server/invites";
import { getReentry, markSeen } from "@/server/reentry";
import { createTemplateFromProject } from "@/server/templates";
import type { Db } from "@/db/client";

function code(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    if (e instanceof DomainError) return e.code;
    throw e;
  }
  return "OK";
}

let ctx: ReturnType<typeof freshDb>;
let db: Db;
beforeEach(() => {
  ctx = freshDb();
  db = ctx.db;
});
afterEach(() => ctx.close());

describe("A4: Nichtmitglieder können Projektdaten weder lesen noch verändern", () => {
  it("weist jede Lese- und Schreiboperation eines Nichtmitglieds ab", () => {
    const s = scenario(db);
    const m = s.mission("Teig ansetzen");
    const o = s.outsider;
    expect(code(() => getProject(db, o, s.projectId))).toBe("NOT_FOUND");
    expect(code(() => listMissions(db, o, s.projectId))).toBe("NOT_FOUND");
    expect(code(() => getReentry(db, o, s.projectId))).toBe("NOT_FOUND");
    expect(code(() => markSeen(db, o, s.projectId))).toBe("NOT_FOUND");
    expect(code(() => updateProject(db, o, s.projectId, PROJECT))).toBe("NOT_FOUND");
    expect(code(() => createMission(db, o, s.projectId, missionData("Hack")))).toBe("NOT_FOUND");
    expect(code(() => claimMission(db, o, m))).toBe("NOT_FOUND");
    expect(code(() => updateMission(db, o, m, { title: "Gehackt" }))).toBe("NOT_FOUND");
    expect(code(() => deleteMission(db, o, m))).toBe("NOT_FOUND");
    expect(code(() => assignMission(db, o, m, { userId: o }))).toBe("NOT_FOUND");
    expect(code(() => createInvite(db, o, s.projectId, {}))).toBe("NOT_FOUND");
    expect(code(() => listInvites(db, o, s.projectId))).toBe("NOT_FOUND");
    expect(code(() => completeProject(db, o, s.projectId))).toBe("NOT_FOUND");
    expect(listMyProjects(db, o)).toHaveLength(0);
    // Nichts wurde verändert
    const view = getProject(db, s.orga, s.projectId);
    expect(view.missions).toHaveLength(1);
    expect(view.missions[0]!.title).toBe("Teig ansetzen");
    expect(view.missions[0]!.assigneeId).toBeNull();
  });

  it("trennt Projekte: Mitglied in Projekt A hat keinen Zugriff auf Projekt B", () => {
    const a = scenario(db);
    const b = scenario(db);
    const mb = b.mission("Holz hacken");
    expect(code(() => getProject(db, a.member, b.projectId))).toBe("NOT_FOUND");
    expect(code(() => claimMission(db, a.member, mb))).toBe("NOT_FOUND");
    expect(code(() => getProject(db, a.orga, b.projectId))).toBe("NOT_FOUND");
    expect(code(() => updateMission(db, a.orga, mb, { title: "x x x" }))).toBe("NOT_FOUND");
    // Abhängigkeit über Projektgrenzen hinweg ist unzulässig
    const ma = a.mission("Ofen anheizen");
    expect(code(() => updateMission(db, a.orga, ma, { dependsOn: [mb] }))).toBe("INVALID");
  });
});

describe("A5: Mitglieder können keine Organisatorrechte ausüben", () => {
  it("weist Organisator-Aktionen eines Mitglieds mit FORBIDDEN ab", () => {
    const s = scenario(db);
    const m = s.mission("Tomatensoße kochen");
    const u = s.member;
    expect(code(() => updateProject(db, u, s.projectId, PROJECT))).toBe("FORBIDDEN");
    expect(code(() => createMission(db, u, s.projectId, missionData("Eigene")))).toBe("FORBIDDEN");
    expect(code(() => updateMission(db, u, m, { title: "Umbenannt" }))).toBe("FORBIDDEN");
    expect(code(() => deleteMission(db, u, m))).toBe("FORBIDDEN");
    expect(code(() => assignMission(db, u, m, { userId: u }))).toBe("FORBIDDEN");
    expect(code(() => createInvite(db, u, s.projectId, {}))).toBe("FORBIDDEN");
    expect(code(() => listInvites(db, u, s.projectId))).toBe("FORBIDDEN");
    expect(code(() => completeProject(db, u, s.projectId))).toBe("FORBIDDEN");
    expect(code(() => createTemplateFromProject(db, u, s.projectId))).toBe("FORBIDDEN");
    const inv = createInvite(db, s.orga, s.projectId, {});
    expect(code(() => revokeInvite(db, u, inv.id))).toBe("FORBIDDEN");
    // Lesen darf das Mitglied
    expect(getProject(db, u, s.projectId).role).toBe("member");
  });

  it("Organisatorin kann Zuständigkeiten korrigieren", () => {
    const s = scenario(db);
    const m = s.mission("Mehl kaufen");
    claimMission(db, s.member, m);
    assignMission(db, s.orga, m, { userId: s.orga });
    expect(listMissions(db, s.orga, s.projectId)[0]!.assigneeId).toBe(s.orga);
    assignMission(db, s.orga, m, { userId: null });
    const after = listMissions(db, s.orga, s.projectId)[0]!;
    expect(after.assigneeId).toBeNull();
    expect(after.state).toBe("offen");
    expect(code(() => assignMission(db, s.orga, m, { userId: s.outsider }))).toBe("INVALID");
  });
});

describe("Validierung", () => {
  it("validiert Eingaben serverseitig mit verständlichen Meldungen", () => {
    const s = scenario(db);
    let err: DomainError | null = null;
    try {
      createMission(db, s.orga, s.projectId, { title: "x", description: "kurz", durationMinutes: 0, energy: "turbo" });
    } catch (e) {
      err = e as DomainError;
    }
    expect(err?.code).toBe("INVALID");
    expect(err?.details?.title).toMatch(/mindestens 3/);
    expect(err?.details?.durationMinutes).toMatch(/mindestens 5/);
    expect(err?.details?.energy).toBeTruthy();
  });
});
