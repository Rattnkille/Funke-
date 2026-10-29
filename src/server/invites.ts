import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { invite, membership, project, projectVisit } from "@/db/schema";
import { requireActive, requireOrganizer } from "./access";
import { logActivity } from "./activity";
import { DomainError } from "./errors";
import { inviteInput, parse } from "./validation";

const DAY = 24 * 60 * 60 * 1000;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type InviteStatus = "aktiv" | "abgelaufen" | "widerrufen";

export function inviteStatus(row: { expiresAt: Date; revokedAt: Date | null }, now = Date.now()): InviteStatus {
  if (row.revokedAt) return "widerrufen";
  if (row.expiresAt.getTime() <= now) return "abgelaufen";
  return "aktiv";
}

/** Erzeugt einen Einladungslink. Das Klartext-Token wird nur einmal zurückgegeben, gespeichert wird nur sein Hash. */
export function createInvite(db: Db, userId: string, projectId: string, raw: unknown, now = Date.now()) {
  const { days } = parse(inviteInput, raw ?? {});
  return db.transaction(
    (tx) => {
      const { project: p } = requireOrganizer(tx, projectId, userId);
      requireActive(p);
      const token = randomBytes(32).toString("base64url");
      const id = randomUUID();
      const expiresAt = new Date(now + days * DAY);
      tx.insert(invite)
        .values({ id, projectId, tokenHash: hashToken(token), createdById: userId, expiresAt, createdAt: new Date(now) })
        .run();
      return { id, token, expiresAt };
    },
    { behavior: "immediate" },
  );
}

export function listInvites(db: Db, userId: string, projectId: string) {
  requireOrganizer(db, projectId, userId);
  return db
    .select()
    .from(invite)
    .where(eq(invite.projectId, projectId))
    .orderBy(desc(invite.createdAt))
    .all()
    .map((i) => ({ id: i.id, createdAt: i.createdAt, expiresAt: i.expiresAt, revokedAt: i.revokedAt, useCount: i.useCount, status: inviteStatus(i) }));
}

export function revokeInvite(db: Db, userId: string, inviteId: string) {
  return db.transaction(
    (tx) => {
      const row = tx.select().from(invite).where(eq(invite.id, inviteId)).get();
      if (!row) throw new DomainError("NOT_FOUND", "Einladung nicht gefunden.");
      requireOrganizer(tx, row.projectId, userId);
      if (!row.revokedAt) tx.update(invite).set({ revokedAt: new Date() }).where(eq(invite.id, inviteId)).run();
      return { id: inviteId };
    },
    { behavior: "immediate" },
  );
}

function validInvite(db: Parameters<Parameters<Db["transaction"]>[0]>[0] | Db, token: string, now: number) {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) {
    throw new DomainError("NOT_FOUND", "Diese Einladung gibt es nicht. Bitte frag nach einem neuen Link.");
  }
  const row = db.select().from(invite).where(eq(invite.tokenHash, hashToken(token))).get();
  if (!row) throw new DomainError("NOT_FOUND", "Diese Einladung gibt es nicht. Bitte frag nach einem neuen Link.");
  const status = inviteStatus(row, now);
  if (status === "widerrufen") throw new DomainError("GONE", "Diese Einladung wurde zurückgezogen. Bitte frag nach einem neuen Link.");
  if (status === "abgelaufen") throw new DomainError("GONE", "Diese Einladung ist abgelaufen. Bitte frag nach einem neuen Link.");
  const p = db.select().from(project).where(eq(project.id, row.projectId)).get();
  if (!p) throw new DomainError("NOT_FOUND", "Dieses Projekt gibt es nicht mehr.");
  if (p.status !== "active") throw new DomainError("GONE", "Dieses Projekt ist bereits abgeschlossen.");
  return { row, project: p };
}

/** Vorschau für angemeldete Personen mit gültigem Link: nur Titel und Ziel, keine Mitglieder oder Missionen. */
export function previewInvite(db: Db, userId: string, token: string, now = Date.now()) {
  const { row, project: p } = validInvite(db, token, now);
  const already = db
    .select({ role: membership.role })
    .from(membership)
    .where(and(eq(membership.projectId, p.id), eq(membership.userId, userId)))
    .get();
  return { projectId: p.id, title: p.title, goal: p.goal, eventDate: p.eventDate, expiresAt: row.expiresAt, alreadyMember: !!already };
}

export function acceptInvite(db: Db, userId: string, token: string, now = Date.now()) {
  return db.transaction(
    (tx) => {
      const { row, project: p } = validInvite(tx, token, now);
      requireActive(p);
      const existing = tx
        .select({ role: membership.role })
        .from(membership)
        .where(and(eq(membership.projectId, p.id), eq(membership.userId, userId)))
        .get();
      if (existing) return { projectId: p.id, joined: false };
      const at = new Date(now);
      tx.insert(membership).values({ projectId: p.id, userId, role: "member", joinedAt: at }).run();
      tx.insert(projectVisit).values({ projectId: p.id, userId, lastSeenAt: at }).onConflictDoNothing().run();
      tx.update(invite).set({ useCount: sql`${invite.useCount} + 1` }).where(eq(invite.id, row.id)).run();
      logActivity(tx, { projectId: p.id, actorId: userId, type: "member_joined", at: now });
      return { projectId: p.id, joined: true };
    },
    { behavior: "immediate" },
  );
}
