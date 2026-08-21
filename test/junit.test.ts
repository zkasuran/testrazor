import { describe, it, expect } from "vitest";
import { parseJUnit } from "../src/ingest/junit.js";

const XML = `<?xml version="1.0"?>
<testsuites><testsuite name="s">
<testcase classname="s" name="ok"/>
<testcase classname="s" name="bad"><failure message="x"/></testcase>
<testcase classname="s" name="skipped one"><skipped/></testcase>
</testsuite></testsuites>`;

describe("junit", () => {
  it("@covers 2.1 @covers 7.1 parses pass, fail and skip", () => {
    const r = parseJUnit(XML, "run1");
    expect(r.outcomes).toHaveLength(3);
    const byId = Object.fromEntries(r.outcomes.map((o) => [o.id, o.status]));
    expect(byId["s :: ok"]).toBe("pass");
    expect(byId["s :: bad"]).toBe("fail");
    expect(byId["s :: skipped one"]).toBe("skip");
  });

  it("@covers 7.1 handles a single testsuite root with a single testcase", () => {
    const r = parseJUnit(`<testsuite name="s"><testcase name="only"/></testsuite>`, "r");
    expect(r.outcomes).toEqual([{ id: "only", status: "pass" }]);
  });
});
