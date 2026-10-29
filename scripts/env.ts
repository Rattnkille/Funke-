import fs from "node:fs";

/** Lädt .env für Skripte außerhalb von Next.js (Next liest .env selbst). */
export function loadEnv() {
  if (fs.existsSync(".env")) process.loadEnvFile(".env");
}
