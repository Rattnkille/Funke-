import { and, desc, eq, gt, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "@/db/client";
import { activity, membership, projectVisit, user } from "@/db/schema";
import { requireMember } from "./access";
import { isExecutableFor } from "./focus";
import { loadMissions, type MissionView } from "./missions";

const target = alias(user, "target_user");

export type Change = { id: string; text: string; at: Date };

function describe(type: string, actor: string, subject: string | null, targetName: string | null): string {
  const s = subject ? `„${subject}“` : "eine Mission";
  switch (type) {
    case "member_joined":
      return `${actor} ist dem Projekt beigetreten.`;
    case "mission_created":
      return `${actor} hat die Mission ${s} angelegt.`;
    case "mission_updated":
      return `${actor} hat ${s} überarbeitet.`;
    case "mission_deleted":
      return `${actor} hat ${s} entfernt.`;
    case "mission_claimed":
      return `${actor} hat ${s} übernommen.`;
    case "mission_released":
      return `${actor} hat ${s} zurückgegeben. Sie ist wieder frei.`;
    case "mission_completed":
      return `${actor} hat ${s} abgeschlossen.`;
    case "mission_assigned":
      return `${actor} hat ${s} an ${targetName ?? "ein Mitglied"} übergeben.`;
    case "mission_unassigned":
      return `${actor} hat ${s} wieder freigegeben.`;
    case "project_updated":
      return `${actor} hat die Projektangaben geändert.`;
    case "project_completed":
      return `${actor} hat das Projekt abgeschlossen.`;
    default:
      return `${actor} hat etwas geändert.`;
  }
}

export function nextStepFor(missions: MissionView[], userId: string): MissionView | null {
  const mine = missions.find((m) => m.assigneeId === userId && m.state === "übernommen");
  if (mine) return mine;
  const free = missions
    .filter((m) => isExecutableFor(m, userId))
    .sort((a, b) => b.unlocks.length - a.unlocks.length || a.durationMinutes - b.durationMinutes || a.position - b.position);
  return free[0] ?? null;
}

/** Tatsächliche Änderungen anderer seit dem letzten bestätigten Besuch und ein nächster möglicher Schritt. */
export function getReentry(db: Db, userId: string, projectId: string, limit = 12) {
  requireMember(db, projectId, userId);
  const visit = db
    .select({ lastSeenAt: projectVisit.lastSeenAt })
    .from(projectVisit)
    .where(and(eq(projectVisit.projectId, projectId), eq(projectVisit.userId, userId)))
    .get();
  const joined = db
    .select({ joinedAt: membership.joinedAt })
    .from(membership)
    .where(and(eq(membership.projectId, projectId), eq(membership.userId, userId)))
    .get();
  const since = visit?.lastSeenAt ?? joined?.joinedAt ?? new Date(0);
  const where = and(eq(activity.projectId, projectId), gt(activity.createdAt, since), ne(activity.actorId, userId));
  const total = db.select({ n: sql<number>`count(*)` }).from(activity).where(where).get()?.n ?? 0;
  const rows = db
    .select({ a: activity, actor: user.name, targetName: target.name })
    .from(activity)
    .leftJoin(user, eq(user.id, activity.actorId))
    .leftJoin(target, eq(target.id, activity.targetUserId))
    .where(where)
    .orderBy(desc(activity.createdAt))
    .limit(limit)
    .all();
  const changes: Change[] = rows.map((r) => ({
    id: r.a.id,
    text: describe(r.a.type, r.actor ?? "Jemand", r.a.subject, r.a.targetUserId === userId ? "dich" : r.targetName),
    at: r.a.createdAt,
  }));
  const missions = loadMissions(db, [projectId]);
  return { since, total, changes, nextStep: nextStepFor(missions, userId) };
}

export function markSeen(db: Db, userId: string, projectId: string, at = Date.now()) {
  requireMember(db, projectId, userId);
  db.insert(projectVisit)
    .values({ projectId, userId, lastSeenAt: new Date(at) })
    .onConflictDoUpdate({ target: [projectVisit.projectId, projectVisit.userId], set: { lastSeenAt: new Date(at) } })
    .run();
  return { ok: true };
}
