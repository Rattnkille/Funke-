import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addUser, freshDb, scenario } from "./helpers";
import { DomainError } from "@/server/errors";
import { claimMission, completeMission, listMissions } from "@/server/missions";
import { completeProject, getProject } from "@/server/projects";
import { listInvites } from "@/server/invites";
import { getReentry } from "@/server/reentry";
import {
  addTemplateMission,
  createProjectFromTemplate,
  createTemplateFromProject,
  deleteTemplateMission,
  getTemplate,
  listTemplates,
  updateTemplate,
  updateTemplateMission,
} from "@/server/templates";
import type { Db } from "@/db/client";
import { activity, membership, mission, template, templateMission } from "@/db/schema";

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

function finishedProject() {
  const s = scenario(db);
  const teig = s.mission("Teig ansetzen", { durationMinutes: 20, energy: "low" });
  const ofen = s.mission("Ofen anheizen", { durationMinutes: 60, energy: "high" });
  const backen = s.mission("Pizzen backen", { dependsOn: [teig, ofen] });
  for (const id of [teig, ofen, backen]) {
    claimMission(db, s.member, id);
    completeMission(db, s.member, id);
  }
  return { ...s, teig, ofen, backen };
}

describe("A11: Vorlagen ohne personenbezogene Daten", () => {
  it("Vorlage nur aus abgeschlossenen Projekten und nur durch Organisatoren", () => {
    const s = scenario(db);
    s.mission("Etwas");
    expect(err(() => createTemplateFromProject(db, s.orga, s.projectId)).code).toBe("CONFLICT");
  });

  it("übernimmt Missionen und Abhängigkeiten, aber keine Namen, Mitglieder, Einladungen oder Aktivitäten", () => {
    const s = finishedProject();
    completeProject(db, s.orga, s.projectId);
    const { id: templateId } = createTemplateFromProject(db, s.orga, s.projectId);
    const t = getTemplate(db, s.orga, templateId);
    expect(t.missions.map((m) => m.title)).toEqual(["Teig ansetzen", "Ofen anheizen", "Pizzen backen"]);
    const byTitle = new Map(t.missions.map((m) => [m.title, m]));
    expect(byTitle.get("Pizzen backen")!.dependsOn.sort()).toEqual([byTitle.get("Teig ansetzen")!.id, byTitle.get("Ofen anheizen")!.id].sort());
    // Gespeicherte Vorlagen-Zeilen enthalten keine personenbezogenen Felder oder Werte
    const raw = JSON.stringify([db.select().from(template).all(), db.select().from(templateMission).all()]);
    for (const forbidden of ["Ilse", "Mehmet", s.member, s.projectId, "assignee", "eventDate", "2026-11-21"]) {
      expect(raw).not.toContain(forbidden);
    }
    expect(Object.keys(db.select().from(templateMission).get()!).sort()).toEqual(
      ["description", "durationMinutes", "energy", "id", "position", "templateId", "title"].sort(),
    );
    // Fremde sehen die Vorlage nicht
    expect(err(() => getTemplate(db, s.member, templateId)).code).toBe("NOT_FOUND");
    expect(listTemplates(db, s.member)).toEqual([]);
  });

  it("Vorlage ist bearbeitbar; neues Projekt startet offen, ohne Verantwortliche und ohne alte Mitglieder", () => {
    const s = finishedProject();
    completeProject(db, s.orga, s.projectId);
    const { id: templateId } = createTemplateFromProject(db, s.orga, s.projectId);
    updateTemplate(db, s.orga, templateId, { title: "Pizza-Backtag (Vorlage)", description: "Wiederholbar.", goal: "Zwölf Pizzen" });
    const t = getTemplate(db, s.orga, templateId);
    const backen = t.missions.find((m) => m.title === "Pizzen backen")!;
    const aufraeumen = addTemplateMission(db, s.orga, templateId, {
      title: "Aufräumen",
      description: "Ofen auskehren und Tische abwischen.",
      durationMinutes: 30,
      energy: "medium",
      dependsOn: [backen.id],
    }).id;
    updateTemplateMission(db, s.orga, backen.id, { durationMinutes: 90 });
    expect(err(() => updateTemplateMission(db, s.orga, backen.id, { dependsOn: [aufraeumen] })).message).toMatch(/Kreis/);
    const ofen = t.missions.find((m) => m.title === "Ofen anheizen")!;
    deleteTemplateMission(db, s.orga, ofen.id);

    const neuling = addUser(db, "Neuling");
    expect(err(() => createProjectFromTemplate(db, neuling, templateId, { title: "Klau" })).code).toBe("NOT_FOUND");

    const { id: newId } = createProjectFromTemplate(db, s.orga, templateId, { title: "Generationen-Ofen Frühling", eventDate: "2027-04-10" });
    const view = getProject(db, s.orga, newId);
    expect(view.project).toMatchObject({ title: "Generationen-Ofen Frühling", description: "Wiederholbar.", goal: "Zwölf Pizzen", status: "active", eventDate: "2027-04-10" });
    expect(view.members.map((m) => m.name)).toEqual(["Ilse"]);
    expect(view.missions.map((m) => m.title)).toEqual(["Teig ansetzen", "Pizzen backen", "Aufräumen"]);
    for (const m of view.missions) {
      expect(m.assigneeId).toBeNull();
      expect(m.storedStatus).toBe("open");
      expect(m.completedAt).toBeNull();
    }
    expect(view.missions.find((m) => m.title === "Pizzen backen")!.durationMinutes).toBe(90);
    expect(view.missions.find((m) => m.title === "Pizzen backen")!.state).toBe("blockiert");
    expect(view.missions.find((m) => m.title === "Aufräumen")!.dependsOn.map((d) => d.title)).toEqual(["Pizzen backen"]);
    expect(view.progress).toEqual({ total: 3, done: 0, percent: 0 });
    // Keine Einladungen, keine Aktivitäten außer der Anlage, keine fremden Mitgliedschaften
    expect(listInvites(db, s.orga, newId)).toEqual([]);
    const acts = db.select().from(activity).all().filter((a) => a.projectId === newId);
    expect(acts.map((a) => a.type)).toEqual(["project_created"]);
    expect(db.select().from(membership).all().filter((m) => m.projectId === newId)).toHaveLength(1);
    expect(getReentry(db, s.orga, newId).total).toBe(0);
    expect(err(() => listMissions(db, s.member, newId)).code).toBe("NOT_FOUND");
    // Originalprojekt bleibt unverändert
    expect(db.select().from(mission).all().filter((m) => m.projectId === s.projectId).every((m) => m.status === "done")).toBe(true);
  });
});
