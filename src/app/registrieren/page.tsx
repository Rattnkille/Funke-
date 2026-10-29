import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { currentUser } from "@/server/session";

export const metadata: Metadata = { title: "Konto erstellen" };

export default async function Register({ searchParams }: { searchParams: Promise<{ weiter?: string }> }) {
  const { weiter } = await searchParams;
  if (await currentUser()) redirect("/start");
  return (
    <div className="page page--narrow stack">
      <h1>Konto erstellen</h1>
      <p className="muted">FUNKE ist für Erwachsene, die gemeinsam etwas auf die Beine stellen.</p>
      {weiter?.startsWith("/einladung/") && (
        <p className="alert alert--info">Nach der Registrierung geht es direkt weiter zu deiner Einladung.</p>
      )}
      <AuthForm mode="register" returnTo={weiter} />
    </div>
  );
}
