#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, basename } from "node:path";
import { diffNames } from "./ingest/git.js";
import { parseJUnit } from "./ingest/junit.js";
import { buildGraph } from "./graph/imports.js";
import { detectFlakes, buildQuarantine, recommendReleases } from "./engine/flake.js";
import { selectImpacted } from "./engine/impact.js";
import { evaluateGate } from "./engine/gate.js";
import { renderTable, renderJson, renderMarkdown } from "./report/render.js";
import type { Report } from "./report/render.js";
import { loadConfig, mergeConfig } from "./config.js";
import type { TestrazorConfig } from "./config.js";
import type { QuarantineEntry, RunResults } from "./models.js";
import { EXAMPLE_RUN_1, EXAMPLE_RUN_2 } from "./examples.js";

interface RunFlags {
  json: boolean;
  markdown: boolean;
  head?: string;
  changed?: string[];
}

function emit(report: Report, flags: RunFlags): void {
  if (flags.json) console.log(renderJson(report));
  else if (flags.markdown) console.log(renderMarkdown(report));
  else console.log(renderTable(report));
}

function readRuns(paths: string[]): RunResults[] {
  return paths.map((p) => parseJUnit(readFileSync(p, "utf8"), basename(p)));
}

function loadQuarantine(path: string): QuarantineEntry[] {
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf8")) as QuarantineEntry[];
}

function writeQuarantine(path: string, entries: QuarantineEntry[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(entries, null, 2) + "\n");
}

function mergeQuarantine(existing: QuarantineEntry[], fresh: QuarantineEntry[]): QuarantineEntry[] {
  const byId = new Map<string, QuarantineEntry>();
  for (const e of existing) byId.set(e.id, e);
  for (const e of fresh) {
    const prev = byId.get(e.id);
    byId.set(e.id, prev
      ? { id: e.id, score: Math.max(prev.score, e.score), seenRuns: [...new Set([...prev.seenRuns, ...e.seenRuns])], addedAt: prev.addedAt }
      : e);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function graphOpts(cfg: TestrazorConfig): { root: string; testPattern?: RegExp } {
  return cfg.testPattern ? { root: cfg.root, testPattern: new RegExp(cfg.testPattern) } : { root: cfg.root };
}
function cmdImpact(cfg: TestrazorConfig, flags: RunFlags): number {
  const graph = buildGraph(graphOpts(cfg));
  const changed = flags.changed ?? diffNames(flags.head ? { base: cfg.base, head: flags.head } : { base: cfg.base });
  emit({ kind: "impact", impact: selectImpacted(graph, changed) }, flags);
  return 0;
}

function cmdFlake(cfg: TestrazorConfig, flags: RunFlags): number {
  if (cfg.reports.length === 0) {
    console.error("no --report files given (or reports[] in config)");
    return 2;
  }
  const runs = readRuns(cfg.reports);
  const flakes = detectFlakes(runs);
  const quarantine = mergeQuarantine(loadQuarantine(cfg.quarantine), buildQuarantine(flakes, runs));
  writeQuarantine(cfg.quarantine, quarantine);
  emit({ kind: "flake", flakes, quarantine, releases: recommendReleases(quarantine, runs) }, flags);
  return 0;
}

function cmdGate(cfg: TestrazorConfig, flags: RunFlags): number {
  if (cfg.reports.length === 0) {
    console.error("no --report files given (or reports[] in config)");
    return 2;
  }
  const runs = readRuns(cfg.reports);
  const quarantined = new Set(loadQuarantine(cfg.quarantine).map((q) => q.id));
  const gate = evaluateGate(runs, quarantined);
  emit({ kind: "gate", gate }, flags);
  return gate.passed ? 0 : 1;
}

function cmdReport(cfg: TestrazorConfig, flags: RunFlags): number {
  const report: Report = { kind: "flake" };
  if (cfg.reports.length > 0) report.flakes = detectFlakes(readRuns(cfg.reports));
  try {
    const changed = flags.changed ?? diffNames(flags.head ? { base: cfg.base, head: flags.head } : { base: cfg.base });
    report.impact = selectImpacted(buildGraph(graphOpts(cfg)), changed);
  } catch {
    // no git range available, skip impact
  }
  emit(report, flags);
  return 0;
}

function cmdInit(): number {
  const cfgPath = "testrazor.config.json";
  if (existsSync(cfgPath)) {
    console.log(`${cfgPath} exists, leaving it`);
  } else {
    const scaffold = { root: "src", base: "origin/main", quarantine: ".testrazor/quarantine.json", reports: ["reports/junit.xml"] };
    writeFileSync(cfgPath, JSON.stringify(scaffold, null, 2) + "\n");
    console.log(`wrote ${cfgPath}`);
  }
  mkdirSync(".testrazor/example", { recursive: true });
  writeFileSync(".testrazor/example/run1.xml", EXAMPLE_RUN_1);
  writeFileSync(".testrazor/example/run2.xml", EXAMPLE_RUN_2);
  console.log("wrote a runnable example to .testrazor/example/");
  console.log("try: testrazor flake --report .testrazor/example/run1.xml --report .testrazor/example/run2.xml");
  return 0;
}
const HELP = `testrazor <command> [flags]

Commands:
  impact   select tests affected by a git diff (needs --root and a git range)
  flake    detect flaky tests from JUnit runs and update the quarantine
  gate     exit non-zero on a real (non-quarantined) failure
  report   print a combined impact + flake report, no side effects
  init     scaffold testrazor.config.json and a runnable example

Flags:
  --report <file>   JUnit XML, repeatable    --base <ref>   --head <ref>
  --changed <file>  changed file, repeatable (skips git, for impact)
  --root <dir>      project root for the import graph
  --quarantine <f>  quarantine file path     --config <f>   config file
  --json --markdown output format (default is a table)`;

function main(argv: string[]): number {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      config: { type: "string" },
      base: { type: "string" },
      head: { type: "string" },
      root: { type: "string" },
      report: { type: "string", multiple: true },
      changed: { type: "string", multiple: true },
      quarantine: { type: "string" },
      json: { type: "boolean" },
      markdown: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  const command = positionals[0];
  if (command === undefined || values.help) {
    console.log(HELP);
    return command === undefined ? 1 : 0;
  }
  if (command === "init") return cmdInit();
  const cli: Partial<TestrazorConfig> = {};
  if (values.base !== undefined) cli.base = values.base;
  if (values.root !== undefined) cli.root = values.root;
  if (values.quarantine !== undefined) cli.quarantine = values.quarantine;
  if (values.report !== undefined) cli.reports = values.report;
  const cfg = mergeConfig(loadConfig(values.config), cli);
  const flags: RunFlags = {
    json: values.json ?? false,
    markdown: values.markdown ?? false,
    ...(values.head !== undefined ? { head: values.head } : {}),
    ...(values.changed !== undefined ? { changed: values.changed } : {}),
  };
  switch (command) {
    case "impact": return cmdImpact(cfg, flags);
    case "flake": return cmdFlake(cfg, flags);
    case "gate": return cmdGate(cfg, flags);
    case "report": return cmdReport(cfg, flags);
    default:
      console.error(`unknown command: ${command}`);
      console.log(HELP);
      return 1;
  }
}

process.exit(main(process.argv.slice(2)));
