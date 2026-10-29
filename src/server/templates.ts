import { randomUUID } from "node:crypto";
import { z } from "zod";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { membership, mission, missionDependency, project, projectVisit, template, templateDependency, templateMission } from "@/db/schema";
import { requireOrganizer, type Tx } from "./access";
import { logActivity } from "./activity";
import { DomainError } from "./errors";
import { buildDependencyMap, wouldCreateCycle } from "./graph";
import { fromTemplateInput, missionFields, parse, templateInput } from "./validation";

function requireOwner(db: Tx, templateId: string, userId: string) {
  const t = db.select().from(template).where(eq(template.id, templateId)).get();
  // Fremde Vorlagen sind wie nicht vorhanden.
  if (!t || t.ownerId !== userId) throw new DomainError("NOT_FOUND", "Vorlage nicht gefunden oder kein Zugriff.");
  return t;
}

/**
 * Übernimmt ausschließlich Inhalt und Struktur: Titel, Beschreibung, Ziel, Missionen (Titel, Handlung,
 * Dauer, Energie, Reihenfolge) und Abhängigkeiten. Keine Namen, Mitgliedschaften, Einladungen,
 * Aktivitäten, Zuständigkeiten, Termine oder Zeitstempel des Ursprungsprojekts.
 */
export function createTemplateFromProject(db: Db, userId: string, projectId: string) {
  return db.transaction(
    (tx) => {
      const { project: p } = requireOrganizer(tx, projectId, userId);
      if (p.status !== "completed") {
        throw new DomainError("CONFLICT", "Vorlagen entstehen aus abgeschlossenen Projekten. Schließe das Projekt zuerst ab.");
      }
      const id = randomUUID();
      const now = new Date();
      tx.insert(template).values({ id, ownerId: userId, title: p.title, description: p.description, goal: p.goal, createdAt: now, updatedAt: now }).run();
      const missions = tx.select().from(mission).where(eq(mission.projectId, projectId)).orderBy(asc(mission.position)).all();
      const idMap = new Map<string, string>();
      missions.forEach((m, i) => {
        const newId = randomUUID();
        idMap.set(m.id, newId);
        tx.insert(templateMission)
          .values({ id: newId, templateId: id, title: m.title, description: m.description, durationMinutes: m.durationMinutes, energy: m.energy, position: i + 1 })
          .run();
      });
      const edges = missions.length
        ? tx.select().from(missionDependency).where(inArray(missionDependency.missionId, missions.map((m) => m.id))).all()
        : [];
      for (const e of edges) {
        const a = idMap.get(e.missionId);
        const b = idMap.get(e.dependsOnId);
        if (a && b) tx.insert(templateDependency).values({ templateMissionId: a, dependsOnId: b }).run();
      }
      return { id };
    },
    { behavior: "immediate" },
  );
}

export function listTemplates(db: Db, userId: string) {
  const rows = db.select().from(template).where(eq(template.ownerId, userId)).orderBy(desc(template.updatedAt)).all();
  return rows.map((t) => ({
    ...t,
    missionCount:
      db.select({ n: sql<number>`count(*)` }).from(templateMission).where(eq(templateMission.templateId, t.id)).get()?.n ?? 0,
  }));
}

export function getTemplate(db: Db, userId: string, templateId: string) {
  const t = requireOwner(db, templateId, userId);
  const missions = db.select().from(templateMission).where(eq(templateMission.templateId, templateId)).orderBy(asc(templateMission.position)).all();
  const edges = missions.length
    ? db.select().from(templateDependency).where(inArray(templateDependency.templateMissionId, missions.map((m) => m.id))).all()
    : [];
  const deps = buildDependencyMap(edges.map((e) => ({ missionId: e.templateMissionId, dependsOnId: e.dependsOnId })));
  return { template: t, missions: missions.map((m) => ({ ...m, dependsOn: deps.get(m.id) ?? [] })) };
}

export function updateTemplate(db: Db, userId: string, templateId: string, raw: unknown) {
  const input = parse(templateInput, raw);
  requireOwner(db, templateId, userId);
  db.update(template).set({ ...input, updatedAt: new Date() }).where(eq(template.id, templateId)).run();
  return { id: templateId };
}

export function deleteTemplate(db: Db, userId: string, templateId: string) {
  requireOwner(db, templateId, userId);
  db.delete(template).where(eq(template.id, templateId)).run();
  return { id: templateId };
}

const templateMissionInput = missionFields.extend({ dependsOn: z.array(z.string().min(1).max(64)).max(50).optional() });

function setTemplateDeps(tx: Tx, templateId: string, missionId: string, dependsOn: string[]) {
  const unique = [...new Set(dependsOn)];
  const all = tx.select({ id: templateMission.id }).from(templateMission).where(eq(templateMission.templateId, templateId)).all().map((r) => r.id);
  if (unique.some((d) => !all.includes(d))) throw new DomainError("INVALID", "Voraussetzungen müssen aus derselben Vorlage stammen.");
  const edges = all.length ? tx.select().from(templateDependency).where(inArray(templateDependency.templateMissionId, all)).all() : [];
  const deps = buildDependencyMap(
    edges.filter((e) => e.templateMissionId !== missionId).map((e) => ({ missionId: e.templateMissionId, dependsOnId: e.dependsOnId })),
  );
  if (wouldCreateCycle(deps, missionId, unique)) {
    throw new DomainError("INVALID", "Diese Abhängigkeit würde einen Kreis bilden. Bitte wähle andere Voraussetzungen.", { dependsOn: "Zirkuläre Abhängigkeit" });
  }
  tx.delete(templateDependency).where(eq(templateDependency.templateMissionId, missionId)).run();
  for (const d of unique) tx.insert(templateDependency).values({ templateMissionId: missionId, dependsOnId: d }).run();
}

export function addTemplateMission(db: Db, userId: string, templateId: string, raw: unknown) {
  const { dependsOn, ...input } = parse(templateMissionInput, raw);
  return db.transaction(
    (tx) => {
      requireOwner(tx, templateId, userId);
      const id = randomUUID();
      const max = tx.select({ m: sql<number>`coalesce(max(${templateMission.position}),0)` }).from(templateMission).where(eq(templateMission.templateId, templateId)).get();
      tx.insert(templateMission).values({ id, templateId, ...input, position: (max?.m ?? 0) + 1 }).run();
      if (dependsOn?.length) setTemplateDeps(tx, templateId, id, dependsOn);
      tx.update(template).set({ updatedAt: new Date() }).where(eq(template.id, templateId)).run();
      return { id };
    },
    { behavior: "immediate" },
  );
}

export function updateTemplateMission(db: Db, userId: string, templateMissionId: string, raw: unknown) {
  const { dependsOn, ...input } = parse(templateMissionInput.partial(), raw);
  return db.transaction(
    (tx) => {
      const tm = tx.select().from(templateMission).where(eq(templateMission.id, templateMissionId)).get();
      if (!tm) throw new DomainError("NOT_FOUND", "Vorlagen-Mission nicht gefunden.");
      requireOwner(tx, tm.templateId, userId);
      if (Object.keys(input).length) tx.update(templateMission).set(input).where(eq(templateMission.id, templateMissionId)).run();
      if (dependsOn) setTemplateDeps(tx, tm.templateId, templateMissionId, dependsOn);
      tx.update(template).set({ updatedAt: new Date() }).where(eq(template.id, tm.templateId)).run();
      return { id: templateMissionId };
    },
    { behavior: "immediate" },
  );
}

export function deleteTemplateMission(db: Db, userId: string, templateMissionId: string) {
  return db.transaction(
    (tx) => {
      const tm = tx.select().from(templateMission).where(eq(templateMission.id, templateMissionId)).get();
      if (!tm) throw new DomainError("NOT_FOUND", "Vorlagen-Mission nicht gefunden.");
      requireOwner(tx, tm.templateId, userId);
      tx.delete(templateMission).where(eq(templateMission.id, templateMissionId)).run();
      return { id: templateMissionId };
    },
    { behavior: "immediate" },
  );
}

/** Neues Projekt: alle Missionen offen, ohne Verantwortliche; nur die anlegende Person ist Mitglied. */
export function createProjectFromTemplate(db: Db, userId: string, templateId: string, raw: unknown) {
  const input = parse(fromTemplateInput, raw);
  return db.transaction(
    (tx) => {
      const t = requireOwner(tx, templateId, userId);
      const tms = tx.select().from(templateMission).where(eq(templateMission.templateId, templateId)).orderBy(asc(templateMission.position)).all();
      const projectId = randomUUID();
      const now = new Date();
      tx.insert(project)
        .values({ id: projectId, title: input.title, description: t.description, goal: t.goal, eventDate: input.eventDate, status: "active", createdById: userId, createdAt: now, updatedAt: now })
        .run();
      tx.insert(membership).values({ projectId, userId, role: "organizer", joinedAt: now }).run();
      tx.insert(projectVisit).values({ projectId, userId, lastSeenAt: now }).run();
      logActivity(tx, { projectId, actorId: userId, type: "project_created", subject: input.title });
      const idMap = new Map<string, string>();
      for (const tm of tms) {
        const id = randomUUID();
        idMap.set(tm.id, id);
        tx.insert(mission)
          .values({ id, projectId, title: tm.title, description: tm.description, durationMinutes: tm.durationMinutes, energy: tm.energy, status: "open", assigneeId: null, position: tm.position, createdAt: now, updatedAt: now })
          .run();
      }
      const edges = tms.length ? tx.select().from(templateDependency).where(inArray(templateDependency.templateMissionId, tms.map((m) => m.id))).all() : [];
      for (const e of edges) {
        const a = idMap.get(e.templateMissionId);
        const b = idMap.get(e.dependsOnId);
        if (a && b) tx.insert(missionDependency).values({ missionId: a, dependsOnId: b }).run();
      }
      return { id: projectId };
    },
    { behavior: "immediate" },
  );
}
