import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page page--narrow stack">
      <h1>Nicht gefunden</h1>
      <p>Diese Seite gibt es nicht, oder du hast keinen Zugriff darauf. Projekte sind nur für ihre Mitglieder sichtbar.</p>
      <Link href="/start" className="btn btn--primary">
        Zur Startseite
      </Link>
    </div>
  );
}
