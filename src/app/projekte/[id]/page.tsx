import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { getProject } from "@/server/projects";
import { getReentry } from "@/server/reentry";
import { requireUser } from "@/server/session";
import { orNotFound } from "@/server/page-helpers";
import { formatDateTime, formatEventDate, roleLabel } from "@/lib/labels";
import { ApiButton } from "@/components/ApiButton";
import { MissionActions, MissionCard } from "@/components/MissionCard";
import { Progress } from "@/components/Progress";
import type { MissionState } from "@/server/missions";

export const metadata: Metadata = { title: "Projekt" };

const GROUPS: { state: MissionState; title: string; empty: string }[] = [
  { state: "übernommen", title: "In Arbeit", empty: "Gerade arbeitet niemand an einer Mission." },
  { state: "offen", title: "Frei zum Übernehmen", empty: "Keine freie Mission." },
  { state: "blockiert", title: "Wartet auf Voraussetzungen", empty: "Nichts blockiert." },
  { state: "abgeschlossen", title: "Erledigt", empty: "Noch nichts erledigt." },
];

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/projekte/${id}`);
  const db = getDb();
  const view = orNotFound(() => getProject(db, user.id, id));
  const reentry = getReentry(db, user.id, id);
  const { project: p, role, missions, members, progress } = view;
  const isOrg = role === "organizer";
  const active = p.status === "active";
  const next = reentry.nextStep;

  return (
    <div className="page stack">
      <section className="stack-sm">
        <p className="eyebrow">
          {active ? "Projekt" : "Abgeschlossenes Projekt"} · {roleLabel(role)}
        </p>
        <h1>{p.title}</h1>
        <p className="muted">
          <strong>Ziel:</strong> {p.goal}
          {p.eventDate && (
            <>
              {" "}
              · <strong>Termin:</strong> {formatEventDate(p.eventDate)}
            </>
          )}
        </p>
        <p>{p.description}</p>
        <div className="card">
          <Progress {...progress} />
        </div>
      </section>

      {reentry.total > 0 && (
        <section className="card stack-sm" aria-labelledby="neu" data-testid="reentry">
          <h2 id="neu">Seit deinem letzten Besuch</h2>
          <p className="small muted">Stand {formatDateTime(reentry.since)} · {reentry.total} {reentry.total === 1 ? "Änderung" : "Änderungen"}</p>
          <ul className="reasons" style={{ color: "var(--ink)" }}>
            {reentry.changes.map((c) => (
              <li key={c.id}>
                {c.text} <span className="muted small">({formatDateTime(c.at)})</span>
              </li>
            ))}
          </ul>
          {reentry.total > reentry.changes.length && <p className="small muted">… und {reentry.total - reentry.changes.length} weitere.</p>}
          <ApiButton url={`/api/projects/${id}/seen`} label="Gelesen, ausblenden" variant="ghost" small successMessage="Du bist auf dem neuesten Stand." />
        </section>
      )}

      <div className="grid-2">
        <section className="stack" aria-labelledby="missionen">
          {active && (
            <section className="card card--ember stack-sm" aria-labelledby="naechster">
              <p className="eyebrow" id="naechster">Nächster möglicher Schritt</p>
              {next ? (
                <>
                  <h2 style={{ margin: 0 }}>{next.title}</h2>
                  <p>{next.description}</p>
                  <MissionActions mission={next} userId={user.id} active emphasis />
                </>
              ) : view.canComplete && isOrg ? (
                <>
                  <h2 style={{ margin: 0 }}>Alle Missionen sind erledigt</h2>
                  <p>Jetzt kannst du das Projekt abschließen und daraus eine Vorlage machen.</p>
                  <ApiButton url={`/api/projects/${id}/complete`} label="Projekt abschließen" variant="primary" successMessage="Projekt abgeschlossen. Großartig!" testId="complete-project" />
                </>
              ) : missions.length === 0 ? (
                <>
                  <p>Noch keine Missionen.</p>
                  {isOrg && (
                    <Link href={`/projekte/${id}/missionen/neu`} className="btn btn--primary">
                      Erste Mission anlegen
                    </Link>
                  )}
                </>
              ) : (
                <p>Gerade ist keine Mission für dich frei. Alles Weitere wartet auf andere oder auf Voraussetzungen.</p>
              )}
            </section>
          )}

          {!active && isOrg && (
            <section className="card card--ember stack-sm" aria-labelledby="vorlage">
              <h2 id="vorlage">Gut gelaufen? Mach eine Vorlage daraus.</h2>
              <p>
                Die Vorlage übernimmt nur die Missionen und ihre Abhängigkeiten. Namen, Mitglieder, Einladungen und
                Verlauf bleiben hier.
              </p>
              <ApiButton url={`/api/projects/${id}/template`} label="Vorlage erstellen" variant="primary" successMessage="Vorlage erstellt." redirectTo="/vorlagen/{id}" testId="create-template" />
            </section>
          )}

          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 id="missionen" style={{ margin: 0 }}>
              Missionen
            </h2>
            {isOrg && active && missions.length > 0 && (
              <Link href={`/projekte/${id}/missionen/neu`} className="btn btn--ghost btn--small">
                Mission hinzufügen
              </Link>
            )}
          </div>
          {GROUPS.map((g) => {
            const list = missions.filter((m) => m.state === g.state);
            if (list.length === 0) return null;
            return (
              <section key={g.state} className="stack-sm" aria-label={g.title}>
                <h3 className="eyebrow">
                  {g.title} ({list.length})
                </h3>
                <ul className="mission-list">
                  {list.map((m) => (
                    <li key={m.id}>
                      <MissionCard mission={m} userId={user.id} isOrganizer={isOrg} active={active} members={members} headingLevel="h4" />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </section>

        <aside className="stack" aria-label="Projektdetails">
          {isOrg && active && (
            <section className="card stack-sm" aria-labelledby="orga">
              <h2 id="orga">Organisation</h2>
              <div className="row">
                <Link href={`/projekte/${id}/einladungen`} className="btn btn--secondary btn--small">
                  Mitglieder einladen
                </Link>
                <Link href={`/projekte/${id}/bearbeiten`} className="btn btn--ghost btn--small">
                  Projekt bearbeiten
                </Link>
              </div>
              {missions.length > 0 && !view.canComplete && (
                <div className="stack-sm" data-testid="open-items">
                  <h3>Noch offen bis zum Abschluss</h3>
                  <ul className="reasons">
                    {view.openItems.map((m) => (
                      <li key={m.id}>
                        „{m.title}“ ({m.state}
                        {m.assigneeName && m.state === "übernommen" ? `, ${m.assigneeName}` : ""})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
          <section className="card stack-sm" aria-labelledby="mitglieder">
            <h2 id="mitglieder">Dabei ({members.length})</h2>
            <ul className="list-plain">
              {members.map((m) => (
                <li key={m.id} className="row" style={{ justifyContent: "space-between" }}>
                  <span>
                    {m.name}
                    {m.id === user.id && " (du)"}
                  </span>
                  <span className="small muted">{roleLabel(m.role)}</span>
                </li>
              ))}
            </ul>
            <p className="small muted">Kinder und betreute Teilnehmende sind ohne Konto dabei.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
