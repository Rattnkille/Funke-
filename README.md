# FUNKE

Webanwendung, mit der kleine Gruppen kreative und soziale Vorhaben im echten Leben gemeinsam umsetzen.
Pilotversion für eine kleine, eingeladene Gruppe. Erster Anwendungsfall: **Generationen-Ofen**, ein gemeinsamer
Pizza-Backtag. Kinder und betreute Teilnehmende brauchen kein Konto. Alle Beispieldaten sind fiktiv.

- Anforderungen: [`docs/SPEC.md`](docs/SPEC.md)
- Stand der Umsetzung: [`docs/PROGRESS.md`](docs/PROGRESS.md)
- Abnahmenachweis: [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md)

## Voraussetzungen

- Node.js **22** oder neuer
- pnpm **10** (`corepack enable` aktiviert die im Projekt festgelegte Version)
- Für die Browsertests: Chromium für Playwright 1.63 (`pnpm exec playwright install chromium`, falls noch nicht vorhanden)

Keine kostenpflichtigen Dienste, keine externen Server. Die Datenbank ist eine lokale SQLite-Datei.

## Schnellstart (ein Befehl, Mac und Linux)

```bash
./start-lokal.sh
```

Prüft Node 22 und pnpm, installiert alles, legt Demo-Daten an (Passwort wird einmalig angezeigt) und startet
die App auf http://localhost:3000.

## Installation (frisch)

```bash
git clone <repo-url> funke && cd funke
pnpm install          # baut auch den SQLite-Treiber
pnpm env:init         # erzeugt .env mit zufälligem Geheimnis (überschreibt nie)
pnpm db:migrate       # legt ./data/funke.db an und wendet Migrationen an
pnpm build
pnpm start            # http://localhost:3000
```

Entwicklungsmodus statt `build` und `start`: `pnpm dev`.

### Demo-Daten (optional, nur ausdrücklich)

```bash
pnpm db:seed
```

Legt das fiktive Projekt „Generationen-Ofen“ mit drei Demo-Personen an. Es gibt **kein Standardpasswort**: Entweder
setzt du `DEMO_PASSWORD` (mindestens 10 Zeichen), oder das Skript erzeugt ein zufälliges Passwort und zeigt es
einmalig im Terminal an. Läuft der Seed ein zweites Mal, ändert er nichts.

## Konfiguration (`.env`)

| Variable | Bedeutung |
| --- | --- |
| `BETTER_AUTH_SECRET` | Geheimnis für Sitzungen. Wird von `pnpm env:init` zufällig erzeugt. Nie einchecken. |
| `BETTER_AUTH_URL` | Adresse der App, Standard `http://localhost:3000`. |
| `DATABASE_PATH` | Pfad der SQLite-Datei, Standard `./data/funke.db`. |

`.env` und `data/` sind in `.gitignore` eingetragen.

## Prüfen: der verify-Befehl

```bash
pnpm verify
```

Führt nacheinander aus und bricht beim ersten Fehler mit einem Exit-Code ungleich 0 ab:

1. Lint (`eslint`, keine Warnungen erlaubt)
2. Typprüfung (`tsc --noEmit`)
3. Unit- und Integrationstests (Vitest), jede Testdatei mit eigener Wegwerf-Datenbank im Temp-Verzeichnis
4. Produktions-Build
5. Browser-End-to-End-Tests (Playwright) bei 390 px und 1440 px Breite gegen `data/e2e/` (wird vorher gelöscht)
6. Neustart-Prüfung: Server starten, Daten anlegen, Prozess beenden, neu starten, Daten wieder lesen (`data/restart-check/`)

`verify` verändert **nie** die lokale Datenbank aus `DATABASE_PATH` und nutzt für jeden Lauf ein frisches Test-Geheimnis.
Die Screenshots der Browserprüfung landen in `docs/screenshots/390/` und `docs/screenshots/1440/`.

Einzelne Prüfungen: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` (braucht vorher `pnpm build`).

## Technik

- Next.js 15 (App Router) mit TypeScript, React 19
- Better Auth (E-Mail und Passwort, Sitzungs-Cookies, Rate-Limit)
- Drizzle ORM mit SQLite (better-sqlite3), Migrationen in `drizzle/`
- Zod für serverseitige Validierung
- Vitest und Playwright für Tests

Struktur:

```
src/db/          Schema, Verbindung, Migrationen
src/server/      Fachlogik mit Rechteprüfung (Projekte, Einladungen, Missionen, Fokus, Wiedereinstieg, Vorlagen)
src/app/api/     JSON-API, ruft ausschließlich die Fachlogik auf
src/app/         Seiten (Server Components)
src/components/  Oberflächenbausteine
tests/unit/      Vitest
tests/e2e/       Playwright
scripts/         env:init, Migration, Seed, Neustart-Prüfung, verify
```

## Sicherheit in Kürze

- Jede Lese- und Schreiboperation prüft serverseitig Anmeldung und Mitgliedschaft. Nichtmitglieder erhalten
  „nicht gefunden“, damit nicht einmal die Existenz eines Projekts sichtbar wird.
- Organisatorrechte werden pro Aktion geprüft; Mitglieder erhalten 403.
- Einladungslinks: 32 Byte Zufall, gespeichert wird nur der SHA-256-Hash. Sie laufen nach 1 bis 14 Tagen ab,
  lassen sich widerrufen und ersetzen nie die Anmeldung.
- Übernahmen sind eine einzige bedingte Datenbankaktualisierung: Bei gleichzeitigen Anfragen gewinnt genau eine Person.
- Verändernde API-Anfragen fremder Herkunft werden abgewiesen. `Referrer-Policy: no-referrer` schützt Einladungslinks.

## Bewusst nicht enthalten

Keine öffentlichen Communities, Chats, Bezahlfunktionen, KI-Funktionen, externen Nachrichten (z. B. E-Mail-Versand),
Ranglisten, Streaks oder Feeds. Keine öffentliche Bereitstellung.
