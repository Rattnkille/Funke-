"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { authClient } from "@/lib/auth-client";

function safeReturn(path: string | undefined) {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "/start";
}

export function AuthForm({ mode, returnTo }: { mode: "login" | "register"; returnTo?: string }) {
  const router = useRouter();
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const target = safeReturn(returnTo);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    setError(null);
    if (!email || !password) {
      setError("Bitte E-Mail-Adresse und Passwort eingeben.");
      return;
    }
    setBusy(true);
    const result =
      mode === "login"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({
            email,
            password,
            name: String(fd.get("name") ?? "").trim(),
            adultConfirmed: fd.get("adult") === "on",
          } as Parameters<typeof authClient.signUp.email>[0]);
    setBusy(false);
    if (result.error) {
      const code = result.error.code ?? "";
      const msg =
        code === "INVALID_EMAIL_OR_PASSWORD"
          ? "E-Mail-Adresse oder Passwort stimmt nicht."
          : code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
            ? "Mit dieser E-Mail-Adresse gibt es schon ein Konto. Melde dich an."
            : code === "PASSWORD_TOO_SHORT"
              ? "Das Passwort braucht mindestens 10 Zeichen."
              : code === "INVALID_EMAIL"
                ? "Bitte gib eine gültige E-Mail-Adresse an."
                : result.error.status === 429
                  ? "Zu viele Versuche. Bitte warte eine Minute."
                  : (result.error.message ?? "Das hat nicht geklappt. Bitte versuche es erneut.");
      setError(msg);
      return;
    }
    router.push(target);
    router.refresh();
  }

  const other = mode === "login" ? "/registrieren" : "/anmelden";
  const otherHref = returnTo ? `${other}?weiter=${encodeURIComponent(target)}` : other;

  return (
    <form onSubmit={onSubmit} noValidate className="card stack">
      <div>
        {mode === "register" && (
          <div className="field">
            <label htmlFor={`${id}-name`}>Dein Name</label>
            <span className="hint" id={`${id}-name-hint`}>So sehen dich die anderen in deinen Projekten.</span>
            <input id={`${id}-name`} name="name" type="text" autoComplete="name" required minLength={2} maxLength={60} aria-describedby={`${id}-name-hint`} />
          </div>
        )}
        <div className="field">
          <label htmlFor={`${id}-email`}>E-Mail-Adresse</label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor={`${id}-pw`}>Passwort</label>
          {mode === "register" && <span className="hint" id={`${id}-pw-hint`}>Mindestens 10 Zeichen.</span>}
          <input
            id={`${id}-pw`}
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "register" ? 10 : undefined}
            aria-describedby={mode === "register" ? `${id}-pw-hint` : undefined}
          />
        </div>
        {mode === "register" && (
          <label className="check">
            <input type="checkbox" name="adult" required />
            <span>Ich bin volljährig. Kinder und betreute Teilnehmende brauchen kein eigenes Konto.</span>
          </label>
        )}
      </div>
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--primary btn--block" disabled={busy} aria-busy={busy}>
        {busy ? "Einen Moment …" : mode === "login" ? "Anmelden" : "Konto erstellen"}
      </button>
      <p className="small muted">
        {mode === "login" ? "Noch kein Konto? " : "Schon ein Konto? "}
        <Link href={otherHref}>{mode === "login" ? "Konto erstellen" : "Anmelden"}</Link>
      </p>
    </form>
  );
}
