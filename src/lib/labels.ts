export const ENERGY_OPTIONS = [
  { value: "low", label: "Wenig Energie", short: "wenig" },
  { value: "medium", label: "Mittlere Energie", short: "mittel" },
  { value: "high", label: "Viel Energie", short: "viel" },
] as const;

/** „mit wenig / mittlerer / viel Energie“ */
export const withEnergy = (e: string) => ({ low: "mit wenig Energie", medium: "mit mittlerer Energie", high: "mit viel Energie" })[e] ?? e;

export const energyShort = (e: string) => ENERGY_OPTIONS.find((o) => o.value === e)?.short ?? e;

export const TIME_OPTIONS = [15, 30, 60, 120] as const;

export const roleLabel = (r: string) => (r === "organizer" ? "Organisation" : "Mitglied");

export function formatDuration(min: number) {
  if (min < 60) return `${min} Min.`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} Std. ${m} Min.` : `${h} Std.`;
}

const dateFmt = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export const formatEventDate = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`));

const dtFmt = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
export const formatDateTime = (d: Date | string | number) => dtFmt.format(new Date(d));

/** Einfache visuelle Entwicklung: aus dem Funken wird ein heißer Ofen. */
export function stageOf(percent: number, total: number) {
  if (total === 0) return { label: "Erster Funke", hint: "Noch keine Missionen" };
  if (percent === 0) return { label: "Funke", hint: "Es geht los" };
  if (percent < 40) return { label: "Glut", hint: "Die ersten Schritte sind geschafft" };
  if (percent < 75) return { label: "Flamme", hint: "Gut die Hälfte ist erledigt" };
  if (percent < 100) return { label: "Feuer", hint: "Fast geschafft" };
  return { label: "Ofen ist heiß", hint: "Alle Missionen erledigt" };
}
