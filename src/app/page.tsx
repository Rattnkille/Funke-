import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/server/session";

export default async function Landing() {
  if (await currentUser()) redirect("/start");
  return (
    <div className="page stack">
      <section className="hero stack-sm">
        <p className="eyebrow">Gemeinsam machen statt nur planen</p>
        <h1>Aus einer Idee wird ein Abend, an den sich alle erinnern.</h1>
        <p className="muted">
          FUNKE hilft kleinen Gruppen, kreative und soziale Vorhaben im echten Leben umzusetzen: in klaren Missionen, die
          jede Person übernehmen kann, wenn Zeit und Kraft passen.
        </p>
        <div className="row">
          <Link href="/anmelden" className="btn btn--primary">
            Anmelden
          </Link>
          <Link href="/registrieren" className="btn btn--ghost">
            Konto erstellen
          </Link>
        </div>
      </section>
      <section className="grid-2" aria-label="So funktioniert FUNKE">
        <div className="card stack-sm">
          <h2>Zum Beispiel: der Generationen-Ofen</h2>
          <p>
            Erwachsene aus Nachbarschaft und Familie organisieren einen Pizza-Backtag. Wer Teig ansetzt, wer den Ofen
            anheizt, wer Tische holt, steht in Missionen. Kinder und betreute Gäste brauchen kein Konto, sie sind
            einfach dabei.
          </p>
        </div>
        <div className="card stack-sm">
          <h2>Privat und eingeladen</h2>
          <ul className="reasons">
            <li>Projekte sind nur für eingeladene, angemeldete Erwachsene sichtbar.</li>
            <li>Einladungslinks laufen ab und lassen sich zurückziehen.</li>
            <li>Keine Ranglisten, keine Streaks, kein endloser Feed.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
