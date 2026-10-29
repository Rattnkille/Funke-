import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDatabase, runMigrations, type Db } from "@/db/client";
import { user } from "@/db/schema";
import { createProject } from "@/server/projects";
import { createMission } from "@/server/missions";
import { createInvite, acceptInvite } from "@/server/invites";

/** Jede Testdatei erhält eine eigene, frisch migrierte Wegwerf-Datenbank. */
export function freshDb(): { db: Db; file: string; close: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "funke-test-"));
  const file = path.join(dir, "test.db");
  const { db, sqlite } = openDatabase(file);
  runMigrations(db);
  return { db, file, close: () => { sqlite.close(); fs.rmSync(dir, { recursive: true, force: true }); } };
}

export function addUser(db: Db, name: string) {
  const id = randomUUID();
  db.insert(user).values({ id, name, email: `${name.toLowerCase()}-${id.slice(0, 6)}@beispiel.test`, adultConfirmed: true }).run();
  return id;
}

export const PROJECT = {
  title: "Generationen-Ofen",
  description: "Gemeinsamer Pizza-Backtag im Hof (fiktiv).",
  goal: "Zwölf Pizzen aus dem Lehmofen",
  eventDate: "2026-11-21",
};

export const missionData = (title: string, extra: Record<string, unknown> = {}) => ({
  title,
  description: `Konkrete Handlung für ${title}.`,
  durationMinutes: 30,
  energy: "medium",
  ...extra,
});

/** Organisatorin + Mitglied in einem Projekt, plus ein Nichtmitglied. */
export function scenario(db: Db) {
  const orga = addUser(db, "Ilse");
  const member = addUser(db, "Mehmet");
  const outsider = addUser(db, "Fremd");
  const { id: projectId } = createProject(db, orga, PROJECT);
  const { token } = createInvite(db, orga, projectId, { days: 7 });
  acceptInvite(db, member, token);
  return { orga, member, outsider, projectId, token, mission: (t: string, x = {}) => createMission(db, orga, projectId, missionData(t, x)).id };
}
