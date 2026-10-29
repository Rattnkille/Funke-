export type ErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "INVALID"
  | "GONE";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  CONFLICT: 409,
  INVALID: 400,
  GONE: 410,
};

/** Fachlicher Fehler mit verständlicher deutscher Meldung für die Oberfläche. */
export class DomainError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = "DomainError";
    this.status = STATUS[code];
  }
}

export const notFound = (what = "Projekt") =>
  new DomainError("NOT_FOUND", `${what} nicht gefunden oder kein Zugriff.`);
