import type { GateResult, RunResults, TestId } from "../models.js";

/** Reduce runs and a quarantine set to a pass or fail decision. Pure.
 * A failing test is real unless it is quarantined, so a consistent failure is
 * never masked while a known flaky one does not block the gate. */
export function evaluateGate(runs: RunResults[], quarantinedIds: Set<TestId>): GateResult {
  const failing = new Set<TestId>();
  for (const run of runs) {
    for (const o of run.outcomes) {
      if (o.status === "fail") failing.add(o.id);
    }
  }
  const real: TestId[] = [];
  const ignoredFlaky: TestId[] = [];
  for (const id of [...failing].sort()) {
    (quarantinedIds.has(id) ? ignoredFlaky : real).push(id);
  }
  return { passed: real.length === 0, failing: real, ignoredFlaky };
}
