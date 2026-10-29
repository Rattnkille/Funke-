// Fiktiver Demo-Datensatz „Generationen-Ofen“. Wird nur ausdrücklich per `pnpm db:seed` ausgeführt.
import { randomBytes, randomUUID } from "node:crypto";
import { loadEnv } from "./env";
loadEnv();

const { hashPassword } = await import("better-auth/crypto");
const { databasePath, openDatabase, runMigrations } = await import("../src/db/client");
const schema = await import("../src/db/schema");
const { createProject } = await import("../src/server/projects");
const { createMission, claimMission, completeMission } = await import("../src/server/missions");
const { createInvite, acceptInvite } = await import("../src/server/invites");
const { eq } = await import("drizzle-orm");

const file = databasePath();
const { db, sqlite } = openDatabase(file);
runMigrations(db);

const people = [
  { name: "Ilse Brandt", email: "ilse@demo.funke.test" },
  { name: "Mehmet Kaya", email: "mehmet@demo.funke.test" },
  { name: "Lea Sommer", email: "lea@demo.funke.test" },
];

if (db.select().from(schema.user).where(eq(schema.user.email, people[0]!.email)).get()) {
  console.log("Demo-Daten sind bereits vorhanden. Nichts geändert.");
  sqlite.close();
  process.exit(0);
}

// Kein Standardpasswort: entweder selbst gesetzt oder zufällig erzeugt.
const password = process.env.DEMO_PASSWORD ?? randomBytes(9).toString("base64url");
if (password.length < 10) throw new Error("DEMO_PASSWORD braucht mindestens 10 Zeichen.");
const hash = await hashPassword(password);

const ids = people.map((p) => {
  const id = randomUUID();
  const now = new Date();
  db.insert(schema.user).values({ id, name: p.name, email: p.email, emailVerified: false, adultConfirmed: true, createdAt: now, updatedAt: now }).run();
  db.insert(schema.account).values({ id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: hash, createdAt: now, updatedAt: now }).run();
  return id;
});
const [ilse, mehmet, lea] = ids as [string, string, string];

const { id: projectId } = createProject(db, ilse, {
  title: "Generationen-Ofen",
  description:
    "Pizza-Backtag im Gemeinschaftshof: Jung und Alt backen zusammen im Lehmofen. Kinder und betreute Gäste sind ohne Konto dabei. Alle Angaben sind fiktiv.",
  goal: "Zwölf Pizzen, ein voller Tisch und alle helfen mit",
  eventDate: "2026-11-21",
});
const { token } = createInvite(db, ilse, projectId, { days: 7 });
acceptInvite(db, mehmet, token);
acceptInvite(db, lea, token);

const m = (title: string, description: string, durationMinutes: number, energy: "low" | "medium" | "high", dependsOn: string[] = []) =>
  createMission(db, ilse, projectId, { title, description, durationMinutes, energy, dependsOn }).id;

const holz = m("Holz besorgen", "Zwei Körbe trockenes Buchenholz beim Holzhof abholen und am Ofen stapeln.", 60, "high");
const zettel = m("Aushang schreiben", "Einen Aushang für das Treppenhaus schreiben: Datum, Uhrzeit, was mitbringen.", 20, "low");
const einkauf = m("Zutaten einkaufen", "Mehl, Hefe, Tomaten, Mozzarella und Basilikum nach Einkaufsliste besorgen.", 45, "medium");
const teig = m("Teig ansetzen", "Am Vorabend Teig für zwölf Pizzen ansetzen und kühl lagern.", 40, "medium", [einkauf]);
const sosse = m("Tomatensoße kochen", "Tomaten mit Knoblauch und Oregano einkochen, abkühlen lassen.", 30, "low", [einkauf]);
const ofen = m("Ofen anheizen", "Zwei Stunden vor Beginn einheizen und Temperatur im Blick behalten.", 120, "high", [holz]);
const tische = m("Tische aufstellen", "Drei Biertische mit Bänken aufstellen, einen davon in Kinderhöhe.", 20, "medium");
const backen = m("Pizzen backen", "Pizzen gemeinsam mit den Kindern belegen und nacheinander backen.", 90, "high", [teig, sosse, ofen, tische]);
m("Aufräumen", "Ofen auskehren, Tische abbauen, Müll trennen.", 30, "medium", [backen]);

claimMission(db, lea, zettel);
completeMission(db, lea, zettel);
claimMission(db, mehmet, einkauf);

sqlite.close();
console.log(`Demo-Daten angelegt in ${file}`);
console.log("Anmeldungen (fiktiv):");
for (const p of people) console.log(`  ${p.name}: ${p.email}`);
console.log(process.env.DEMO_PASSWORD ? "Passwort: wie in DEMO_PASSWORD gesetzt." : `Gemeinsames Demo-Passwort (nur jetzt angezeigt): ${password}`);
