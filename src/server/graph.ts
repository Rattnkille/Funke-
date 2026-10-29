/** Kanten: missionId -> Liste der Voraussetzungen (dependsOn). */
export type DependencyMap = Map<string, string[]>;

export function buildDependencyMap(edges: { missionId: string; dependsOnId: string }[]): DependencyMap {
  const map: DependencyMap = new Map();
  for (const e of edges) {
    const list = map.get(e.missionId) ?? [];
    list.push(e.dependsOnId);
    map.set(e.missionId, list);
  }
  return map;
}

/**
 * Prüft, ob `missionId` mit den neuen Voraussetzungen `dependsOn` einen Zyklus erzeugen würde.
 * Ein Zyklus entsteht, wenn eine neue Voraussetzung (direkt oder indirekt) von `missionId` abhängt.
 */
export function wouldCreateCycle(deps: DependencyMap, missionId: string, dependsOn: string[]): boolean {
  if (dependsOn.includes(missionId)) return true;
  const stack = [...dependsOn];
  const seen = new Set<string>();
  while (stack.length) {
    const current = stack.pop()!;
    if (current === missionId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of deps.get(current) ?? []) {
      if (next !== undefined) stack.push(next);
    }
  }
  return false;
}

/** Wie viele Missionen hängen direkt von jeder Mission ab? */
export function dependentCounts(deps: DependencyMap): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const [missionId, list] of deps) {
    for (const d of list) {
      const arr = result.get(d) ?? [];
      arr.push(missionId);
      result.set(d, arr);
    }
  }
  return result;
}
