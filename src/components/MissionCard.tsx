import type { MissionView } from "@/server/missions";
import { energyShort, formatDuration } from "@/lib/labels";
import { ApiButton } from "./ApiButton";
import { AssignControl } from "./AssignControl";
import Link from "next/link";

type Props = {
  mission: MissionView;
  userId: string;
  isOrganizer: boolean;
  active: boolean;
  members?: { id: string; name: string }[];
  emphasis?: boolean;
  projectTitle?: string;
  headingLevel?: "h3" | "h4";
};

export function MissionActions({ mission: m, userId, active, emphasis }: Pick<Props, "mission" | "userId" | "active" | "emphasis">) {
  if (!active) return null;
  const mine = m.assigneeId === userId;
  if (m.state === "offen") {
    return (
      <ApiButton
        url={`/api/missions/${m.id}/claim`}
        label="Mission übernehmen"
        pendingLabel="Wird übernommen …"
        successMessage={`Du hast „${m.title}“ übernommen.`}
        variant={emphasis ? "primary" : "secondary"}
        small={!emphasis}
        testId={`claim-${m.id}`}
      />
    );
  }
  if (m.state === "übernommen" && mine) {
    return (
      <div className="row">
        <ApiButton
          url={`/api/missions/${m.id}/complete`}
          label="Als erledigt markieren"
          pendingLabel="Wird gespeichert …"
          successMessage={`„${m.title}“ ist erledigt. Danke!`}
          variant={emphasis ? "primary" : "secondary"}
          small={!emphasis}
          testId={`complete-${m.id}`}
        />
        <ApiButton
          url={`/api/missions/${m.id}/release`}
          label="Zurückgeben"
          pendingLabel="Wird zurückgegeben …"
          successMessage={`„${m.title}“ ist wieder frei.`}
          variant="ghost"
          small
          testId={`release-${m.id}`}
        />
      </div>
    );
  }
  return null;
}

export function MissionCard({ mission: m, userId, isOrganizer, active, members, emphasis, projectTitle, headingLevel = "h3" }: Props) {
  const H = headingLevel;
  const mine = m.assigneeId === userId;
  return (
    <article className={`card mission${emphasis ? " card--ember" : ""}`} data-testid="mission" data-id={m.id} data-title={m.title} data-state={m.state}>
      <div className="mission__head">
        <div>
          {projectTitle && <p className="eyebrow">{projectTitle}</p>}
          <H className="mission__title">{m.title}</H>
        </div>
        <span className={`badge badge--${m.state}`}>{m.state === "übernommen" && mine ? "bei dir" : m.state}</span>
      </div>
      <p>{m.description}</p>
      <ul className="meta">
        <li>Dauer: etwa {formatDuration(m.durationMinutes)}</li>
        <li>Energie: {energyShort(m.energy)}</li>
        {m.assigneeName && m.state !== "abgeschlossen" && <li>Zuständig: {mine ? "du" : m.assigneeName}</li>}
        {m.state === "abgeschlossen" && m.assigneeName && <li>Erledigt von {mine ? "dir" : m.assigneeName}</li>}
      </ul>
      {m.dependsOn.length > 0 && (
        <p className="small muted">
          {m.state === "blockiert" ? "Wartet auf: " : "Baut auf: "}
          {m.dependsOn.map((d, i) => (
            <span key={d.id}>
              {i > 0 && ", "}„{d.title}“{d.done ? " ✓" : ""}
            </span>
          ))}
        </p>
      )}
      <MissionActions mission={m} userId={userId} active={active} emphasis={emphasis} />
      {isOrganizer && active && m.state !== "abgeschlossen" && (
        <details>
          <summary>Organisation: Zuständigkeit &amp; Bearbeiten</summary>
          <div className="stack-sm">
            {members && <AssignControl missionId={m.id} current={m.assigneeId} members={members} blocked={m.state === "blockiert"} />}
            <div className="row">
              <Link className="btn btn--ghost btn--small" href={`/projekte/${m.projectId}/missionen/${m.id}`}>
                Mission bearbeiten
              </Link>
              <ApiButton
                url={`/api/missions/${m.id}`}
                method="DELETE"
                label="Löschen"
                variant="danger"
                small
                confirm={`Mission „${m.title}“ wirklich löschen?`}
                successMessage="Mission gelöscht."
              />
            </div>
          </div>
        </details>
      )}
    </article>
  );
}
