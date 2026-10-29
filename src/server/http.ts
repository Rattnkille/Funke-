import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getDb, type Db } from "@/db/client";
import { DomainError } from "./errors";
import { currentUser } from "./session";

type Ctx<P> = { db: Db; userId: string; req: NextRequest; params: P; body: unknown };

/** Gleiche Herkunft für verändernde Anfragen (Schutz gegen Cross-Site-Anfragen). */
function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function api<P = Record<string, never>>(handler: (ctx: Ctx<P>) => unknown) {
  return async (req: NextRequest, segment: { params: Promise<P> }) => {
    try {
      if (req.method !== "GET" && !sameOrigin(req)) {
        return NextResponse.json({ error: "Anfrage von fremder Herkunft abgelehnt." }, { status: 403 });
      }
      const user = await currentUser();
      if (!user) return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
      let body: unknown = undefined;
      if (req.method !== "GET" && req.method !== "DELETE") {
        const text = await req.text();
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
          }
        }
      }
      const params = (await segment.params) ?? ({} as P);
      const result = await handler({ db: getDb(), userId: user.id, req, params, body });
      return NextResponse.json(result ?? { ok: true });
    } catch (e) {
      if (e instanceof DomainError) {
        return NextResponse.json({ error: e.message, code: e.code, details: e.details }, { status: e.status });
      }
      console.error("Unerwarteter Serverfehler:", e instanceof Error ? e.message : "unbekannt");
      return NextResponse.json({ error: "Etwas ist schiefgelaufen. Bitte versuche es noch einmal." }, { status: 500 });
    }
  };
}
