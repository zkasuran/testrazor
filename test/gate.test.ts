import { describe, it, expect } from "vitest";
import { evaluateGate } from "../src/engine/gate.js";
import type { RunResults } from "../src/models.js";

const one = (id: string, status: "pass" | "fail"): RunResults => ({
  runId: "r",
  outcomes: [{ id, status }],
});

describe("gate", () => {
  it("@covers 5.1 fails on a real, non-quarantined failure", () => {
    const g = evaluateGate([one("real", "fail")], new Set());
    expect(g.passed).toBe(false);
    expect(g.failing).toEqual(["real"]);
  });

  it("@covers 3.2 @covers 5.2 excludes a quarantined test so the gate passes", () => {
    const g = evaluateGate([one("flaky", "fail")], new Set(["flaky"]));
    expect(g.passed).toBe(true);
    expect(g.ignoredFlaky).toEqual(["flaky"]);
  });

  it("@covers 5.3 never masks a real failure alongside a quarantined one", () => {
    const runs: RunResults[] = [
      { runId: "r", outcomes: [{ id: "real", status: "fail" }, { id: "flaky", status: "fail" }] },
    ];
    const g = evaluateGate(runs, new Set(["flaky"]));
    expect(g.passed).toBe(false);
    expect(g.failing).toEqual(["real"]);
    expect(g.ignoredFlaky).toEqual(["flaky"]);
  });
});
