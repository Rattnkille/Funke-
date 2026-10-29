import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { getProject } from "@/server/projects";
import { requireUser } from "@/server/session";
import { orNotFound } from "@/server/page-helpers";
import { ApiForm } from "@/components/ApiForm";
import { missionFields } from "@/components/forms";

export default async function EditMission({ params }: { params: Promise<{ id: string; missionId: string }> }) {
  const { id, missionId } = await params;
  const user = await requireUser(`/projekte/${id}/missionen/${missionId}`);
  const view = orNotFound(() => getProject(getDb(), user.id, id));
  const m = view.missions.find((x) => x.id === missionId);
  if (!m || view.role !== "organizer" || view.project.status !== "active") notFound();
  const candidates = view.missions.filter((x) => x.id !== missionId).map((x) => ({ value: x.id, label: x.title }));
  return (
    <div className="page page--narrow stack">
      <p><Link href={`/projekte/${id}`}>← {view.project.title}</Link></p>
      <h1>Mission bearbeiten</h1>
      <div className="card">
        <ApiForm
          url={`/api/missions/${missionId}`}
          method="PATCH"
          fields={missionFields({ ...m, dependsOn: m.dependsOn.map((d) => d.id) }, candidates)}
          submitLabel="Änderungen speichern"
          successMessage="Mission gespeichert."
          redirectTo={`/projekte/${id}`}
        />
      </div>
    </div>
  );
}
