import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { ENERGY } from "@/db/schema";
import { getFocus } from "@/server/focus";
import { listMyProjects } from "@/server/projects";
import { requireUser } from "@/server/session";
import { ENERGY_OPTIONS, TIME_OPTIONS, formatDuration, formatEventDate, withEnergy } from "@/lib/labels";
import { MissionCard } from "@/components/MissionCard";
import { Progress } from "@/components/Progress";

export const metadata: Metadata = { title: "Start" };

type SP = { zeit?: string; energie?: string };

export default async function Start({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser("/start");
  const sp = await searchParams;
  const db = getDb();
  const minutes = TIME_OPTIONS.includes(Number(sp.zeit) as (typeof TIME_OPTIONS)[number]) ? Number(sp.zeit) : 30;
  const energy = (ENERGY as readonly string[]).includes(sp.energie ?? "") ? (sp.energie as (typeof ENERGY)[number]) : "medium";
  const chosen = sp.zeit !== undefined || sp.energie !== undefined;
  const focus = getFocus(db, user.id, { minutes, energy });
  const projects = listMyProjects(db, user.id);
  const active = projects.filter((p) => p.status === "active");
  const done = projects.filter((p) => p.status === "completed");

  return (
    <div className="page stack">
      <section className="stack-sm">
        <p className="eyebrow">Hallo {user.name}</p>
        <h1>Was passt gerade zu dir?</h1>
      </section>

      <div className="grid-2">
        <section className="stack" aria-labelledby="fokus">
          <form method="get" action="/start" className="card stack" aria-labelledby="fokus">
            <h2 id="fokus">Dein Fokus</h2>
            <fieldset>
              <legend>Wie viel Zeit hast du?</legend>
              <div className="chips">
                {TIME_OPTIONS.map((t) => (
                  <label className="chip" key={t}>
                    <input type="radio" name="zeit" value={t} defaultChecked={t === minutes} />
                    <span>{formatDuration(t)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Wie viel Energie hast du?</legend>
              <div className="chips">
                {ENERGY_OPTIONS.map((o) => (
                  <label className="chip" key={o.value}>
                    <input type="radio" name="energie" value={o.value} defaultChecked={o.value === energy} />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="submit" className="btn btn--secondary">
              Passende Missionen zeigen
            </button>
          </form>

          <section className="stack-sm" aria-labelledby="vorschlaege" aria-live="polite">
            <h2 id="vorschlaege">
              {focus.suggestions.length ? `${focus.suggestions.length === 1 ? "Ein Vorschlag" : `${focus.suggestions.length} Vorschläge`} für ${formatDuration(minutes)} ${withEnergy(energy)}` : "Gerade nichts Passendes"}
            </h2>
            {focus.suggestions.length > 0 ? (
              <ol className="mission-list" data-testid="suggestions">
                {focus.suggestions.map((s, i) => (
                  <li key={s.mission.id} className="stack-sm">
                    <MissionCard mission={s.mission} userId={user.id} isOrganizer={false} active emphasis={i === 0} projectTitle={s.projectTitle} />
                    <div className="small">
                      <span className="muted">Warum diese Mission:</span>
                      <ul className="reasons">
                        {s.reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="empty stack-sm" data-testid="focus-empty">
                {active.length === 0 ? (
                  <>
                    <p>Du bist noch in keinem aktiven Projekt. Starte eines oder nimm eine Einladung an.</p>
                    <Link href="/projekte/neu" className="btn btn--primary">
                      Projekt anlegen
                    </Link>
                  </>
                ) : focus.empty && focus.empty.executableCount === 0 ? (
                  <p>
                    In deinen Projekten ist gerade keine Mission frei.
                    {focus.empty.blockedCount > 0 && ` ${focus.empty.blockedCount} warten noch auf Voraussetzungen.`} Schau
                    später wieder vorbei oder frag in deiner Gruppe nach.
                  </p>
                ) : (
                  <p>
                    Keine freie Mission passt in {formatDuration(minutes)} {withEnergy(energy)}.
                    {focus.empty?.shortestMinutes != null && ` Die kürzeste freie Mission dauert etwa ${formatDuration(focus.empty.shortestMinutes)}`}
                    {focus.empty?.lowestEnergy && ` und braucht ${({ low: "wenig", medium: "mittlere", high: "viel" } as const)[focus.empty.lowestEnergy]} Energie`}. Probier mehr
                    Zeit oder Energie aus, oder gönn dir eine Pause.
                  </p>
                )}
              </div>
            )}
            {!chosen && focus.suggestions.length > 0 && (
              <p className="small muted">Voreinstellung: 30 Minuten, mittlere Energie. Passe oben an, was gerade stimmt.</p>
            )}
          </section>
        </section>

        <section className="stack-sm" aria-labelledby="projekte">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 id="projekte" style={{ margin: 0 }}>
              Deine Projekte
            </h2>
            <Link href="/projekte/neu" className="btn btn--ghost btn--small">
              Neues Projekt
            </Link>
          </div>
          {projects.length === 0 && (
            <div className="empty">
              <p>Noch keine Projekte. Lege ein Projekt an oder öffne den Einladungslink, den du bekommen hast.</p>
            </div>
          )}
          <ul className="mission-list">
            {[...active, ...done].map((p) => (
              <li key={p.id}>
                <Link href={`/projekte/${p.id}`} className="card project-link" data-testid="project-card">
                  <div className="mission__head">
                    <h3 style={{ margin: 0 }}>{p.title}</h3>
                    {p.changesSinceVisit > 0 && (
                      <span className="badge badge--news">
                        {p.changesSinceVisit} {p.changesSinceVisit === 1 ? "Neuigkeit" : "Neuigkeiten"}
                      </span>
                    )}
                    {p.status === "completed" && <span className="badge badge--abgeschlossen">abgeschlossen</span>}
                  </div>
                  <span className="small muted">
                    {p.role === "organizer" ? "Du organisierst" : "Du machst mit"}
                    {p.eventDate ? ` · ${formatEventDate(p.eventDate)}` : ""}
                  </span>
                  <Progress {...p.progress} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
