import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { getProject } from "@/server/projects";
import { requireUser } from "@/server/session";
import { orNotFound } from "@/server/page-helpers";
import { ApiForm } from "@/components/ApiForm";
import { missionFields } from "@/components/forms";

export default async function NewMission({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/projekte/${id}/missionen/neu`);
  const view = orNotFound(() => getProject(getDb(), user.id, id));
  if (view.role !== "organizer" || view.project.status !== "active") notFound();
  const candidates = view.missions.map((m) => ({ value: m.id, label: m.title }));
  return (
    <div className="page page--narrow stack">
      <p><Link href={`/projekte/${id}`}>← {view.project.title}</Link></p>
      <h1>Mission hinzufügen</h1>
      <div className="card">
        <ApiForm url={`/api/projects/${id}/missions`} fields={missionFields(undefined, candidates)} submitLabel="Mission speichern" successMessage="Mission angelegt." redirectTo={`/projekte/${id}`} />
      </div>
    </div>
  );
}
