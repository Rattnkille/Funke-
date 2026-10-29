import { z } from "zod";
import { ENERGY } from "@/db/schema";
import { DomainError } from "./errors";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} fehlt.` })
    .trim()
    .min(min, { error: `${label}: mindestens ${min} Zeichen.` })
    .max(max, { error: `${label}: höchstens ${max} Zeichen.` });

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Termin bitte als Datum angeben." })
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), { error: "Termin ist kein gültiges Datum." });

const optionalDate = z
  .union([isoDate, z.literal(""), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

export const projectInput = z.object({
  title: trimmed(3, 80, "Titel"),
  description: trimmed(1, 1000, "Beschreibung"),
  goal: trimmed(3, 200, "Ziel"),
  eventDate: optionalDate,
});
export type ProjectInput = z.input<typeof projectInput>;

export const missionFields = z.object({
  title: trimmed(3, 80, "Titel"),
  description: trimmed(10, 600, "Handlungsbeschreibung"),
  durationMinutes: z.coerce
    .number({ error: "Dauer fehlt." })
    .int({ error: "Dauer bitte in ganzen Minuten." })
    .min(5, { error: "Dauer: mindestens 5 Minuten." })
    .max(480, { error: "Dauer: höchstens 480 Minuten (8 Stunden)." }),
  energy: z.enum(ENERGY, { error: "Bitte wähle die benötigte Energie." }),
});

export const missionInput = missionFields.extend({
  dependsOn: z.array(z.string().min(1)).max(50).optional().default([]),
});
export type MissionInput = z.input<typeof missionInput>;

export const missionUpdate = missionFields.partial().extend({
  dependsOn: z.array(z.string().min(1)).max(50).optional(),
});
export type MissionUpdate = z.input<typeof missionUpdate>;

export const inviteInput = z.object({
  days: z.coerce
    .number()
    .int()
    .min(1, { error: "Gültigkeit: mindestens 1 Tag." })
    .max(14, { error: "Gültigkeit: höchstens 14 Tage." })
    .default(7),
});

export const assignInput = z.object({ userId: z.string().min(1).nullable() });

export const focusInput = z.object({
  minutes: z.coerce.number().int().min(5).max(480),
  energy: z.enum(ENERGY),
});

export const templateInput = z.object({
  title: trimmed(3, 80, "Titel"),
  description: trimmed(1, 1000, "Beschreibung"),
  goal: trimmed(3, 200, "Ziel"),
});

export const fromTemplateInput = z.object({
  title: trimmed(3, 80, "Titel"),
  eventDate: optionalDate,
});

/** Validiert serverseitig und wirft verständliche Feldfehler. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const details: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!details[key]) details[key] = issue.message;
  }
  const first = Object.values(details)[0] ?? "Eingabe ungültig.";
  throw new DomainError("INVALID", first, details);
}
