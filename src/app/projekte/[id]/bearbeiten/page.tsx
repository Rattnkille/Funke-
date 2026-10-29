import { getDb } from "@/db/client";
import { getProject } from "@/server/projects";
import { requireUser } from "@/server/session";
import { orNotFound } from "@/server/page-helpers";
import { ApiForm } from "@/components/ApiForm";
import { projectFields } from "@/components/forms";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/projekte/${id}/bearbeiten`);
  const view = orNotFound(() => getProject(getDb(), user.id, id));
  if (view.role !== "organizer" || view.project.status !== "active") notFound();
  return (
    <div className="page page--narrow stack">
      <p><Link href={`/projekte/${id}`}>← Zurück zum Projekt</Link></p>
      <h1>Projekt bearbeiten</h1>
      <div className="card">
        <ApiForm url={`/api/projects/${id}`} method="PATCH" fields={projectFields(view.project)} submitLabel="Änderungen speichern" successMessage="Projekt gespeichert." redirectTo={`/projekte/${id}`} />
      </div>
    </div>
  );
}
