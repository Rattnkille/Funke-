# FUNKE Pilotversion, Spezifikation

**Status:** verbindlich. Pflichtanforderungen und Abnahmekriterien A1 bis A14 dürfen nicht gestrichen, abgeschwächt oder umgedeutet werden.

## 1. Produkt

FUNKE ist eine Webanwendung, mit der kleine Gruppen kreative und soziale Vorhaben im echten Leben gemeinsam umsetzen.

**Ziel:** Eine lokal vollständig lauffähige, dauerhaft speichernde, getestete Pilotversion für eine kleine eingeladene Gruppe.

**Erster Anwendungsfall „Generationen-Ofen“:** Erwachsene organisieren einen gemeinsamen Pizza-Backtag. Kinder und betreute Teilnehmende erhalten keine Accounts. Alle Beispieldaten sind fiktiv.

## 2. Produktumfang

### A. Anmeldung und geschützte Projekte
- A.1 Erwachsene können sich anmelden.
- A.2 Ein Organisator erstellt ein privates Projekt mit Titel, Beschreibung, Ziel und optionalem Termin.
- A.3 Mitglieder treten über zeitlich begrenzte, widerrufbare Einladungslinks bei.
- A.4 Rollen: Organisator und Mitglied.
- A.5 Zugriffsrechte werden serverseitig geprüft.
- A.6 Einladungslinks ersetzen nicht die Anmeldung.

### B. Missionen
- B.1 Missionen enthalten Titel, konkrete Handlungsbeschreibung, geschätzte Dauer und benötigte Energie.
- B.2 Optional hängen sie von anderen Missionen ab.
- B.3 Zustände: offen, übernommen, blockiert, abgeschlossen.
- B.4 Pro Mission höchstens eine verantwortliche Person.
- B.5 Mitglieder können freie Missionen übernehmen, zurückgeben und eigene Missionen abschließen.
- B.6 Organisatoren können Zuständigkeiten korrigieren.
- B.7 Zirkuläre Abhängigkeiten werden verhindert.
- B.8 Abhängige Missionen können erst nach Abschluss ihrer Voraussetzungen übernommen werden.
- B.9 Gleichzeitige Übernahmen werden atomar behandelt: eine Person erhält die Mission, die andere eine verständliche Rückmeldung.

### C. Fokus und Wiedereinstieg
- C.1 Mitglieder wählen verfügbare Zeit und Energie.
- C.2 Die Startansicht zeigt maximal drei passende, ausführbare Missionen und begründet die Auswahl kurz.
- C.3 Die Auswahl ist regelbasiert, ohne KI-API.
- C.4 Ohne passenden Treffer erscheint ein hilfreicher Leerzustand, keine erfundene Aufgabe.
- C.5 Nach einer Pause werden tatsächliche Änderungen seit dem letzten Besuch und ein nächster möglicher Schritt angezeigt.

### D. Abschluss und Wiederverwendung
- D.1 Projektfortschritt ergibt sich aus abgeschlossenen Missionen.
- D.2 Projekte können abgeschlossen werden, sobald alle Missionen abgeschlossen sind; sonst werden offene Punkte angezeigt.
- D.3 Aus einem abgeschlossenen Projekt entsteht eine bearbeitbare Vorlage mit Missionen und Abhängigkeiten.
- D.4 Namen, Mitgliedschaften, Einladungen, Aktivitäten und andere personenbezogene Inhalte werden nicht übernommen.
- D.5 Ein neues Projekt aus der Vorlage beginnt mit offenen Missionen ohne Verantwortliche.

## 3. Gestaltung
Wirkung: erwachsene, kreative Werkstatt, warm, eigenständig, klar, hochwertig.
- G.1 Deutsche Oberfläche.
- G.2 Mobil zuerst, ebenso am Desktop nutzbar.
- G.3 Klare Typografie, ausreichend große Bedienflächen.
- G.4 Pro Ansicht eine dominante Handlung.
- G.5 Fortschritt als einfache visuelle Entwicklung.
- G.6 Animationen sparsam; `prefers-reduced-motion` respektieren.
- G.7 Tastaturbedienung, sichtbarer Fokus, beschriftete Eingaben, verständliche Fehlermeldungen.
- G.8 Vollständige Lade-, Leer-, Fehler- und Erfolgszustände.
- G.9 Keine Ranglisten, Strafpunkte, Streaks oder endlosen Feeds.
- G.10 Keine medizinischen Wirkversprechen.

## 4. Technik
- T.1 Vorhandene Architektur nutzen, sonst überschaubarer, etablierter TypeScript-Stack mit relationaler Datenbank.
- T.2 Kernanwendung läuft lokal ohne kostenpflichtige Dienste.
- T.3 Authentifizierung mit einer etablierten Bibliothek.
- T.4 Datenbankmigrationen und ausdrücklich ausführbarer Demo-Seed.
- T.5 Keine produktiven Standardpasswörter.
- T.6 Keine Geheimnisse im Browser, Repository oder Log.
- T.7 Eingaben serverseitig validieren.
- T.8 Daten bleiben nach Neustart erhalten.
- T.9 Keine öffentlichen Communities, Chats, Bezahlfunktionen, KI-Agenten oder externen Nachrichten.
- T.10 Keine Attrappen für Kernfunktionen.
- T.11 Keine unnötigen Microservices oder Erweiterungsframeworks.
- T.12 Keine öffentliche Bereitstellung und keine kostenpflichtigen Buchungen ohne gesonderten Auftrag.

## 5. Arbeitsweise
Etappen:
1. Persistenz, Anmeldung, Rollen und Projekte.
2. Einladungen, Missionen und Zusammenarbeit.
3. Fokusansicht, Wiedereinstieg und Vorlagen.
4. Gestaltung, Fehlerfälle und vollständige Abnahme.

Nach jeder Etappe: passende Prüfungen ausführen, Fehler beheben, docs/PROGRESS.md aktualisieren, selbstständig weiterarbeiten.
Bei Wiederaufnahme: SPEC.md und PROGRESS.md lesen, tatsächlichen Codezustand prüfen, am ersten unerfüllten Kriterium weiterarbeiten. Dokumentation ist Orientierung, kein Erfolgsbeweis.

## 6. Prüfungen
Automatisierte Tests für:
- P.1 Rollen und projektübergreifenden Zugriffsschutz.
- P.2 Einladungen.
- P.3 Konkurrierende Übernahmen.
- P.4 Zustandsübergänge und Abhängigkeiten.
- P.5 Vorlagen ohne personenbezogene Übernahmen.

- P.6 Browser-End-to-End-Test mit zwei getrennten Benutzersitzungen: Projekt anlegen → einladen → beitreten → übernehmen → abschließen → Vorlage erzeugen → neues Projekt starten.
- P.7 Ein dokumentierter `verify`-Befehl bündelt alle reproduzierbaren Prüfungen, endet bei Fehlern ungleich 0 und verändert keine privaten oder produktiven Daten (eigene Test-Datenbank).
- P.8 Browserprüfungen bei 390 und 1440 Pixel Breite mit gespeicherten Screenshots; Kontrolle auf Überläufe, verdeckte Bedienelemente, unlesbare Inhalte.

Tests nicht löschen, überspringen oder abschwächen. Korrigierte Tests prüfen weiterhin das spezifizierte Verhalten.

## 7. Abnahmekriterien (fest, nummeriert)
- **A1:** Eine frische lokale Installation gelingt anhand der README.
- **A2:** Anmeldung, Projekterstellung und Einladung funktionieren.
- **A3:** Ein zweites Mitglied kann beitreten und eine Mission übernehmen, zurückgeben und abschließen.
- **A4:** Nichtmitglieder können Projektdaten auch über direkte Serveranfragen weder lesen noch verändern.
- **A5:** Mitglieder können keine Organisatorrechte ausüben.
- **A6:** Abgelaufene und widerrufene Einladungen werden abgewiesen.
- **A7:** Bei konkurrierender Übernahme gewinnt genau eine Person.
- **A8:** Abhängigkeiten verhindern unzulässige Übernahmen; Zyklen werden abgewiesen.
- **A9:** Zeit- und Energiefilter liefern höchstens drei passende ausführbare Missionen oder einen korrekten Leerzustand.
- **A10:** Der Wiedereinstieg zeigt tatsächliche Änderungen.
- **A11:** Abschluss und Erstellung eines neuen Projekts aus einer Vorlage funktionieren ohne Übernahme personenbezogener Daten.
- **A12:** Daten bleiben nach einem Anwendungsneustart erhalten.
- **A13:** Der Hauptablauf funktioniert mobil und am Desktop.
- **A14:** Build, Typprüfung, Lint und relevante Tests bestehen.

## 8. Abschlussnachweis (docs/ACCEPTANCE.md)
- Jedes Kriterium: bestanden, fehlgeschlagen oder ungeprüft.
- Zugehöriger Test oder konkreter manueller Prüfbeleg.
- Tatsächlich ausgeführte Befehle und Ergebnisse.
- Bekannte Grenzen und verbleibende Produktionsarbeiten.

**FERTIG:** Alle Pflichtkriterien nachweislich erfüllt, App lokal bedienbar, Prüfungen bestehen auf finalem Codestand.
**BLOCKIERT:** Ein notwendiger Schritt braucht fehlende Berechtigungen, Zugangsdaten oder externe Voraussetzungen. Ursache, Lösungsversuche und kleinsten notwendigen Eingriff dokumentieren; vorher alle unabhängigen Arbeiten erledigen; keinen Erfolg behaupten.
