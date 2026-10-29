import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { currentUser } from "@/server/session";

export const metadata: Metadata = { title: "Anmelden" };

export default async function Login({ searchParams }: { searchParams: Promise<{ weiter?: string }> }) {
  const { weiter } = await searchParams;
  if (await currentUser()) redirect(weiter?.startsWith("/") && !weiter.startsWith("//") ? weiter : "/start");
  return (
    <div className="page page--narrow stack">
      <h1>Willkommen zurück</h1>
      {weiter?.startsWith("/einladung/") && (
        <p className="alert alert--info">Du wurdest eingeladen. Melde dich an oder erstelle ein Konto, um beizutreten.</p>
      )}
      <AuthForm mode="login" returnTo={weiter} />
    </div>
  );
}
