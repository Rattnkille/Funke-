import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { membership, project, type Energy } from "@/db/schema";
import { loadMissions, type MissionView } from "./missions";
import { focusInput, parse } from "./validation";

export const ENERGY_RANK: Record<Energy, number> = { low: 1, medium: 2, high: 3 };
export const ENERGY_LABEL: Record<Energy, string> = { low: "wenig", medium: "mittlere", high: "viel" };

export type Suggestion = {
  mission: MissionView;
  projectTitle: string;
  reasons: string[];
  score: number;
};

/** Ausführbar heißt: nicht abgeschlossen, nicht blockiert und frei oder bereits von mir übernommen. */
export function isExecutableFor(m: MissionView, userId: string) {
  return (m.state === "offen" && !m.assigneeId) || (m.state === "übernommen" && m.assigneeId === userId);
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

/**
 * Regelbasierte Auswahl ohne KI: Filter nach Zeit und Energie, dann Rangfolge
 * 1. bereits von mir übernommen, 2. schaltet die meisten Missionen frei, 3. nutzt die Zeit gut, 4. Reihenfolge im Projekt.
 */
export function rankSuggestions(
  missions: MissionView[],
  userId: string,
  minutes: number,
  energy: Energy,
  projectTitles: Map<string, string>,
  limit = 3,
): Suggestion[] {
  const candidates = missions.filter(
    (m) => isExecutableFor(m, userId) && m.durationMinutes <= minutes && ENERGY_RANK[m.energy] <= ENERGY_RANK[energy],
  );
  return candidates
    .map((m) => {
      const reasons: string[] = [];
      const mine = m.assigneeId === userId;
      if (mine) reasons.push("Du hast sie schon übernommen.");
      reasons.push(`Passt in deine ${minutes} Minuten (dauert etwa ${m.durationMinutes}).`);
      reasons.push(
        ENERGY_RANK[m.energy] < ENERGY_RANK[energy]
          ? `Braucht ${ENERGY_LABEL[m.energy]} Energie, weniger als du gerade hast.`
          : `Braucht ${ENERGY_LABEL[m.energy]} Energie, das passt zu dir gerade.`,
      );
      if (m.unlocks.length) {
        reasons.push(`Schaltet ${m.unlocks.length} ${plural(m.unlocks.length, "weitere Mission", "weitere Missionen")} frei.`);
      }
      const score = (mine ? 1000 : 0) + m.unlocks.length * 10 + (m.durationMinutes / minutes) * 5 - m.position * 0.01;
      return { mission: m, projectTitle: projectTitles.get(m.projectId) ?? "", reasons, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export type FocusResult = {
  minutes: number;
  energy: Energy;
  suggestions: Suggestion[];
  /** Hinweise für den Leerzustand, abgeleitet aus echten Daten. */
  empty: null | {
    executableCount: number;
    shortestMinutes: number | null;
    lowestEnergy: Energy | null;
    blockedCount: number;
  };
};

export function activeMissionsForUser(db: Db, userId: string) {
  const projects = db
    .select({ id: project.id, title: project.title })
    .from(membership)
    .innerJoin(project, eq(project.id, membership.projectId))
    .where(and(eq(membership.userId, userId), eq(project.status, "active")))
    .all();
  const titles = new Map(projects.map((p) => [p.id, p.title]));
  return { missions: loadMissions(db, projects.map((p) => p.id)), titles };
}

export function getFocus(db: Db, userId: string, raw: unknown): FocusResult {
  const { minutes, energy } = parse(focusInput, raw);
  const { missions, titles } = activeMissionsForUser(db, userId);
  const suggestions = rankSuggestions(missions, userId, minutes, energy, titles);
  if (suggestions.length) return { minutes, energy, suggestions, empty: null };
  const executable = missions.filter((m) => isExecutableFor(m, userId));
  const lowest = executable.reduce<Energy | null>(
    (acc, m) => (acc === null || ENERGY_RANK[m.energy] < ENERGY_RANK[acc] ? m.energy : acc),
    null,
  );
  return {
    minutes,
    energy,
    suggestions: [],
    empty: {
      executableCount: executable.length,
      shortestMinutes: executable.length ? Math.min(...executable.map((m) => m.durationMinutes)) : null,
      lowestEnergy: lowest,
      blockedCount: missions.filter((m) => m.state === "blockiert").length,
    },
  };
}
