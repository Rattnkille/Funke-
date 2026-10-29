import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

export function databasePath(): string {
  return path.resolve(process.env.DATABASE_PATH ?? "./data/funke.db");
}

export function openDatabase(file: string): { db: Db; sqlite: Database.Database } {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return { db: drizzle(sqlite, { schema }), sqlite };
}

export function runMigrations(db: Db) {
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
}

const globalForDb = globalThis as unknown as { __funkeDb?: Db };

/** Gemeinsame Verbindung des Serverprozesses. */
export function getDb(): Db {
  if (!globalForDb.__funkeDb) {
    globalForDb.__funkeDb = openDatabase(databasePath()).db;
  }
  return globalForDb.__funkeDb;
}
