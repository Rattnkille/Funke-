"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFlash } from "./Flash";

type Props = {
  url: string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  label: string;
  pendingLabel?: string;
  successMessage?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  small?: boolean;
  block?: boolean;
  confirm?: string;
  /** Ziel nach Erfolg; {id} wird durch die id der Antwort ersetzt. Ohne Angabe: Seite neu laden. */
  redirectTo?: string;
  testId?: string;
};

export async function callApi(url: string, method: string, body?: unknown) {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false as const, error: "Keine Verbindung zum Server. Bitte prüfe deine Verbindung und versuche es erneut." };
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false as const,
      error: typeof data.error === "string" ? data.error : "Etwas ist schiefgelaufen.",
      details: (data.details ?? {}) as Record<string, string>,
      status: res.status,
    };
  }
  return { ok: true as const, data };
}

export function ApiButton(p: Props) {
  const router = useRouter();
  const flash = useFlash();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cls = `btn btn--${p.variant ?? "secondary"}${p.small ? " btn--small" : ""}${p.block ? " btn--block" : ""}`;
  const working = busy || pending;

  async function run() {
    if (p.confirm && !window.confirm(p.confirm)) return;
    setBusy(true);
    setError(null);
    const r = await callApi(p.url, p.method ?? "POST", p.body);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      startTransition(() => router.refresh());
      return;
    }
    if (p.successMessage) flash(p.successMessage);
    startTransition(() => {
      if (p.redirectTo) router.push(p.redirectTo.replace("{id}", String(r.data.id ?? r.data.projectId ?? "")));
      // Frische Serverdaten erzwingen, auch wenn die Zielseite noch im Router-Cache liegt.
      router.refresh();
    });
  }

  return (
    <div className="stack-sm" style={{ display: p.block ? "block" : "inline-block" }}>
      <button type="button" className={cls} onClick={run} disabled={working} aria-busy={working} data-testid={p.testId}>
        {working ? (p.pendingLabel ?? "Einen Moment …") : p.label}
      </button>
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
