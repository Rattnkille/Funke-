"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { callApi } from "./ApiButton";
import { useFlash } from "./Flash";

export type Field =
  | { kind: "text" | "email" | "password" | "date"; name: string; label: string; hint?: string; required?: boolean; defaultValue?: string; autoComplete?: string; maxLength?: number; minLength?: number }
  | { kind: "textarea"; name: string; label: string; hint?: string; required?: boolean; defaultValue?: string; maxLength?: number }
  | { kind: "number"; name: string; label: string; hint?: string; required?: boolean; defaultValue?: number; min?: number; max?: number; step?: number }
  | { kind: "select"; name: string; label: string; hint?: string; required?: boolean; defaultValue?: string; options: { value: string; label: string }[] }
  | { kind: "checkboxes"; name: string; label: string; hint?: string; defaultValue?: string[]; options: { value: string; label: string }[]; emptyText?: string };

type Props = {
  url: string;
  method?: "POST" | "PATCH";
  fields: Field[];
  submitLabel: string;
  pendingLabel?: string;
  successMessage?: string;
  /** {id} wird durch die id aus der Antwort ersetzt. */
  redirectTo?: string;
  resetOnSuccess?: boolean;
  variant?: "primary" | "secondary";
  /** Zusätzliche, feste Werte. */
  extra?: Record<string, unknown>;
  onSuccess?: (data: Record<string, unknown>) => void;
};

function serialize(form: HTMLFormElement, fields: Field[]) {
  const fd = new FormData(form);
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.kind === "checkboxes") out[f.name] = fd.getAll(f.name).map(String);
    else if (f.kind === "number") {
      const v = String(fd.get(f.name) ?? "");
      out[f.name] = v === "" ? undefined : Number(v);
    } else out[f.name] = String(fd.get(f.name) ?? "");
  }
  return out;
}

export function ApiForm(p: Props) {
  const router = useRouter();
  const flash = useFlash();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const working = busy || pending;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    const r = await callApi(p.url, p.method ?? "POST", { ...serialize(form, p.fields), ...p.extra });
    setBusy(false);
    if (!r.ok) {
      const bad = p.fields.filter((f) => r.details?.[f.name]);
      setError(
        bad.length > 0
          ? `Bitte prüfe ${bad.length === 1 ? "das markierte Feld" : `die ${bad.length} markierten Felder`}.`
          : r.error,
      );
      setFieldErrors(r.details ?? {});
      const firstBad = bad[0];
      if (firstBad) (form.elements.namedItem(firstBad.name) as HTMLElement | null)?.focus?.();
      return;
    }
    if (p.resetOnSuccess) form.reset();
    if (p.successMessage) flash(p.successMessage);
    p.onSuccess?.(r.data);
    startTransition(() => {
      if (p.redirectTo) router.push(p.redirectTo.replace("{id}", String(r.data.id ?? "")));
      // Frische Serverdaten erzwingen, auch wenn die Zielseite noch im Router-Cache liegt.
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="stack">
      <div>
        {p.fields.map((f) => {
          const id = `${uid}-${f.name}`;
          const err = fieldErrors[f.name];
          const describedBy = [f.hint ? `${id}-hint` : null, err ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
          const common = { id, name: f.name, "aria-invalid": err ? true : undefined, "aria-describedby": describedBy };
          if (f.kind === "checkboxes") {
            return (
              <fieldset className="field" key={f.name} aria-describedby={describedBy}>
                <legend>{f.label}</legend>
                {f.hint && <span id={`${id}-hint`} className="hint">{f.hint}</span>}
                {f.options.length === 0 && <p className="hint">{f.emptyText ?? "Keine Auswahl möglich."}</p>}
                {f.options.map((o) => (
                  <label className="check" key={o.value}>
                    <input type="checkbox" name={f.name} value={o.value} defaultChecked={f.defaultValue?.includes(o.value)} />
                    <span>{o.label}</span>
                  </label>
                ))}
                {err && <span id={`${id}-err`} className="field-error">{err}</span>}
              </fieldset>
            );
          }
          return (
            <div className="field" key={f.name}>
              <label htmlFor={id}>
                {f.label}
                {!f.required && <span className="muted"> (optional)</span>}
              </label>
              {f.hint && <span id={`${id}-hint`} className="hint">{f.hint}</span>}
              {f.kind === "textarea" ? (
                <textarea {...common} defaultValue={f.defaultValue} required={f.required} maxLength={f.maxLength} />
              ) : f.kind === "select" ? (
                <select {...common} defaultValue={f.defaultValue} required={f.required}>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.kind === "number" ? (
                <input {...common} type="number" inputMode="numeric" defaultValue={f.defaultValue} min={f.min} max={f.max} step={f.step ?? 1} required={f.required} />
              ) : (
                <input
                  {...common}
                  type={f.kind}
                  defaultValue={f.defaultValue}
                  required={f.required}
                  autoComplete={"autoComplete" in f ? f.autoComplete : undefined}
                  maxLength={"maxLength" in f ? f.maxLength : undefined}
                />
              )}
              {err && <span id={`${id}-err`} className="field-error">{err}</span>}
            </div>
          );
        })}
      </div>
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={`btn btn--${p.variant ?? "primary"}`} disabled={working} aria-busy={working}>
        {working ? (p.pendingLabel ?? "Wird gespeichert …") : p.submitLabel}
      </button>
    </form>
  );
}
