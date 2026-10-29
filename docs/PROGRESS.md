# FUNKE, Fortschritt

**Stand:** Etappen 1 bis 3 umgesetzt, Etappe 4 (Abnahme) läuft. Durchläufe: 1 / 30.

## Umgebung (geprüft 2026-10-28)
- Node 22.22, npm 10.9, pnpm 10.28, PostgreSQL 16 Client, Python 3.13
- Chromium + Playwright vorinstalliert (kein `playwright install` ausführen)
- Repository leer, keine bestehende Architektur

## Entscheidungen
- **Stack:** Next.js 15 (App Router) + TypeScript 5.9, Drizzle ORM + better-sqlite3 (SQLite-Datei, relational, lokal, persistent). Prisma verworfen: Drizzle ist leichter und braucht keine Engine-Downloads.
- **Auth:** Better Auth 1.7 mit E-Mail + Passwort-Hash; kein Standardpasswort, Seed-Passwort per Umgebungsvariable oder zufällig erzeugt und nur lokal ausgegeben
- **Atomare Übernahme:** bedingtes Update `WHERE id=? AND assigneeId IS NULL AND status='offen'`, Ergebnis-Zählung prüfen
- **Zyklenprüfung:** serverseitige Graphsuche vor dem Speichern einer Abhängigkeit
- **Tests:** Vitest (Domäne/API, eigene Test-DB), Playwright (E2E, zwei Browser-Kontexte, 390/1440 px)
- **verify:** `pnpm verify` = lint + typecheck + build + unit + e2e, gegen separate Test-Datenbank

## Umsetzungsplan
1. [x] Etappe 1: Persistenz, Anmeldung, Rollen, Projekte (Unit-Tests access.test.ts)
2. [x] Etappe 2: Einladungen, Missionen, Zusammenarbeit (invites.test.ts, missions.test.ts inkl. 8 parallele Prozesse)
3. [x] Etappe 3: Fokus, Wiedereinstieg, Vorlagen (focus-reentry.test.ts, templates.test.ts)
4. [ ] Etappe 4: Gestaltung, Fehlerfälle, Abnahme (E2E bestehen; verify, frische Installation, ACCEPTANCE.md offen)

## Offene Aufgaben
- Vollständiger `pnpm verify`-Lauf auf finalem Stand
- A1: frische Installation in sauberem Klon nach README
- docs/ACCEPTANCE.md

## Behobene Funde (Auszug)
- Blockade-Meldung: falsche Reihenfolge/Grammatik (Unit-Test)
- `loading.tsx` ließ Nichtmitglieder-Seiten mit Status 200 statt 404 streamen (API-Test) → ersetzt durch Navigations-Ladebalken
- Schwebende Erfolgsmeldung verdeckte Bedienelemente (Layoutprüfung) → Meldung im Seitenfluss
- Router-Cache zeigte nach Speichern alten Stand (E2E) → `router.refresh()` nach Weiterleitung
- `pnpm setup` kollidiert mit pnpm-Befehl → `pnpm env:init`
- Grammatik „mit mittel Energie“, fehlendes Aufklapp-Symbol (Sichtprüfung Screenshots)

## Mögliche externe Blockaden
- npm-Registry über Proxy nicht erreichbar → Paketinstallation unmöglich
- Prisma-Engine-Download blockiert → Ausweichen auf Drizzle + better-sqlite3
