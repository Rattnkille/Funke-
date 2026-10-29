"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page page--narrow stack">
      <h1>Das hat nicht geklappt</h1>
      <p className="alert alert--error" role="alert">
        Beim Laden ist ein Fehler aufgetreten. Deine Daten sind sicher gespeichert.
      </p>
      <div className="row">
        <button type="button" className="btn btn--primary" onClick={reset}>
          Noch einmal versuchen
        </button>
        <a href="/start" className="btn btn--ghost">
          Zur Startseite
        </a>
      </div>
    </div>
  );
}
