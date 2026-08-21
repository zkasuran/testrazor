import { describe, it, expect } from "vitest";
import { selectImpacted } from "../src/engine/impact.js";
import type { DepGraph } from "../src/models.js";

function graph(imports: Record<string, string[]>, testFiles: string[]): DepGraph {
  return {
    imports: new Map(Object.entries(imports).map(([k, v]) => [k, new Set(v)])),
    testFiles: new Set(testFiles),
  };
}

const g = graph(
  {
    "src/a.ts": [],
    "src/b.ts": ["src/a.ts"],
    "test/a.test.ts": ["src/a.ts"],
    "test/b.test.ts": ["src/b.ts"],
  },
  ["test/a.test.ts", "test/b.test.ts"],
);

describe("impact engine", () => {
  it("@covers 1.3 selects tests that transitively import a changed source", () => {
    const r = selectImpacted(g, ["src/a.ts"]);
    expect(r.selected).toEqual(["test/a.test.ts", "test/b.test.ts"]);
    expect(r.selectedAll).toBe(false);
  });

  it("@covers 1.6 selects only the directly affected test for a leaf change", () => {
    expect(selectImpacted(g, ["src/b.ts"]).selected).toEqual(["test/b.test.ts"]);
  });

  it("@covers 1.4 fails safe to all tests on a non-source change", () => {
    const r = selectImpacted(g, ["package.json"]);
    expect(r.selectedAll).toBe(true);
    expect(r.selected).toEqual(["test/a.test.ts", "test/b.test.ts"]);
    expect(r.unmappedFiles).toEqual(["package.json"]);
  });

  it("@covers 1.5 reports a changed source that no test imports", () => {
    const g2 = graph(
      { "src/orphan.ts": [], "src/a.ts": [], "test/a.test.ts": ["src/a.ts"] },
      ["test/a.test.ts"],
    );
    const r = selectImpacted(g2, ["src/orphan.ts"]);
    expect(r.selected).toEqual([]);
    expect(r.uncoveredChanges).toEqual(["src/orphan.ts"]);
  });
});
