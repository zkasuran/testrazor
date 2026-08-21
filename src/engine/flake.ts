import type { FlakeVerdict, QuarantineEntry, RunResults, TestId } from "../models.js";

/** Classify every test across N runs. A test that only fails is a consistent
 * failure, never flaky, so real bugs are never quarantined. Pure. */
export function detectFlakes(runs: RunResults[]): FlakeVerdict[] {
  const passes = new Map<TestId, number>();
  const fails = new Map<TestId, number>();
  const ids = new Set<TestId>();
  for (const run of runs) {
    for (const o of run.outcomes) {
      if (o.status === "skip") continue;
      ids.add(o.id);
      if (o.status === "pass") passes.set(o.id, (passes.get(o.id) ?? 0) + 1);
      else fails.set(o.id, (fails.get(o.id) ?? 0) + 1);
    }
  }
  const runCount = runs.length;
  const denom = Math.max(1, Math.floor(runCount / 2));
  const verdicts: FlakeVerdict[] = [];
  for (const id of ids) {
    const p = passes.get(id) ?? 0;
    const f = fails.get(id) ?? 0;
    const flaky = p > 0 && f > 0;
    const consistentFailure = p === 0 && f > 0;
    const score = flaky ? Math.min(1, Math.min(p, f) / denom) : 0;
    verdicts.push({ id, passes: p, fails: f, runs: runCount, score, flaky, consistentFailure });
  }
  verdicts.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return verdicts;
}

/** Build a quarantine list from flaky verdicts, recording the runs each failed in. */
export function buildQuarantine(
  verdicts: FlakeVerdict[],
  runs: RunResults[],
  now: Date = new Date(),
): QuarantineEntry[] {
  const addedAt = now.toISOString().slice(0, 10);
  const failedIn = new Map<TestId, string[]>();
  for (const run of runs) {
    for (const o of run.outcomes) {
      if (o.status !== "fail") continue;
      const seen = failedIn.get(o.id) ?? [];
      seen.push(run.runId);
      failedIn.set(o.id, seen);
    }
  }
  return verdicts
    .filter((v) => v.flaky)
    .map((v) => ({ id: v.id, score: v.score, seenRuns: failedIn.get(v.id) ?? [], addedAt }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Quarantined tests that pass in every recent run are safe to release. */
export function recommendReleases(quarantine: QuarantineEntry[], recentRuns: RunResults[]): TestId[] {
  const seen = new Set<TestId>();
  const failed = new Set<TestId>();
  for (const run of recentRuns) {
    for (const o of run.outcomes) {
      if (o.status === "skip") continue;
      seen.add(o.id);
      if (o.status === "fail") failed.add(o.id);
    }
  }
  return quarantine
    .filter((q) => seen.has(q.id) && !failed.has(q.id))
    .map((q) => q.id)
    .sort();
}
