// Eigener Prozess mit eigener DB-Verbindung: wartet bis zum gemeinsamen Startzeitpunkt und übernimmt dann.
import { openDatabase } from "@/db/client";
import { claimMission } from "@/server/missions";
import { DomainError } from "@/server/errors";

const [file, userId, missionId, startAt] = process.argv.slice(2) as [string, string, string, string];
const { db } = openDatabase(file);
while (Date.now() < Number(startAt)) {
  /* aktives Warten für möglichst gleichzeitigen Start */
}
try {
  claimMission(db, userId, missionId);
  process.stdout.write(JSON.stringify({ userId, ok: true }));
} catch (e) {
  process.stdout.write(JSON.stringify({ userId, ok: false, code: e instanceof DomainError ? e.code : "ERR", message: (e as Error).message }));
}
