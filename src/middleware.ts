import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Schnelle Vorprüfung für Seiten. Die eigentliche Prüfung der Sitzung und Rechte passiert serverseitig in jeder Anfrage.
export function middleware(req: NextRequest) {
  if (getSessionCookie(req)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/anmelden";
  url.search = `?weiter=${encodeURIComponent(req.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  runtime: "nodejs",
  matcher: ["/start", "/projekte/:path*", "/vorlagen/:path*", "/einladung/:path*"],
};
