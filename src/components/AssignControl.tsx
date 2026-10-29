"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { callApi } from "./ApiButton";
import { useFlash } from "./Flash";

export function AssignControl({ missionId, current, members, blocked }: { missionId: string; current: string | null; members: { id: string; name: string }[]; blocked: boolean }) {
  const id = useId();
  const router = useRouter();
  const flash = useFlash();
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="stack-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const r = await callApi(`/api/missions/${missionId}/assign`, "POST", { userId: value || null });
        setBusy(false);
        if (!r.ok) return setError(r.error);
        flash(value ? "Zuständigkeit geändert." : "Mission ist wieder frei.");
        router.refresh();
      }}
    >
      <div className="field">
        <label htmlFor={id}>Zuständig</label>
        {blocked && <span className="hint">Blockierte Missionen können erst nach ihren Voraussetzungen vergeben werden.</span>}
        <select id={id} value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="">Niemand (frei)</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <button className="btn btn--ghost btn--small" type="submit" disabled={busy}>
        {busy ? "Wird gespeichert …" : "Zuständigkeit speichern"}
      </button>
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
