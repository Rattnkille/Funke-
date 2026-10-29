"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { callApi } from "./ApiButton";

export function InviteCreator({ projectId }: { projectId: string }) {
  const id = useId();
  const router = useRouter();
  const [days, setDays] = useState("7");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="stack">
      <form
        className="stack-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          setCopied(false);
          const r = await callApi(`/api/projects/${projectId}/invites`, "POST", { days: Number(days) });
          setBusy(false);
          if (!r.ok) return setError(r.error);
          setLink(`${window.location.origin}/einladung/${String(r.data.token)}`);
          router.refresh();
        }}
      >
        <div className="field">
          <label htmlFor={id}>Gültig für</label>
          <select id={id} value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="1">1 Tag</option>
            <option value="3">3 Tage</option>
            <option value="7">7 Tage</option>
            <option value="14">14 Tage</option>
          </select>
        </div>
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? "Link wird erstellt …" : "Einladungslink erstellen"}
        </button>
      </form>
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      {link && (
        <div className="alert alert--success stack-sm" role="status">
          <p style={{ margin: 0 }}>Link erstellt. Er wird nur jetzt angezeigt, kopiere ihn und teile ihn persönlich.</p>
          <code className="code-box" data-testid="invite-link">
            {link}
          </code>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Kopiert" : "Link kopieren"}
          </button>
        </div>
      )}
    </div>
  );
}
