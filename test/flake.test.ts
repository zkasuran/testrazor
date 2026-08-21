import { describe, it, expect } from "vitest";
import { detectFlakes, buildQuarantine, recommendReleases } from "../src/engine/flake.js";
import type { RunResults, TestStatus } from "../src/models.js";

function runs(spec: Record<string, TestStatus[]>): RunResults[] {
  const n = Math.max(...Object.values(spec).map((a) => a.length));
  const out: RunResults[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      runId: `run${i + 1}`,
      outcomes: Object.entries(spec).map(([id, arr]) => ({ id, status: arr[i] ?? "skip" })),
    });
  }
  return out;
}

describe("flake engine", () => {
  it("@covers 2.2 flags a test that both passes and fails", () => {
    const v = detectFlakes(runs({ "t.flaky": ["pass", "fail"], "t.stable": ["pass", "pass"] }));
    expect(v.find((x) => x.id === "t.flaky")?.flaky).toBe(true);
    expect(v.find((x) => x.id === "t.stable")?.flaky).toBe(false);
  });

  it("@covers 2.3 never flags a consistent failure as flaky", () => {
    const b = detectFlakes(runs({ "t.broken": ["fail", "fail"] }))[0];
    expect(b?.flaky).toBe(false);
    expect(b?.consistentFailure).toBe(true);
  });

  it("@covers 2.4 scores an even flake at 1", () => {
    expect(detectFlakes(runs({ t: ["pass", "fail"] }))[0]?.score).toBe(1);
  });

  it("@covers 3.1 quarantines only flaky tests with their failing runs", () => {
    const rs = runs({ "t.flaky": ["pass", "fail"], "t.broken": ["fail", "fail"] });
    const q = buildQuarantine(detectFlakes(rs), rs);
    expect(q.map((e) => e.id)).toEqual(["t.flaky"]);
    expect(q[0]?.seenRuns).toEqual(["run2"]);
  });

  it("@covers 3.3 recommends releasing a quarantined test that now passes", () => {
    const rs = runs({ "t.flaky": ["pass", "fail"] });
    const q = buildQuarantine(detectFlakes(rs), rs);
    expect(recommendReleases(q, runs({ "t.flaky": ["pass", "pass"] }))).toEqual(["t.flaky"]);
  });
});
