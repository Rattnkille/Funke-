import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { activity, membership, mission, project, projectVisit, user } from "@/db/schema";
import { requireActive, requireMember, requireOrganizer } from "./access";
import { logActivity } from "./activity";
import { DomainError } from "./errors";
import { loadMissions } from "./missions";
import { parse, projectInput } from "./validation";

export function progressOf(missions: { storedStatus: string }[]) {
  const total = missions.length;
  const done = missions.filter((m) => m.storedStatus === "done").length;
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function createProject(db: Db, userId: string, raw: unknown) {
  const input = parse(projectInput, raw);
  return db.transaction(
    (tx) => {
      const id = randomUUID();
      const now = new Date();
      tx.insert(project).values({ id, ...input, status: "active", createdById: userId, createdAt: now, updatedAt: now }).run();
      tx.insert(membership).values({ projectId: id, userId, role: "organizer", joinedAt: now }).run();
      tx.insert(projectVisit).values({ projectId: id, userId, lastSeenAt: now }).run();
      logActivity(tx, { projectId: id, actorId: userId, type: "project_created", subject: input.title });
      return { id };
    },
    { behavior: "immediate" },
  );
}

export function updateProject(db: Db, userId: string, projectId: string, raw: unknown) {
  const input = parse(projectInput, raw);
  return db.transaction(
    (tx) => {
      const { project: p } = requireOrganizer(tx, projectId, userId);
      requireActive(p);
      tx.update(project).set({ ...input, updatedAt: new Date() }).where(eq(project.id, projectId)).run();
      logActivity(tx, { projectId, actorId: userId, type: "project_updated", subject: input.title });
      return { id: projectId };
    },
    { behavior: "immediate" },
  );
}

export function listMyProjects(db: Db, userId: string) {
  const rows = db
    .select({ p: project, role: membership.role, lastSeenAt: projectVisit.lastSeenAt, joinedAt: membership.joinedAt })
    .from(membership)
    .innerJoin(project, eq(project.id, membership.projectId))
    .leftJoin(projectVisit, and(eq(projectVisit.projectId, project.id), eq(projectVisit.userId, userId)))
    .where(eq(membership.userId, userId))
    .orderBy(asc(project.status), desc(project.updatedAt))
    .all();
  const missions = loadMissions(db, rows.map((r) => r.p.id));
  return rows.map((r) => {
    const since = r.lastSeenAt ?? r.joinedAt;
    const changes = db
      .select({ n: sql<number>`count(*)` })
      .from(activity)
      .where(and(eq(activity.projectId, r.p.id), gt(activity.createdAt, since), ne(activity.actorId, userId)))
      .get();
    const own = missions.filter((m) => m.projectId === r.p.id);
    return {
      ...r.p,
      role: r.role,
      progress: progressOf(own),
      openForMe: own.filter((m) => m.assigneeId === userId && m.storedStatus === "claimed").length,
      changesSinceVisit: changes?.n ?? 0,
    };
  });
}

export function getProject(db: Db, userId: string, projectId: string) {
  const { role, project: p } = requireMember(db, projectId, userId);
  const missions = loadMissions(db, [projectId]);
  const members = db
    .select({ id: user.id, name: user.name, role: membership.role, joinedAt: membership.joinedAt })
    .from(membership)
    .innerJoin(user, eq(user.id, membership.userId))
    .where(eq(membership.projectId, projectId))
    .orderBy(asc(membership.joinedAt))
    .all();
  const openItems = missions.filter((m) => m.storedStatus !== "done");
  return {
    project: p,
    role,
    missions,
    members,
    progress: progressOf(missions),
    canComplete: p.status === "active" && missions.length > 0 && openItems.length === 0,
    openItems,
  };
}

export function completeProject(db: Db, userId: string, projectId: string) {
  return db.transaction(
    (tx) => {
      const { project: p } = requireOrganizer(tx, projectId, userId);
      requireActive(p);
      const open = tx
        .select({ title: mission.title })
        .from(mission)
        .where(and(eq(mission.projectId, projectId), ne(mission.status, "done")))
        .all();
      const total = tx.select({ n: sql<number>`count(*)` }).from(mission).where(eq(mission.projectId, projectId)).get();
      if (!total || total.n === 0) {
        throw new DomainError("CONFLICT", "Ein Projekt ohne Missionen kann nicht abgeschlossen werden.");
      }
      if (open.length) {
        throw new DomainError(
          "CONFLICT",
          `Noch nicht alles erledigt. Offen: ${open.map((o) => `„${o.title}“`).join(", ")}.`,
          { open: open.map((o) => o.title).join("\n") },
        );
      }
      const now = new Date();
      tx.update(project).set({ status: "completed", completedAt: now, updatedAt: now }).where(eq(project.id, projectId)).run();
      logActivity(tx, { projectId, actorId: userId, type: "project_completed", subject: p.title });
      return { id: projectId };
    },
    { behavior: "immediate" },
  );
}

export function projectsByIds(db: Db, ids: string[]) {
  if (!ids.length) return [];
  return db.select().from(project).where(inArray(project.id, ids)).all();
}
