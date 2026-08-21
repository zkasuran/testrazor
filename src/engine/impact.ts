import type { DepGraph, ImpactResult } from "../models.js";

/** Does `start` transitively import any file in `targets`? */
function reaches(graph: DepGraph, start: string, targets: Set<string>): boolean {
  const stack = [start];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === undefined || visited.has(cur)) continue;
    visited.add(cur);
    const deps = graph.imports.get(cur);
    if (!deps) continue;
    for (const dep of deps) {
      if (targets.has(dep)) return true;
      if (!visited.has(dep)) stack.push(dep);
    }
  }
  return false;
}

/** All files reachable from `start`, following import edges, added into `acc`. */
function collectReachable(graph: DepGraph, start: string, acc: Set<string>): void {
  const stack = [start];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === undefined || acc.has(cur)) continue;
    acc.add(cur);
    const deps = graph.imports.get(cur);
    if (deps) for (const dep of deps) if (!acc.has(dep)) stack.push(dep);
  }
}

/** Select the test files affected by a set of changed files. Pure.
 * A change to a non-source file fails safe by selecting every test. */
export function selectImpacted(graph: DepGraph, changedFiles: string[]): ImpactResult {
  const total = graph.testFiles.size;
  const known = new Set(graph.imports.keys());
  const unmapped = changedFiles.filter((f) => !known.has(f)).sort();

  if (unmapped.length > 0) {
    return {
      total,
      selected: [...graph.testFiles].sort(),
      selectedAll: true,
      unmappedFiles: unmapped,
      uncoveredChanges: [],
    };
  }

  const changed = new Set(changedFiles);
  const selected = new Set<string>();
  for (const test of graph.testFiles) {
    if (changed.has(test) || reaches(graph, test, changed)) selected.add(test);
  }

  const coveredSources = new Set<string>();
  for (const test of graph.testFiles) collectReachable(graph, test, coveredSources);
  const uncoveredChanges = [...changed]
    .filter((f) => !graph.testFiles.has(f) && !coveredSources.has(f))
    .sort();

  return {
    total,
    selected: [...selected].sort(),
    selectedAll: false,
    unmappedFiles: [],
    uncoveredChanges,
  };
}
