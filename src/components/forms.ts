import type { Field } from "./ApiForm";
import { ENERGY_OPTIONS } from "@/lib/labels";

export function projectFields(d?: { title?: string; description?: string; goal?: string; eventDate?: string | null }): Field[] {
  return [
    { kind: "text", name: "title", label: "Titel", required: true, defaultValue: d?.title, maxLength: 80, hint: "Zum Beispiel: Generationen-Ofen im Hof" },
    { kind: "textarea", name: "description", label: "Beschreibung", required: true, defaultValue: d?.description, maxLength: 1000, hint: "Worum geht es, wer ist dabei, was ist schon klar?" },
    { kind: "text", name: "goal", label: "Ziel", required: true, defaultValue: d?.goal, maxLength: 200, hint: "Woran merkt ihr, dass es geschafft ist?" },
    { kind: "date", name: "eventDate", label: "Termin", defaultValue: d?.eventDate ?? "" },
  ];
}

export function missionFields(
  d: { title?: string; description?: string; durationMinutes?: number; energy?: string; dependsOn?: string[] } | undefined,
  candidates: { value: string; label: string }[],
): Field[] {
  return [
    { kind: "text", name: "title", label: "Titel", required: true, defaultValue: d?.title, maxLength: 80, hint: "Kurz und konkret, z. B. „Teig für 12 Pizzen ansetzen“" },
    { kind: "textarea", name: "description", label: "Was ist genau zu tun?", required: true, defaultValue: d?.description, maxLength: 600, hint: "Eine konkrete Handlung, die jemand ohne Rückfrage erledigen kann." },
    { kind: "number", name: "durationMinutes", label: "Geschätzte Dauer in Minuten", required: true, defaultValue: d?.durationMinutes ?? 30, min: 5, max: 480, step: 5 },
    { kind: "select", name: "energy", label: "Benötigte Energie", required: true, defaultValue: d?.energy ?? "medium", options: ENERGY_OPTIONS.map((o) => ({ value: o.value, label: o.label })) },
    { kind: "checkboxes", name: "dependsOn", label: "Hängt ab von", hint: "Diese Missionen müssen zuerst abgeschlossen sein.", defaultValue: d?.dependsOn ?? [], options: candidates, emptyText: "Noch keine anderen Missionen vorhanden." },
  ];
}
