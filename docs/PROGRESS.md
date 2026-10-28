# FUNKE, Fortschritt

**Stand:** Vorbereitung abgeschlossen, Umsetzung noch nicht begonnen. Durchläufe: 0 / 30.

## Umgebung (geprüft 2026-10-28)
- Node 22.22, npm 10.9, pnpm 10.28, PostgreSQL 16 Client, Python 3.13
- Chromium + Playwright vorinstalliert (kein `playwright install` ausführen)
- Repository leer, keine bestehende Architektur

## Entscheidungen
- **Stack:** Next.js (App Router) + TypeScript, Prisma, SQLite-Datei (relational, lokal, ohne Dienst, persistent)
- **Auth:** etablierte Bibliothek (Auth.js oder Better Auth) mit E-Mail + Passwort-Hash; kein Standardpasswort, Seed-Passwort per Umgebungsvariable oder zufällig erzeugt und nur lokal ausgegeben
- **Atomare Übernahme:** bedingtes Update `WHERE id=? AND assigneeId IS NULL AND status='offen'`, Ergebnis-Zählung prüfen
- **Zyklenprüfung:** serverseitige Graphsuche vor dem Speichern einer Abhängigkeit
- **Tests:** Vitest (Domäne/API, eigene Test-DB), Playwright (E2E, zwei Browser-Kontexte, 390/1440 px)
- **verify:** `pnpm verify` = lint + typecheck + build + unit + e2e, gegen separate Test-Datenbank

## Umsetzungsplan
1. [ ] Etappe 1: Persistenz, Anmeldung, Rollen, Projekte
2. [ ] Etappe 2: Einladungen, Missionen, Zusammenarbeit
3. [ ] Etappe 3: Fokus, Wiedereinstieg, Vorlagen
4. [ ] Etappe 4: Gestaltung, Fehlerfälle, Abnahme (ACCEPTANCE.md)

## Offene Aufgaben
- Alles ab Etappe 1

## Mögliche externe Blockaden
- npm-Registry über Proxy nicht erreichbar → Paketinstallation unmöglich
- Prisma-Engine-Download blockiert → Ausweichen auf Drizzle + better-sqlite3
