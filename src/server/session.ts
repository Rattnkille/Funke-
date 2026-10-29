import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type SessionUser = { id: string; name: string; email: string };

export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return { id: session.user.id, name: session.user.name, email: session.user.email };
}

/** Für Seiten: ohne Anmeldung zur Anmeldeseite mit Rücksprung. */
export async function requireUser(returnTo: string): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect(`/anmelden?weiter=${encodeURIComponent(returnTo)}`);
  return user;
}
