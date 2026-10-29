import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { getTemplate } from "@/server/templates";
import { requireUser } from "@/server/session";
import { orNotFound } from "@/server/page-helpers";
import { energyShort, formatDuration } from "@/lib/labels";
import { ApiForm } from "@/components/ApiForm";
import { ApiButton } from "@/components/ApiButton";
import { missionFields } from "@/components/forms";

export const metadata: Metadata = { title: "Vorlage" };

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/vorlagen/${id}`);
  const { template: t, missions } = orNotFound(() => getTemplate(getDb(), user.id, id));
  const titleOf = new Map(missions.map((m) => [m.id, m.title]));
  return (
    <div className="page stack">
      <p>
        <Link href="/vorlagen">← Alle Vorlagen</Link>
      </p>
      <div>
        <p className="eyebrow">Vorlage</p>
        <h1>{t.title}</h1>
        <p className="muted">{missions.length} Missionen · Ziel: {t.goal}</p>
      </div>

      <div className="grid-2">
        <section className="stack" aria-labelledby="starten">
          <div className="card card--ember stack-sm">
            <h2 id="starten">Neues Projekt aus dieser Vorlage</h2>
            <p className="small muted">Alle Missionen starten offen und ohne Verantwortliche. Du lädst die Gruppe neu ein.</p>
            <ApiForm
              url={`/api/templates/${id}/projects`}
              fields={[
                { kind: "text", name: "title", label: "Titel des neuen Projekts", required: true, defaultValue: t.title, maxLength: 80 },
                { kind: "date", name: "eventDate", label: "Termin" },
              ]}
              submitLabel="Projekt starten"
              pendingLabel="Projekt wird angelegt …"
              successMessage="Neues Projekt angelegt."
              redirectTo="/projekte/{id}"
            />
          </div>

          <section className="stack-sm" aria-labelledby="ablauf">
            <h2 id="ablauf">Missionen der Vorlage</h2>
            {missions.length === 0 && <p className="empty">Diese Vorlage hat noch keine Missionen.</p>}
            <ul className="mission-list">
              {missions.map((m) => (
                <li key={m.id} className="card stack-sm" data-testid="template-mission">
                  <h3 className="mission__title">{m.title}</h3>
                  <p>{m.description}</p>
                  <ul className="meta">
                    <li>Dauer: etwa {formatDuration(m.durationMinutes)}</li>
                    <li>Energie: {energyShort(m.energy)}</li>
                  </ul>
                  {m.dependsOn.length > 0 && (
                    <p className="small muted">Hängt ab von: {m.dependsOn.map((d) => `„${titleOf.get(d) ?? "?"}“`).join(", ")}</p>
                  )}
                  <details>
                    <summary>Mission bearbeiten</summary>
                    <ApiForm
                      url={`/api/template-missions/${m.id}`}
                      method="PATCH"
                      fields={missionFields(m, missions.filter((x) => x.id !== m.id).map((x) => ({ value: x.id, label: x.title })))}
                      submitLabel="Speichern"
                      successMessage="Vorlagen-Mission gespeichert."
                      variant="secondary"
                    />
                  </details>
                  <ApiButton url={`/api/template-missions/${m.id}`} method="DELETE" label="Aus Vorlage entfernen" variant="danger" small confirm={`„${m.title}“ aus der Vorlage entfernen?`} successMessage="Mission entfernt." />
                </li>
              ))}
            </ul>
          </section>
        </section>

        <aside className="stack">
          <section className="card stack-sm" aria-labelledby="angaben">
            <h2 id="angaben">Angaben bearbeiten</h2>
            <ApiForm
              url={`/api/templates/${id}`}
              method="PATCH"
              fields={[
                { kind: "text", name: "title", label: "Titel", required: true, defaultValue: t.title, maxLength: 80 },
                { kind: "textarea", name: "description", label: "Beschreibung", required: true, defaultValue: t.description, maxLength: 1000 },
                { kind: "text", name: "goal", label: "Ziel", required: true, defaultValue: t.goal, maxLength: 200 },
              ]}
              submitLabel="Angaben speichern"
              successMessage="Vorlage gespeichert."
              variant="secondary"
            />
          </section>
          <section className="card stack-sm" aria-labelledby="neu-mission">
            <h2 id="neu-mission">Mission ergänzen</h2>
            <ApiForm
              url={`/api/templates/${id}/missions`}
              fields={missionFields(undefined, missions.map((x) => ({ value: x.id, label: x.title })))}
              submitLabel="Zur Vorlage hinzufügen"
              successMessage="Mission ergänzt."
              resetOnSuccess
              variant="secondary"
            />
          </section>
          <ApiButton url={`/api/templates/${id}`} method="DELETE" label="Vorlage löschen" variant="danger" small confirm="Vorlage endgültig löschen?" successMessage="Vorlage gelöscht." redirectTo="/vorlagen" />
        </aside>
      </div>
    </div>
  );
}
