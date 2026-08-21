import { XMLParser } from "fast-xml-parser";
import type { RunResults, TestOutcome, TestStatus } from "../models.js";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function toArray(x: unknown): unknown[] {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

/** Recursively gather every <testcase> node regardless of suite nesting. */
function collectTestcases(node: unknown, acc: Record<string, unknown>[]): void {
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "testcase") {
      for (const tc of toArray(value)) {
        if (tc && typeof tc === "object") acc.push(tc as Record<string, unknown>);
      }
      continue;
    }
    for (const child of toArray(value)) {
      if (child && typeof child === "object") collectTestcases(child, acc);
    }
  }
}

function attr(tc: Record<string, unknown>, name: string): string | undefined {
  const v = tc[name];
  return v === undefined || v === null ? undefined : String(v);
}

function toOutcome(tc: Record<string, unknown>): TestOutcome {
  const name = attr(tc, "@_name") ?? "unknown";
  const classname = attr(tc, "@_classname") ?? "";
  const file = attr(tc, "@_file");
  const id = classname ? `${classname} :: ${name}` : name;
  let status: TestStatus = "pass";
  if ("failure" in tc || "error" in tc) status = "fail";
  else if ("skipped" in tc) status = "skip";
  const outcome: TestOutcome = { id, status };
  if (file) outcome.file = file;
  const timeStr = attr(tc, "@_time");
  if (timeStr !== undefined) {
    const t = Number(timeStr);
    if (!Number.isNaN(t)) outcome.time = t;
  }
  return outcome;
}

/** Parse a JUnit XML string into normalized results. Pure. */
export function parseJUnit(xml: string, runId: string): RunResults {
  const doc = parser.parse(xml);
  const cases: Record<string, unknown>[] = [];
  collectTestcases(doc, cases);
  return { runId, outcomes: cases.map(toOutcome) };
}
