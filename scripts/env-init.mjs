// Erstellt eine lokale .env mit zufälligem Geheimnis. Überschreibt nie eine bestehende Datei.
import { randomBytes } from "node:crypto";
import fs from "node:fs";

if (fs.existsSync(".env")) {
  console.log(".env existiert bereits, nichts geändert.");
  process.exit(0);
}
const content = [
  "# Lokale Konfiguration für FUNKE. Nicht einchecken.",
  `BETTER_AUTH_SECRET=${randomBytes(32).toString("base64url")}`,
  "BETTER_AUTH_URL=http://localhost:3000",
  "DATABASE_PATH=./data/funke.db",
  "",
].join("\n");
fs.writeFileSync(".env", content, { mode: 0o600 });
console.log(".env erstellt (mit neu erzeugtem Geheimnis).");
