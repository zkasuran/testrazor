import { describe, it, expect } from "vitest";
import { parseDiffOutput } from "../src/ingest/git.js";

describe("git diff parsing", () => {
  it("@covers 1.1 parses changed files and drops blank lines", () => {
    expect(parseDiffOutput("src/a.ts\nsrc/b.ts\n\n  \n")).toEqual(["src/a.ts", "src/b.ts"]);
  });
});
