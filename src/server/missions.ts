import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { membership, mission, missionDependency, user, type Energy, type StoredMissionStatus } from "@/db/schema";
import { missionContext, requireActive, requireMember, requireOrganizer, type Tx } from "./access";
import { logActivity } from "./activity";
import { DomainError } from "./errors";
import { buildDependencyMap, dependentCounts, wouldCreateCycle } from "./graph";
import { missionInput, missionUpdate, parse, assignInput } from "./validation";

export type MissionState = "offen" | "übernommen" | "blockiert" | "abgeschlossen";

export type MissionView = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  durationMinutes: number;
  energy: Energy;
  storedStatus: StoredMissionStatus;
  state: MissionState;
  assigneeId: string | null;
  assigneeName: string | null;
  dependsOn: { id: string; title: string; done: boolean }[];
  unlocks: string[];
  position: number;
  completedAt: Date | null;
};

export function stateOf(storedStatus: StoredMissionStatus, prerequisitesDone: boolean, assigneeId: string | null): MissionState {
  if (storedStatus === "done") return "abgeschlossen";
  if (!prerequisitesDone) return "blockiert";
  return assigneeId ? "übernommen" : "offen";
}

export function loadMissions(db: Tx, projectIds: string[]): MissionView[] {
  if (projectIds.length === 0) return [];
  const rows = db
    .select({ m: mission, assigneeName: user.name })
    .from(mission)
    .leftJoin(user, eq(user.id, mission.assigneeId))
    .where(inArray(mission.projectId, projectIds))
    .orderBy(asc(mission.position), asc(mission.createdAt))
    .all();
  const ids = rows.map((r) => r.m.id);
  const edges = ids.length
    ? db.select().from(missionDependency).where(inArray(missionDependency.missionId, ids)).all()
    : [];
  const deps = buildDependencyMap(edges);
  const dependents = dependentCounts(deps);
  const byId = new Map(rows.map((r) => [r.m.id, r.m]));
  return rows.map(({ m, assigneeName }) => {
    const pre = (deps.get(m.id) ?? []).map((id) => {
      const p = byId.get(id);
      return { id, title: p?.title ?? "?", done: p?.status === "done" };
    });
    const preDone = pre.every((p) => p.done);
    return {
      id: m.id,
      projectId: m.projectId,
      title: m.title,
      description: m.description,
      durationMinutes: m.durationMinutes,
      energy: m.energy,
      storedStatus: m.status,
      state: stateOf(m.status, preDone, m.assigneeId),
      assigneeId: m.assigneeId,
      assigneeName: m.assigneeId ? (assigneeName ?? "Unbekannt") : null,
      dependsOn: pre,
      unlocks: (dependents.get(m.id) ?? []).filter((id) => byId.get(id)?.status !== "done"),
      position: m.position,
      completedAt: m.completedAt,
    };
  });
}

export function listMissions(db: Db, userId: string, projectId: string) {
  requireMember(db, projectId, userId);
  return loadMissions(db, [projectId]);
}

function checkDependencies(db: Tx, projectId: string, missionId: string, dependsOn: string[]) {
  const unique = [...new Set(dependsOn)];
  if (unique.length === 0) return unique;
  const found = db
    .select({ id: mission.id })
    .from(mission)
    .where(and(eq(mission.projectId, projectId), inArray(mission.id, unique)))
    .all();
  if (found.length !== unique.length) {
    throw new DomainError("INVALID", "Voraussetzungen müssen Missionen desselben Projekts sein.");
  }
  const projectMissionIds = db.select({ id: mission.id }).from(mission).where(eq(mission.projectId, projectId)).all().map((r) => r.id);
  const edges = projectMissionIds.length
    ? db.select().from(missionDependency).where(inArray(missionDependency.missionId, projectMissionIds)).all()
    : [];
  const deps = buildDependencyMap(edges.filter((e) => e.missionId !== missionId));
  if (wouldCreateCycle(deps, missionId, unique)) {
    throw new DomainError(
      "INVALID",
      "Diese Abhängigkeit würde einen Kreis bilden: Missionen würden aufeinander warten. Bitte wähle andere Voraussetzungen.",
      { dependsOn: "Zirkuläre Abhängigkeit" },
    );
  }
  return unique;
}

export function createMission(db: Db, userId: string, projectId: string, raw: unknown) {
  const input = parse(missionInput, raw);
  return db.transaction(
    (tx) => {
      const { project: p } = requireOrganizer(tx, projectId, userId);
      requireActive(p);
      const id = randomUUID();
      const deps = checkDependencies(tx, projectId, id, input.dependsOn);
      const maxPos = tx
        .select({ max: sql<number>`coalesce(max(${mission.position}), 0)` })
        .from(mission)
        .where(eq(mission.projectId, projectId))
        .get();
      const now = new Date();
      tx.insert(mission)
        .values({
          id,
          projectId,
          title: input.title,
          description: input.description,
          durationMinutes: input.durationMinutes,
          energy: input.energy,
          status: "open",
          position: (maxPos?.max ?? 0) + 1,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      for (const d of deps) tx.insert(missionDependency).values({ missionId: id, dependsOnId: d }).run();
      logActivity(tx, { projectId, actorId: userId, type: "mission_created", missionId: id, subject: input.title });
      return { id };
    },
    { behavior: "immediate" },
  );
}

export function updateMission(db: Db, userId: string, missionId: string, raw: unknown) {
  const input = parse(missionUpdate, raw);
  return db.transaction(
    (tx) => {
      const { mission: m, project: p, role } = missionContext(tx, missionId, userId);
      if (role !== "organizer") throw new DomainError("FORBIDDEN", "Nur Organisatorinnen und Organisatoren dürfen Missionen bearbeiten.");
      requireActive(p);
      const { dependsOn, ...fields } = input;
      if (Object.keys(fields).length) {
        tx.update(mission).set({ ...fields, updatedAt: new Date() }).where(eq(mission.id, missionId)).run();
      }
      if (dependsOn) {
        const deps = checkDependencies(tx, m.projectId, missionId, dependsOn);
        if (m.status === "done" && deps.length) {
          const undone = tx
            .select({ id: mission.id })
            .from(mission)
            .where(and(inArray(mission.id, deps), sql`${mission.status} != 'done'`))
            .all();
          if (undone.length) {
            throw new DomainError("CONFLICT", "Eine abgeschlossene Mission kann keine offenen Voraussetzungen bekommen.");
          }
        }
        tx.delete(missionDependency).where(eq(missionDependency.missionId, missionId)).run();
        for (const d of deps) tx.insert(missionDependency).values({ missionId, dependsOnId: d }).run();
      }
      logActivity(tx, { projectId: m.projectId, actorId: userId, type: "mission_updated", missionId, subject: fields.title ?? m.title });
      return { id: missionId };
    },
    { behavior: "immediate" },
  );
}

export function deleteMission(db: Db, userId: string, missionId: string) {
  return db.transaction(
    (tx) => {
      const { mission: m, project: p, role } = missionContext(tx, missionId, userId);
      if (role !== "organizer") throw new DomainError("FORBIDDEN", "Nur Organisatorinnen und Organisatoren dürfen Missionen löschen.");
      requireActive(p);
      if (m.status === "done") throw new DomainError("CONFLICT", "Abgeschlossene Missionen bleiben erhalten und können nicht gelöscht werden.");
      tx.delete(mission).where(eq(mission.id, missionId)).run();
      logActivity(tx, { projectId: m.projectId, actorId: userId, type: "mission_deleted", subject: m.title });
      return { id: missionId };
    },
    { behavior: "immediate" },
  );
}

// Bewusst als Roh-SQL mit vollem Tabellenbezug, damit sich "mission"."id" im UPDATE auf die äußere Zeile bezieht.
const unfinishedPrerequisites = sql.raw(`exists (
  select 1 from "mission_dependency" d join "mission" pre on pre."id" = d."depends_on_id"
  where d."mission_id" = "mission"."id" and pre."status" != 'done')`);

function openPrerequisiteTitles(db: Tx, missionId: string) {
  return db
    .select({ title: mission.title })
    .from(missionDependency)
    .innerJoin(mission, eq(mission.id, missionDependency.dependsOnId))
    .where(and(eq(missionDependency.missionId, missionId), sql`${mission.status} != 'done'`))
    .orderBy(asc(mission.position))
    .all()
    .map((r) => `„${r.title}“`);
}

/** „A“, „A und B“, „A, B und C“ samt passendem Verb. */
export function listDe(items: string[]) {
  const text = items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} und ${items.at(-1)}`;
  return { text, must: items.length > 1 ? "müssen" : "muss" };
}

function nameOf(db: Tx, userId: string | null) {
  if (!userId) return "jemand";
  return db.select({ name: user.name }).from(user).where(eq(user.id, userId)).get()?.name ?? "jemand";
}

/**
 * Übernahme als einzelne bedingte Aktualisierung: Nur wenn die Mission in genau diesem Moment
 * noch frei, offen und ausführbar ist, wird sie vergeben. Konkurrierende Anfragen sehen 0 Änderungen.
 */
export function claimMission(db: Db, userId: string, missionId: string) {
  return db.transaction(
    (tx) => {
      const { mission: m, project: p } = missionContext(tx, missionId, userId);
      requireActive(p);
      const result = tx
        .update(mission)
        .set({ status: "claimed", assigneeId: userId, updatedAt: new Date() })
        .where(
          and(
            eq(mission.id, missionId),
            eq(mission.status, "open"),
            sql`${mission.assigneeId} is null`,
            sql`not ${unfinishedPrerequisites}`,
          ),
        )
        .run();
      if (result.changes === 1) {
        logActivity(tx, { projectId: m.projectId, actorId: userId, type: "mission_claimed", missionId, subject: m.title });
        return { id: missionId, claimed: true as const };
      }
      const current = tx.select().from(mission).where(eq(mission.id, missionId)).get()!;
      if (current.status === "done") throw new DomainError("CONFLICT", "Diese Mission ist bereits abgeschlossen.");
      if (current.assigneeId === userId) return { id: missionId, claimed: true as const };
      if (current.assigneeId) {
        throw new DomainError("CONFLICT", `${nameOf(tx, current.assigneeId)} hat diese Mission gerade übernommen. Schau dir eine andere freie Mission an.`);
      }
      const open = openPrerequisiteTitles(tx, missionId);
      if (open.length) {
        const l = listDe(open);
        throw new DomainError("CONFLICT", `Diese Mission ist noch blockiert. Zuerst ${l.must} ${l.text} abgeschlossen sein.`);
      }
      throw new DomainError("CONFLICT", "Diese Mission kann gerade nicht übernommen werden.");
    },
    { behavior: "immediate" },
  );
}

export function releaseMission(db: Db, userId: string, missionId: string) {
  return db.transaction(
    (tx) => {
      const { mission: m, project: p } = missionContext(tx, missionId, userId);
      requireActive(p);
      const result = tx
        .update(mission)
        .set({ status: "open", assigneeId: null, updatedAt: new Date() })
        .where(and(eq(mission.id, missionId), eq(mission.status, "claimed"), eq(mission.assigneeId, userId)))
        .run();
      if (result.changes !== 1) {
        throw new DomainError("CONFLICT", "Du kannst nur Missionen zurückgeben, die du selbst übernommen hast.");
      }
      logActivity(tx, { projectId: m.projectId, actorId: userId, type: "mission_released", missionId, subject: m.title });
      return { id: missionId };
    },
    { behavior: "immediate" },
  );
}

export function completeMission(db: Db, userId: string, missionId: string) {
  return db.transaction(
    (tx) => {
      const { mission: m, project: p } = missionContext(tx, missionId, userId);
      requireActive(p);
      const now = new Date();
      const result = tx
        .update(mission)
        .set({ status: "done", completedAt: now, updatedAt: now })
        .where(
          and(
            eq(mission.id, missionId),
            eq(mission.status, "claimed"),
            eq(mission.assigneeId, userId),
            sql`not ${unfinishedPrerequisites}`,
          ),
        )
        .run();
      if (result.changes !== 1) {
        if (m.status === "done") throw new DomainError("CONFLICT", "Diese Mission ist bereits abgeschlossen.");
        const open = openPrerequisiteTitles(tx, missionId);
        if (open.length) {
          const l = listDe(open);
          throw new DomainError("CONFLICT", `Zuerst ${l.must} ${l.text} abgeschlossen sein.`);
        }
        throw new DomainError("CONFLICT", "Du kannst nur Missionen abschließen, die du selbst übernommen hast.");
      }
      logActivity(tx, { projectId: m.projectId, actorId: userId, type: "mission_completed", missionId, subject: m.title });
      return { id: missionId };
    },
    { behavior: "immediate" },
  );
}

/** Organisatorinnen korrigieren Zuständigkeiten: neu zuweisen oder freigeben. */
export function assignMission(db: Db, userId: string, missionId: string, raw: unknown) {
  const { userId: target } = parse(assignInput, raw);
  return db.transaction(
    (tx) => {
      const { mission: m, project: p, role } = missionContext(tx, missionId, userId);
      if (role !== "organizer") throw new DomainError("FORBIDDEN", "Nur Organisatorinnen und Organisatoren dürfen Zuständigkeiten ändern.");
      requireActive(p);
      if (m.status === "done") throw new DomainError("CONFLICT", "Abgeschlossene Missionen behalten ihre Zuständigkeit.");
      if (target === null) {
        tx.update(mission).set({ status: "open", assigneeId: null, updatedAt: new Date() }).where(eq(mission.id, missionId)).run();
        logActivity(tx, { projectId: m.projectId, actorId: userId, type: "mission_unassigned", missionId, subject: m.title, targetUserId: m.assigneeId });
        return { id: missionId };
      }
      const isMember = tx
        .select({ u: membership.userId })
        .from(membership)
        .where(and(eq(membership.projectId, m.projectId), eq(membership.userId, target)))
        .get();
      if (!isMember) throw new DomainError("INVALID", "Diese Person ist kein Mitglied des Projekts.");
      const open = openPrerequisiteTitles(tx, missionId);
      if (open.length) {
        const l = listDe(open);
        throw new DomainError("CONFLICT", `Die Mission ist blockiert, bis ${l.text} abgeschlossen ${open.length > 1 ? "sind" : "ist"}.`);
      }
      tx.update(mission).set({ status: "claimed", assigneeId: target, updatedAt: new Date() }).where(eq(mission.id, missionId)).run();
      logActivity(tx, { projectId: m.projectId, actorId: userId, type: "mission_assigned", missionId, subject: m.title, targetUserId: target });
      return { id: missionId };
    },
    { behavior: "immediate" },
  );
}
