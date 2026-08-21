---
inclusion: always
---

# Structure

```
src/
  models.ts        shared types
  config.ts        load testrazor.config.json, merge CLI overrides
  ingest/
    junit.ts       JUnit XML -> RunResults
    git.ts         git diff --name-only -> changed files
  graph/
    imports.ts     source tree -> DepGraph (relative imports)
  engine/
    flake.ts       RunResults -> FlakeVerdict[] (pure)
    impact.ts      DepGraph + changed files -> selected tests (pure)
  report/
    render.ts      Report -> table | json | markdown
  cli.ts           util.parseArgs, wiring, exit codes
test/              vitest specs, one per module, names tagged @covers
fixtures/
  sample-repo/     a runnable example with a flaky test and a small module graph
.github/workflows/ dogfood CI that runs testrazor on itself
.kiro/             specs, steering, hooks (committed, never gitignored)
action.yml         composite GitHub Action
```

## Rules

- `engine/` stays pure. No file or process access there. IO lives in `ingest/`,
  `report/` and `cli.ts`.
- Fixtures are real files a judge can open and re-run, never inline mocks.
- `dist/` and `reports/` are build output and are gitignored. `.kiro/` is not.
