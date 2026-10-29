import { loadEnv } from "./env";
loadEnv();

const { databasePath, openDatabase, runMigrations } = await import("../src/db/client");
const file = databasePath();
const { db, sqlite } = openDatabase(file);
runMigrations(db);
sqlite.close();
console.log(`Migrationen angewendet: ${file}`);
