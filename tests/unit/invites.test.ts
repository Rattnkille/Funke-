import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addUser, freshDb, PROJECT } from "./helpers";
import { DomainError } from "@/server/errors";
import { createProject, getProject } from "@/server/projects";
import { acceptInvite, createInvite, hashToken, listInvites, previewInvite, revokeInvite } from "@/server/invites";
import { invite } from "@/db/schema";
import type { Db } from "@/db/client";

let ctx: ReturnType<typeof freshDb>;
let db: Db;
beforeEach(() => {
  ctx = freshDb();
  db = ctx.db;
});
afterEach(() => ctx.close());

const DAY = 86_400_000;

function err(fn: () => unknown): DomainError {
  try {
    fn();
  } catch (e) {
    return e as DomainError;
  }
  throw new Error("Fehler erwartet");
}

describe("Einladungen (A2, A6)", () => {
  it("gültiger Link: Beitritt als Mitglied, Token nur als Hash gespeichert", () => {
    const orga = addUser(db, "Ilse");
    const lea = addUser(db, "Lea");
    const { id } = createProject(db, orga, PROJECT);
    const inv = createInvite(db, orga, id, { days: 3 });
    const stored = db.select().from(invite).all();
    expect(stored[0]!.tokenHash).toBe(hashToken(inv.token));
    expect(JSON.stringify(stored)).not.toContain(inv.token);
    expect(previewInvite(db, lea, inv.token).title).toBe(PROJECT.title);
    expect(acceptInvite(db, lea, inv.token)).toEqual({ projectId: id, joined: true });
    expect(getProject(db, lea, id).role).toBe("member");
    // erneutes Annehmen ist harmlos
    expect(acceptInvite(db, lea, inv.token).joined).toBe(false);
    expect(listInvites(db, orga, id)[0]!.useCount).toBe(1);
  });

  it("abgelaufene Einladungen werden abgewiesen", () => {
    const orga = addUser(db, "Ilse");
    const lea = addUser(db, "Lea");
    const { id } = createProject(db, orga, PROJECT);
    const t0 = Date.now();
    const inv = createInvite(db, orga, id, { days: 1 }, t0);
    const e = err(() => acceptInvite(db, lea, inv.token, t0 + DAY + 1));
    expect(e.code).toBe("GONE");
    expect(e.message).toMatch(/abgelaufen/);
    expect(err(() => previewInvite(db, lea, inv.token, t0 + 2 * DAY)).code).toBe("GONE");
    expect(err(() => getProject(db, lea, id)).code).toBe("NOT_FOUND");
    expect(listInvites(db, orga, id, )[0]!.status).toBe("aktiv"); // reale Uhr: noch nicht abgelaufen
  });

  it("widerrufene Einladungen werden abgewiesen", () => {
    const orga = addUser(db, "Ilse");
    const lea = addUser(db, "Lea");
    const { id } = createProject(db, orga, PROJECT);
    const inv = createInvite(db, orga, id, {});
    revokeInvite(db, orga, inv.id);
    const e = err(() => acceptInvite(db, lea, inv.token));
    expect(e.code).toBe("GONE");
    expect(e.message).toMatch(/zurückgezogen/);
    expect(listInvites(db, orga, id)[0]!.status).toBe("widerrufen");
    expect(err(() => getProject(db, lea, id)).code).toBe("NOT_FOUND");
  });

  it("unbekannte oder manipulierte Tokens werden abgewiesen", () => {
    const orga = addUser(db, "Ilse");
    const lea = addUser(db, "Lea");
    const { id } = createProject(db, orga, PROJECT);
    const inv = createInvite(db, orga, id, {});
    expect(err(() => acceptInvite(db, lea, inv.token.slice(0, -2) + "xx")).code).toBe("NOT_FOUND");
    expect(err(() => acceptInvite(db, lea, "kurz")).code).toBe("NOT_FOUND");
  });

  it("Gültigkeit ist auf 1 bis 14 Tage begrenzt", () => {
    const orga = addUser(db, "Ilse");
    const { id } = createProject(db, orga, PROJECT);
    expect(err(() => createInvite(db, orga, id, { days: 30 })).code).toBe("INVALID");
    expect(err(() => createInvite(db, orga, id, { days: 0 })).code).toBe("INVALID");
  });
});
