# FUNKE Pilot: Abnahmenachweis

**Geprüfter Codestand:** Commit `ecbd2b7` (Code). Spätere Commits ändern nur Dokumentation und Screenshots.
**Datum:** 2026-10-29 · **Umgebung:** Linux, Node 22.22.0, pnpm 10.28.0, Chromium (Playwright 1.63.0)

## Übersicht

| Kriterium | Status | Beleg |
| --- | --- | --- |
| A1 Frische Installation nach README | **bestanden** | Sauberer `git clone` von `ecbd2b7`, README-Schritte, Server, Anmeldung (siehe Abschnitt A1) |
| A2 Anmeldung, Projekterstellung, Einladung | **bestanden** | `tests/e2e/main-flow.spec.ts` (390 und 1440 px); `tests/unit/invites.test.ts` |
| A3 Zweites Mitglied: beitreten, übernehmen, zurückgeben, abschließen | **bestanden** | `main-flow.spec.ts` (zweite, getrennte Browsersitzung); `missions.test.ts` „A3 …“ |
| A4 Nichtmitglieder: weder lesen noch verändern (auch direkte Anfragen) | **bestanden** | `security.spec.ts` „A4 …“ (4 Lese-, 12 Schreib-Endpunkte, Seite = 404, Daten unverändert); `access.test.ts` |
| A5 Mitglieder ohne Organisatorrechte | **bestanden** | `security.spec.ts` „A5 …“ (10 Aktionen → 403, Seiten → 404); `access.test.ts` |
| A6 Abgelaufene und widerrufene Einladungen abgewiesen | **bestanden** | `security.spec.ts` „A6 …“ (HTTP 410, Seite zeigt Meldung); `invites.test.ts` |
| A7 Konkurrierende Übernahme: genau eine Person gewinnt | **bestanden** | `missions.test.ts` (8 parallele Prozesse mit eigenen DB-Verbindungen); `security.spec.ts` „A7 …“ (12 gleichzeitige HTTP-Anfragen) |
| A8 Abhängigkeiten verhindern Übernahmen, Zyklen abgewiesen | **bestanden** | `missions.test.ts` „A8 …“; `security.spec.ts` „A8 …“; E2E (409 bei blockierter Mission) |
| A9 Zeit/Energie: max. 3 passende ausführbare Missionen oder Leerzustand | **bestanden** | `focus-reentry.test.ts` „A9 …“ (4 Fälle); E2E Screens `10-fokus-vorschlag`, `11-fokus-leer` |
| A10 Wiedereinstieg zeigt tatsächliche Änderungen | **bestanden** | `focus-reentry.test.ts` „A10 …“; E2E prüft 4 konkrete Änderungstexte, Screen `13-wiedereinstieg` |
| A11 Abschluss und neues Projekt aus Vorlage ohne personenbezogene Daten | **bestanden** | `templates.test.ts` (Spalten und Inhalte der Vorlage, neues Projekt); E2E Vorlage → neues Projekt |
| A12 Daten bleiben nach Neustart erhalten | **bestanden** | `scripts/restart-check.mjs` (echter Prozess-Neustart, neue PID, neue Anmeldung) |
| A13 Hauptablauf mobil und am Desktop | **bestanden** | `main-flow.spec.ts` in den Projekten `mobil-390` und `desktop-1440`, automatische Layoutprüfung, 2 × 17 Screenshots |
| A14 Build, Typprüfung, Lint, Tests | **bestanden** | `pnpm verify` EXIT=0 im Hauptrepo und im frischen Klon |

Kein Kriterium ist fehlgeschlagen oder ungeprüft.

## Ausgeführte Befehle und Ergebnisse

### A14: `pnpm verify` im frischen Klon (finaler Codestand)

```text
$ pnpm verify
▶ 1/6 Lint                      eslint . --max-warnings 0   → ohne Befund
▶ 2/6 Typprüfung                tsc --noEmit                → ohne Befund
▶ 3/6 Unit- und Integrationstests
 Test Files  5 passed (5)
      Tests  27 passed (27)
▶ 4/6 Produktions-Build
 ✓ Compiled successfully in 9.2s
▶ 5/6 Browser-End-to-End-Tests (Playwright, 390 px und 1440 px, Test-Datenbank data/e2e)
  ✓   1 [api] › security.spec.ts › A4: Nichtmitglieder können weder lesen noch verändern
  ✓   2 [api] › security.spec.ts › A4: Ohne Anmeldung gibt es keine Daten
  ✓   3 [api] › security.spec.ts › Anfragen fremder Herkunft werden abgewiesen
  ✓   4 [api] › security.spec.ts › A5: Mitglieder können keine Organisatorrechte ausüben
  ✓   5 [api] › security.spec.ts › A6: Widerrufene und abgelaufene Einladungen werden abgewiesen
  ✓   6 [api] › security.spec.ts › A7: Bei konkurrierender Übernahme gewinnt genau eine Person
  ✓   7 [api] › security.spec.ts › A8: Zyklen werden auch über die API abgewiesen
  ✓   8 [api] › security.spec.ts › Serverseitige Validierung liefert verständliche Feldfehler
  ✓   9 [mobil-390] › a11y.spec.ts › G.7: Registrierung und Projektanlage nur mit der Tastatur, Fokus sichtbar
  ✓  10 [mobil-390] › a11y.spec.ts › G.6: Reduzierte Bewegung wird respektiert
  ✓  11 [mobil-390] › a11y.spec.ts › G.7: Fehlermeldung bei falscher Anmeldung ist verständlich
  ✓  12 [mobil-390] › main-flow.spec.ts › Hauptablauf: zwei Personen vom Projekt bis zum neuen Projekt aus der Vorlage (16.0s)
  ✓  13 [desktop-1440] › a11y.spec.ts › G.7: Registrierung und Projektanlage nur mit der Tastatur, Fokus sichtbar
  ✓  14 [desktop-1440] › a11y.spec.ts › G.6: Reduzierte Bewegung wird respektiert
  ✓  15 [desktop-1440] › a11y.spec.ts › G.7: Fehlermeldung bei falscher Anmeldung ist verständlich
  ✓  16 [desktop-1440] › main-flow.spec.ts › Hauptablauf: zwei Personen vom Projekt bis zum neuen Projekt aus der Vorlage (14.9s)
  16 passed (47.6s)
▶ 6/6 Neustart-Prüfung (A12)
Vor Neustart: Projekt 21aa3811-… mit übernommener Mission angelegt (PID 11359).
Server beendet. Starte neu …
Neuer Serverprozess PID 11380.
A12 BESTANDEN: Konto, Projekt, Mission und Übernahme sind nach dem Neustart vorhanden.
✔ verify: alle Prüfungen bestanden
pnpm verify EXIT=0
```

### verify endet bei Fehlern ungleich 0

Eine absichtlich fehlschlagende Testdatei (`expect(1).toBe(2)`) wurde vorübergehend hinzugefügt:

```text
$ pnpm verify
▶ 1/6 Lint
▶ 2/6 Typprüfung
▶ 3/6 Unit- und Integrationstests (Vitest, eigene Temp-Datenbanken)
 FAIL  tests/unit/zz-absichtlicher-fehler.test.ts > absichtlicher Fehler zum Nachweis des Exit-Codes
      Tests  1 failed | 27 passed (28)
verify EXIT=1
```

Die Datei wurde danach wieder entfernt.

### verify verändert keine lokalen Daten

Vor `pnpm verify` wurde die SHA-256-Summe der lokalen Datenbank (`data/funke.db` mit Demo-Daten) gespeichert, danach geprüft:

```text
$ sha256sum -c db.sha
data/funke.db: OK
```

Ergebnis in beiden Läufen (Fehlerlauf im Hauptrepo, Erfolgslauf im frischen Klon): unverändert. verify nutzt nur
Temp-Verzeichnisse, `data/e2e/`, `data/restart-check/` und `data/verify/`, außerdem ein pro Lauf neu erzeugtes Geheimnis.

### A1: Frische Installation nach README

```text
$ git clone <repo> fresh && cd fresh
Commit: ecbd2b7 Node-Middleware, Barrierefreiheitstests, Feinschliff
sauber: kein .env, kein data/, keine node_modules
$ pnpm install && pnpm env:init && pnpm db:migrate && pnpm build && DEMO_PASSWORD=… pnpm db:seed
Installationskette EXIT=0
.env erstellt (mit neu erzeugtem Geheimnis).
Migrationen angewendet: …/fresh/data/funke.db
 ✓ Compiled successfully in 24.7s
Demo-Daten angelegt in …/fresh/data/funke.db
$ pnpm start   (Port 3000)
POST /api/auth/sign-in/email (ilse@demo.funke.test)  → HTTP 200
GET  /start (angemeldet)                             → enthält „Generationen-Ofen“, „1 von 9 Missionen erledigt“
GET  /start (ohne Anmeldung)                         → HTTP 307 → /anmelden?weiter=%2Fstart
```

### A13: Darstellung bei 390 und 1440 px

`tests/e2e/helpers.ts → checkLayout()` läuft vor jedem der 17 Screenshots pro Breite und bricht den Test ab bei:

- horizontalem Überlauf (`document.documentElement.scrollWidth > innerWidth`),
- sichtbaren Bedienelementen außerhalb des Viewports,
- Bedienelementen unter 24 px Höhe (Ausnahme: Links im Fließtext nach WCAG 2.5.8),
- verdeckten Bedienelementen (`elementFromPoint` am Mittelpunkt trifft ein fremdes Element),
- Text unter 12 px oder abgeschnittenem Text.

Screenshots: `docs/screenshots/390/01–17*.png` und `docs/screenshots/1440/01–17*.png`. Zusätzlich wurden Screenshots
selbst angesehen (unter anderem `13-wiedereinstieg`, `10-fokus-vorschlag`, `15-vorlage`, `16-neues-projekt-aus-vorlage`).

**Durch diese Prüfungen gefunden und behoben:**

- Eine schwebende Erfolgsmeldung verdeckte Felder und Links. Sie steht jetzt im Seitenfluss.
- Next.js-`loading.tsx` lieferte bei verweigertem Zugriff Status 200 statt 404. Ersetzt durch einen Ladebalken bei der Navigation.
- Der Router-Cache zeigte nach dem Speichern einen veralteten Stand. Jetzt wird nach jeder Weiterleitung neu geladen.
- Grammatik („mit mittel Energie“), fehlendes Aufklapp-Symbol bei `<details>`, Reihenfolge in der Blockade-Meldung.

## Zuordnung zu den Pflichtprüfungen (SPEC P.1–P.8)

| Prüfung | Datei |
| --- | --- |
| P.1 Rollen, projektübergreifender Zugriffsschutz | `tests/unit/access.test.ts`, `tests/e2e/security.spec.ts` |
| P.2 Einladungen | `tests/unit/invites.test.ts`, `security.spec.ts` (A6) |
| P.3 Konkurrierende Übernahmen | `tests/unit/missions.test.ts` (Prozesse), `security.spec.ts` (A7) |
| P.4 Zustandsübergänge, Abhängigkeiten | `tests/unit/missions.test.ts`, `focus-reentry.test.ts` |
| P.5 Vorlagen ohne personenbezogene Übernahme | `tests/unit/templates.test.ts` |
| P.6 Browser-E2E mit zwei Sitzungen | `tests/e2e/main-flow.spec.ts` |
| P.7 verify-Befehl | `scripts/verify.sh` (`pnpm verify`) |
| P.8 390/1440 px mit Screenshots | Playwright-Projekte `mobil-390`, `desktop-1440`, `docs/screenshots/` |

## Bekannte Grenzen

- **Kein E-Mail-Versand** (laut Spezifikation keine externen Nachrichten). Folgen: keine Passwort-Zurücksetzung, keine
  E-Mail-Bestätigung. Einladungslinks werden persönlich geteilt.
- **Volljährigkeit** wird per Selbstauskunft bestätigt, nicht verifiziert.
- **Rate-Limit** von Better Auth arbeitet im Speicher eines Prozesses. Mit mehreren Instanzen braucht es einen gemeinsamen Speicher.
- **SQLite** mit einer Datei: geeignet für den Pilot mit einer Instanz, nicht für horizontale Skalierung.
- **Wiedereinstieg:** Neuigkeiten gelten als gelesen, wenn man „Gelesen, ausblenden“ wählt. Es gibt keine automatische Zeitregel.
- **Mitglieder** können noch nicht entfernt werden und nicht selbst austreten. Organisatorrolle ist nicht übertragbar.
- **Testumfang:** Browsertests nur mit Chromium. Firefox und Safari sind ungeprüft.
- **Abschluss:** Ein abgeschlossenes Projekt lässt sich nicht wieder öffnen.

## Verbleibende Produktionsarbeiten

1. HTTPS und Betrieb hinter einem Reverse-Proxy, `BETTER_AUTH_URL` auf die echte Adresse setzen, sichere Cookies prüfen.
2. Automatische Datenbank-Backups (z. B. `sqlite3 .backup` per Zeitplan) und Wiederherstellungstest.
3. E-Mail-Dienst für Passwort-Zurücksetzung und Bestätigung (erst nach gesonderter Freigabe).
4. Datenschutz: Datenschutzerklärung, Konto-Löschung und Datenexport, Aufbewahrungsfristen für Aktivitäten.
5. Gemeinsamer Speicher für das Rate-Limit, Monitoring und Fehlerprotokoll ohne personenbezogene Daten.
6. Mitgliederverwaltung (entfernen, austreten, Rolle übertragen).
7. Browsertests mit Firefox und WebKit, Prüfung mit Screenreader.
