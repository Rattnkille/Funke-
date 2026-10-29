import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { membership, mission, project, type Role } from "@/db/schema";
import { DomainError, notFound } from "./errors";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0] | Db;

export function getRole(db: Tx, projectId: string, userId: string): Role | null {
  const row = db
    .select({ role: membership.role })
    .from(membership)
    .where(and(eq(membership.projectId, projectId), eq(membership.userId, userId)))
    .get();
  return row?.role ?? null;
}

/** Nichtmitglieder erhalten bewusst „nicht gefunden“, damit keine Projektexistenz preisgegeben wird. */
export function requireMember(db: Tx, projectId: string, userId: string) {
  const role = getRole(db, projectId, userId);
  if (!role) throw notFound();
  const p = db.select().from(project).where(eq(project.id, projectId)).get();
  if (!p) throw notFound();
  return { role, project: p };
}

export function requireOrganizer(db: Tx, projectId: string, userId: string) {
  const ctx = requireMember(db, projectId, userId);
  if (ctx.role !== "organizer") {
    throw new DomainError("FORBIDDEN", "Nur Organisatorinnen und Organisatoren dürfen das.");
  }
  return ctx;
}

export function requireActive(p: { status: string }) {
  if (p.status !== "active") {
    throw new DomainError("CONFLICT", "Dieses Projekt ist abgeschlossen und kann nicht mehr verändert werden.");
  }
}

export function missionContext(db: Tx, missionId: string, userId: string) {
  const m = db.select().from(mission).where(eq(mission.id, missionId)).get();
  if (!m) throw notFound("Mission");
  const role = getRole(db, m.projectId, userId);
  if (!role) throw notFound("Mission");
  const p = db.select().from(project).where(eq(project.id, m.projectId)).get();
  if (!p) throw notFound("Mission");
  return { mission: m, role, project: p };
}
