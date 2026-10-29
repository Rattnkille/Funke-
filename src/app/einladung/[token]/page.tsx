import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { DomainError } from "@/server/errors";
import { previewInvite } from "@/server/invites";
import { requireUser } from "@/server/session";
import { formatEventDate } from "@/lib/labels";
import { ApiButton } from "@/components/ApiButton";

export const metadata: Metadata = { title: "Einladung" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Einladungslinks ersetzen keine Anmeldung.
  const user = await requireUser(`/einladung/${token}`);
  let preview: ReturnType<typeof previewInvite>;
  try {
    preview = previewInvite(getDb(), user.id, token);
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
    return (
      <div className="page page--narrow stack">
        <h1>Einladung nicht gültig</h1>
        <p className="alert alert--error" role="alert" data-testid="invite-error">
          {e.message}
        </p>
        <Link href="/start" className="btn btn--secondary">
          Zur Startseite
        </Link>
      </div>
    );
  }
  if (preview.alreadyMember) redirect(`/projekte/${preview.projectId}`);
  return (
    <div className="page page--narrow stack">
      <p className="eyebrow">Einladung</p>
      <h1>{preview.title}</h1>
      <div className="card stack-sm">
        <p>
          <strong>Ziel:</strong> {preview.goal}
        </p>
        {preview.eventDate && (
          <p>
            <strong>Termin:</strong> {formatEventDate(preview.eventDate)}
          </p>
        )}
        <p className="muted small">
          Du trittst als {user.name} bei. Die anderen sehen deinen Namen und welche Missionen du übernimmst.
        </p>
        <ApiButton url="/api/invites/accept" body={{ token }} label="Projekt beitreten" variant="primary" block successMessage="Willkommen im Projekt!" redirectTo="/projekte/{id}" testId="accept-invite" />
      </div>
    </div>
  );
}
