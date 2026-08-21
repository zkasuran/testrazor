import { describe, it, expect } from "vitest";
import { renderTable, renderJson, renderMarkdown, MARKER } from "../src/report/render.js";
import type { Report } from "../src/report/render.js";

const flakeReport: Report = {
  kind: "flake",
  flakes: [
    { id: "t.flaky", passes: 1, fails: 1, runs: 2, score: 1, flaky: true, consistentFailure: false },
    { id: "t.stable", passes: 2, fails: 0, runs: 2, score: 0, flaky: false, consistentFailure: false },
  ],
};

const impactReport: Report = {
  kind: "impact",
  impact: { total: 4, selected: ["test/b.test.ts"], selectedAll: false, unmappedFiles: [], uncoveredChanges: [] },
};

describe("render", () => {
  it("@covers 4.1 renders a human-readable table", () => {
    expect(renderTable(flakeReport)).toContain("1 flaky of 2 tests");
  });

  it("@covers 4.2 renders machine-readable JSON", () => {
    expect(JSON.parse(renderJson(flakeReport)).flakes).toHaveLength(2);
  });

  it("@covers 4.3 renders a PR-comment marker in markdown", () => {
    expect(renderMarkdown(flakeReport)).toContain(MARKER);
  });

  it("@covers 4.4 reports the impact selection ratio", () => {
    expect(renderTable(impactReport)).toContain("1 of 4");
  });

  it("@covers 4.5 lists each flaky test with its score", () => {
    const out = renderTable(flakeReport);
    expect(out).toContain("t.flaky");
    expect(out).toContain("1.00");
  });
});
