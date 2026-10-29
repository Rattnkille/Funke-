import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/session";
import { ApiForm } from "@/components/ApiForm";
import { projectFields } from "@/components/forms";

export const metadata: Metadata = { title: "Neues Projekt" };

export default async function NewProject() {
  await requireUser("/projekte/neu");
  return (
    <div className="page page--narrow stack">
      <div>
        <p className="eyebrow">Neues Projekt</p>
        <h1>Was wollt ihr gemeinsam schaffen?</h1>
        <p className="muted">
          Das Projekt ist privat. Nur Personen, die du einlädst und die angemeldet sind, sehen es. Du kannst auch{" "}
          <Link href="/vorlagen">mit einer Vorlage starten</Link>.
        </p>
      </div>
      <div className="card">
        <ApiForm url="/api/projects" fields={projectFields()} submitLabel="Projekt anlegen" pendingLabel="Wird angelegt …" successMessage="Projekt angelegt." redirectTo="/projekte/{id}" />
      </div>
    </div>
  );
}
