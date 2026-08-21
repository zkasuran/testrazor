import { describe, it, expect } from "vitest";
import { extractSpecifiers, buildGraph } from "../src/graph/imports.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("dependency graph", () => {
  it("@covers 7.2 extracts import, export-from, require, dynamic and side-effect specifiers", () => {
    const specs = extractSpecifiers(
      [
        'import a from "./a.js";',
        'export { b } from "./b";',
        'const c = require("./c");',
        'const d = await import("./d");',
        'import "./side";',
        'import x from "pkg";',
      ].join("\n"),
    );
    for (const s of ["./a.js", "./b", "./c", "./d", "./side", "pkg"]) expect(specs).toContain(s);
  });

  it("@covers 1.2 builds a graph resolving .js specifiers to .ts sources", () => {
    const dir = mkdtempSync(join(tmpdir(), "tr-graph-"));
    mkdirSync(join(dir, "src"));
    mkdirSync(join(dir, "test"));
    writeFileSync(join(dir, "src/a.ts"), "export const a = 1;\n");
    writeFileSync(join(dir, "src/b.ts"), 'import { a } from "./a.js";\nexport const b = a;\n');
    writeFileSync(join(dir, "test/b.test.ts"), 'import { b } from "../src/b.js";\nb;\n');
    const g = buildGraph({ root: dir });
    expect(g.testFiles.has("test/b.test.ts")).toBe(true);
    expect(g.imports.get("src/b.ts")).toEqual(new Set(["src/a.ts"]));
    expect(g.imports.get("test/b.test.ts")).toEqual(new Set(["src/b.ts"]));
  });
});
