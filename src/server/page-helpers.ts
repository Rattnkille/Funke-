import "server-only";
import { notFound } from "next/navigation";
import { DomainError } from "./errors";

/** Fachliche „nicht gefunden“-Fehler werden zur 404-Seite, alles andere bleibt ein Fehler. */
export function orNotFound<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof DomainError && (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")) notFound();
    throw e;
  }
}
