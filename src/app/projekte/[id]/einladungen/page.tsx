import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { getProject } from "@/server/projects";
import { listInvites } from "@/server/invites";
import { requireUser } from "@/server/session";
import { orNotFound } from "@/server/page-helpers";
import { formatDateTime } from "@/lib/labels";
import { ApiButton } from "@/components/ApiButton";
import { InviteCreator } from "@/components/InviteCreator";

export const metadata: Metadata = { title: "Einladungen" };

export default async function Invites({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/projekte/${id}/einladungen`);
  const db = getDb();
  const view = orNotFound(() => getProject(db, user.id, id));
  if (view.role !== "organizer") notFound();
  const invites = listInvites(db, user.id, id);
  return (
    <div className="page page--narrow stack">
      <p>
        <Link href={`/projekte/${id}`}>← {view.project.title}</Link>
      </p>
      <h1>Mitglieder einladen</h1>
      <p className="muted">
        Wer den Link öffnet, muss sich trotzdem anmelden oder ein Konto erstellen. Der Link läuft automatisch ab und du
        kannst ihn jederzeit zurückziehen.
      </p>
      {view.project.status === "active" ? (
        <div className="card">
          <InviteCreator projectId={id} />
        </div>
      ) : (
        <p className="alert alert--info">Das Projekt ist abgeschlossen. Neue Einladungen sind nicht mehr möglich.</p>
      )}
      <section className="stack-sm" aria-labelledby="bisher">
        <h2 id="bisher">Bisherige Links</h2>
        {invites.length === 0 ? (
          <p className="empty">Noch keine Einladungslinks.</p>
        ) : (
          <ul className="list-plain card">
            {invites.map((i) => (
              <li key={i.id} className="stack-sm" data-testid="invite-row" data-status={i.status}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span>
                    Erstellt {formatDateTime(i.createdAt)} · {i.useCount} {i.useCount === 1 ? "Beitritt" : "Beitritte"}
                  </span>
                  <span className={`badge ${i.status === "aktiv" ? "badge--offen" : "badge--blockiert"}`}>{i.status}</span>
                </div>
                <span className="small muted">
                  {i.status === "widerrufen" ? "Zurückgezogen" : i.status === "abgelaufen" ? "Abgelaufen" : "Gültig bis"} {formatDateTime(i.revokedAt ?? i.expiresAt)}
                </span>
                {i.status === "aktiv" && (
                  <ApiButton url={`/api/invites/${i.id}/revoke`} label="Link zurückziehen" variant="danger" small confirm="Diesen Link wirklich zurückziehen? Er funktioniert danach nicht mehr." successMessage="Link zurückgezogen." />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
