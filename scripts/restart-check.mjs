// A12: Daten bleiben nach einem echten Neustart der Anwendung erhalten.
// Startet den Produktionsserver auf eigener Wegwerf-Datenbank, legt Daten an, beendet den Prozess,
// startet neu und liest die Daten mit einer neuen Anmeldung wieder.
import { spawn, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";

const PORT = 3200;
const BASE = `http://localhost:${PORT}`;
const DIR = "./data/restart-check";
const env = {
  ...process.env,
  DATABASE_PATH: `${DIR}/funke-restart.db`,
  BETTER_AUTH_URL: BASE,
  BETTER_AUTH_SECRET: randomBytes(32).toString("base64url"),
  FUNKE_DISABLE_RATE_LIMIT: "1",
};

function fail(msg) {
  console.error(`A12 FEHLGESCHLAGEN: ${msg}`);
  process.exitCode = 1;
}

async function waitUp() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${BASE}/anmelden`);
      if (r.ok) return;
    } catch {
      /* noch nicht bereit */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Server startet nicht");
}

function start() {
  const child = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], { env, stdio: ["ignore", "pipe", "pipe"] });
  child.stderr.on("data", (d) => process.stderr.write(d));
  return child;
}

async function stop(child) {
  const exited = new Promise((r) => child.once("exit", r));
  child.kill("SIGTERM");
  await exited;
}

const json = { "content-type": "application/json", origin: BASE };
async function signIn(email, password, up = false) {
  const r = await fetch(`${BASE}/api/auth/${up ? "sign-up" : "sign-in"}/email`, {
    method: "POST",
    headers: json,
    body: JSON.stringify(up ? { email, password, name: "Neustart Test", adultConfirmed: true } : { email, password }),
  });
  if (!r.ok) throw new Error(`Anmeldung fehlgeschlagen: ${r.status} ${await r.text()}`);
  return r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

fs.rmSync(DIR, { recursive: true, force: true });
execFileSync("pnpm", ["db:migrate"], { env, stdio: "inherit" });

const email = `neustart-${Date.now()}@e2e.funke.test`;
const password = randomBytes(12).toString("base64url");
let server = start();
try {
  await waitUp();
  const cookie = await signIn(email, password, true);
  const p = await fetch(`${BASE}/api/projects`, { method: "POST", headers: { ...json, cookie }, body: JSON.stringify({ title: "Neustart-Ofen", description: "Bleibt erhalten.", goal: "Persistenz" }) });
  const { id } = await p.json();
  const m = await fetch(`${BASE}/api/projects/${id}/missions`, { method: "POST", headers: { ...json, cookie }, body: JSON.stringify({ title: "Holz stapeln", description: "Holz neben dem Ofen stapeln.", durationMinutes: 20, energy: "low" }) });
  const mission = await m.json();
  await fetch(`${BASE}/api/missions/${mission.id}/claim`, { method: "POST", headers: { ...json, cookie } });
  console.log(`Vor Neustart: Projekt ${id} mit übernommener Mission angelegt (PID ${server.pid}).`);

  await stop(server);
  console.log("Server beendet. Starte neu …");
  server = start();
  await waitUp();
  console.log(`Neuer Serverprozess PID ${server.pid}.`);

  const cookie2 = await signIn(email, password);
  const view = await (await fetch(`${BASE}/api/projects/${id}`, { headers: { cookie: cookie2 } })).json();
  const ok =
    view?.project?.title === "Neustart-Ofen" &&
    view.missions?.length === 1 &&
    view.missions[0].title === "Holz stapeln" &&
    view.missions[0].state === "übernommen";
  if (ok) console.log("A12 BESTANDEN: Konto, Projekt, Mission und Übernahme sind nach dem Neustart vorhanden.");
  else fail(`Unerwartete Daten nach Neustart: ${JSON.stringify(view).slice(0, 300)}`);
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
} finally {
  await stop(server).catch(() => {});
  fs.rmSync(DIR, { recursive: true, force: true });
}
