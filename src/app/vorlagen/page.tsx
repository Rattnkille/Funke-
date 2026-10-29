import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { listTemplates } from "@/server/templates";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Vorlagen" };

export default async function Templates() {
  const user = await requireUser("/vorlagen");
  const templates = listTemplates(getDb(), user.id);
  return (
    <div className="page page--narrow stack">
      <div>
        <h1>Vorlagen</h1>
        <p className="muted">
          Aus abgeschlossenen Projekten werden wiederverwendbare Abläufe: nur Missionen und Abhängigkeiten, ohne Namen
          und ohne Verlauf.
        </p>
      </div>
      {templates.length === 0 ? (
        <div className="empty stack-sm">
          <p>Noch keine Vorlagen. Schließe ein Projekt ab, das du organisierst, und erstelle dort eine Vorlage.</p>
          <Link href="/start" className="btn btn--secondary">
            Zu deinen Projekten
          </Link>
        </div>
      ) : (
        <ul className="mission-list">
          {templates.map((t) => (
            <li key={t.id}>
              <Link href={`/vorlagen/${t.id}`} className="card project-link">
                <h3 style={{ margin: 0 }}>{t.title}</h3>
                <span className="small muted">
                  {t.missionCount} {t.missionCount === 1 ? "Mission" : "Missionen"} · Ziel: {t.goal}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
