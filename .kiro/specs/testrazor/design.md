# Design Document

## Overview

testrazor is a small TypeScript program compiled to ESM and shipped as a single
`testrazor` binary plus a composite GitHub Action. It reads artifacts a suite
already produces (JUnit XML results and a git diff), builds a source dependency
graph for JavaScript and TypeScript projects and computes two things: which
tests a change touches and which tests are flaky. It then prints a report plus
a gate exit code. It holds no state of its own beyond an optional quarantine
file the user commits.

The design goal is determinism. The same inputs always produce the same output,
so there is nothing to mock and nothing to key.

## Architecture

```
                  ┌──────────────┐
 git diff ──────▶ │  ingestion   │ ── ChangedFiles ─┐
 source tree ───▶ │  + graph     │ ── DepGraph ─────┼─▶ impact engine ─▶ SelectedTests
 JUnit runs ────▶ │              │ ── RunResults ───┼─▶ flake engine  ─▶ FlakeReport + Quarantine
                  └──────────────┘                  │
                                                     └─▶ gate ─▶ exit code
                          all of the above ─▶ reporter ─▶ table | json | markdown
```

Layers, each a folder under `src/`:

- `ingest/` pure parsers. `junit.ts` (fast-xml-parser), `git.ts` (shell out to `git diff --name-only`, plus a pure output parser).
- `graph/` `imports.ts` builds the dependency graph by scanning relative import, export and require specifiers and resolving them to files.
- `engine/` pure functions. `impact.ts` and `flake.ts`. No IO, fully unit tested.
- `report/` render a `Report` to a table, JSON or Markdown.
- `cli.ts` argument parsing with node `util.parseArgs`, config loading, wiring.
- `config.ts` load and merge `testrazor.config.json` with CLI flags.

## Data models (`src/models.ts`)

```ts
type TestId = string; // "classname :: name", stable across runs
interface TestOutcome { id: TestId; status: "pass" | "fail" | "skip"; file?: string; }
interface RunResults { runId: string; outcomes: TestOutcome[]; }
interface DepGraph {          // repo-relative paths
  imports: Map<string, Set<string>>;   // file -> files it imports directly
  testFiles: Set<string>;              // files matching the test glob
}
interface FlakeVerdict { id: TestId; passes: number; fails: number; runs: number; score: number; flaky: boolean; consistentFailure: boolean; }
interface QuarantineEntry { id: TestId; score: number; seenRuns: string[]; addedAt: string; }
interface ImpactResult { total: number; selected: string[]; selectedAll: boolean; unmappedFiles: string[]; uncoveredChanges: string[]; }
```

## Impact engine (Requirement 1)

Impact is a dependency-graph problem, not a coverage problem: standard coverage
reports are aggregated across a whole run, so they cannot say which test touched
which line. A static import graph can, deterministically and per language.

1. `changed = git.diffNames(base, head)` returns repo-relative paths.
2. `graph = buildGraph(root)` scans every source file for relative `import`,
   `export ... from`, `require()` and dynamic `import()` specifiers and resolves
   them (trying `.ts .tsx .js .jsx .mjs .cjs` and `/index.*`). Bare specifiers
   (node_modules) are ignored.
3. Partition `changed` into source files known to the graph and everything else.
4. IF any changed path is not a known source file (a config file, a non-JS
   file) THEN return the fail-safe `selectedAll = true` and record it, so an
   unmeasured change never silently skips its tests (Requirement 1.4).
5. Otherwise `selected = { test file T | T transitively imports a changed source
   file } ∪ { changed test files }`. A changed source file that no test imports
   is reported in `uncoveredChanges` (Requirement 1.5), never hidden.
6. Emit selected test files and the ratio `selected / total` for the report.

The tradeoff is documented in the README: impact selection is supported for
JavaScript and TypeScript. Flake detection is language agnostic through JUnit.

## Flake engine (Requirements 2 and 3)

1. Group outcomes across the provided runs by `TestId`.
2. `passes` and `fails` are counts across runs. `score = min(passes, fails) / floor(runs / 2)` clamped to [0, 1], so a test that alternates evenly scores near 1 and a test that fails once in ten scores low but non-zero.
3. `flaky = passes > 0 && fails > 0`. A test that only ever fails is a consistent failure, never flaky (Requirement 2.3), which protects real bugs from being quarantined.
4. Quarantine adds flaky ids with score and `seenRuns`. The gate excludes quarantined ids. A quarantined id that is all-pass across the window is flagged for release (Requirement 3.3).

## Reporter (Requirement 4) and gate (Requirement 5)

The reporter takes a single `Report` object and renders it three ways. The
Markdown renderer is what the Action posts. The gate reduces the report to an
exit code: non-zero if any non-quarantined test failed, zero otherwise and it
never lets a consistent failure pass.

## CLI (Requirement 6)

`testrazor <command> [flags]` via `util.parseArgs`, no argument-parser
dependency. Commands: `impact`, `flake`, `report`, `gate`, `init`. Flags include
`--base`, `--head`, `--root`, `--report` (repeatable), `--json`, `--markdown`,
`--config`. CLI flags override config file values.

## GitHub Action

A composite action (`action.yml`) that runs the built CLI, writes the Markdown
report and uses the GitHub REST API through the job token to upsert one PR
comment keyed by a hidden marker so re-runs update in place rather than pile up.

## Dogfooding

testrazor runs on its own suite. vitest emits `reports/junit.xml`, then
`testrazor flake` runs against a set of runs and `testrazor impact` runs against
the repo's own import graph and the repo commits its own quarantine file. The
demo shows testrazor judging itself.

## Testing strategy

Every acceptance criterion maps to at least one vitest case tagged
`@covers <req>.<n>` in its name, so the traceability is visible and the suite
doubles as the flake and impact fixture set.
