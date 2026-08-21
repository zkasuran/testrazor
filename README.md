# testrazor

Change-aware, flake-aware test intelligence for CI. Run the tests a change
actually touches. Trust the green.

**Live demo:** [zkasuran.github.io/testrazor](https://zkasuran.github.io/testrazor/)

Built with [Kiro](https://kiro.dev) using spec-driven development. The `.kiro/`
directory in this repo holds the requirements, design, tasks, steering docs and
agent hooks that produced it.

## Why

CI has two everyday failures that have nothing to do with your code:

- It reruns the whole suite for a one-line change, so feedback takes minutes.
- A flaky test fails at random, turns the build red and blocks a correct change.

testrazor fixes both from artifacts your suite already emits. No account, no API
key, no network. Same inputs, same output.

## What it does

- **Impact.** From a git diff (or an explicit changed-file list) and a source
  import graph, it selects only the test files a change can reach.
- **Flake.** From two or more JUnit runs, it finds tests that both pass and fail,
  scores them and quarantines them. A test that only ever fails is a real bug
  and is never quarantined.
- **Gate.** One exit code for CI. A quarantined flaky failure does not block. A
  real failure always does.

## Quick start (60 seconds, no install of testrazor's deps beyond a build)

```bash
git clone https://github.com/zkasuran/testrazor && cd testrazor
npm ci && npm run build

# Impact: which tests does a change to discount.ts touch?
node dist/cli.js impact --root fixtures/sample-repo --changed src/discount.ts

# Flake: find the flaky test across two recorded runs and quarantine it
node dist/cli.js flake \
  --report fixtures/sample-repo/runs/run1.xml \
  --report fixtures/sample-repo/runs/run2.xml \
  --quarantine /tmp/q.json

# Gate: the flaky failure does not block (exit 0). Drop --quarantine to see it fail.
node dist/cli.js gate --report fixtures/sample-repo/runs/run2.xml --quarantine /tmp/q.json
```

## Install

Requires Node 20+. Clone and `npm ci && npm run build`, then run
`node dist/cli.js`. Or link it as `testrazor` with `npm link`.
## Usage

```
testrazor <command> [flags]

  impact   select tests affected by a change (git diff or --changed)
  flake    detect flaky tests from JUnit runs and update the quarantine
  gate     exit non-zero on a real, non-quarantined failure
  report   print a combined impact + flake report, no side effects
  init     scaffold testrazor.config.json and a runnable example
```

Flags: `--report <file>` (JUnit XML, repeatable), `--changed <file>`
(repeatable, skips git), `--base <ref>` and `--head <ref>` (git range),
`--root <dir>` (import-graph root), `--quarantine <file>`, `--config <file>`,
`--json`, `--markdown`. CLI flags override the config file, which overrides the
defaults.

`testrazor init` writes a config and a runnable example under `.testrazor/` so
you can try `flake` immediately.

## GitHub Action

```yaml
- uses: zkasuran/testrazor@v1
  with:
    args: gate --report reports/junit.xml --quarantine .testrazor/quarantine.json
    comment: "true"   # upsert one PR comment with the report
```

The action builds testrazor, runs the CLI with your `args`, writes the report to
the job summary and (on a pull request) posts or updates a single PR comment
keyed by a hidden marker. It exits with the CLI's own exit code, so `gate` fails
the job on a real failure. This repo dogfoods it in `.github/workflows/ci.yml`.

## Configuration

`testrazor.config.json` at the repo root:

```json
{
  "root": "src",
  "base": "origin/main",
  "quarantine": ".testrazor/quarantine.json",
  "reports": ["reports/junit.xml"],
  "testPattern": "\\.(test|spec)\\.[cm]?[jt]sx?$"
}
```
## How Kiro was used

testrazor was built with Kiro's spec-driven workflow and the artifacts are
committed under `.kiro/` so you can see the process, not just the result:

- **Specs** (`.kiro/specs/testrazor/`): `requirements.md` states the behavior as
  EARS acceptance criteria, `design.md` fixes the architecture and `tasks.md` is
  the implementation plan. Every module maps back to a numbered requirement.
- **Steering** (`.kiro/steering/`): `product.md`, `tech.md` and `structure.md`
  kept every generated file consistent (one runtime dependency, pure engines, the
  honest-scope rule) without repeating it in each prompt.
- **Hooks** (`.kiro/hooks/`): one command hook runs typecheck and tests on every
  source save, one agent hook checks that each test still maps to an acceptance
  criterion.

The design changed mid-build through the spec: an early draft used coverage
reports for impact, but standard coverage is aggregated per run and cannot say
which test touched which line, so the spec and the code moved to a source import
graph. That revision is visible in the spec history.

Every test name carries a `@covers <requirement>.<criterion>` tag, so the suite
is a live traceability matrix over the requirements.

## Supported inputs (honest scope)

- **Flake and gate** work for any language that emits **JUnit XML** (jest,
  vitest, pytest, mocha, go test through a converter).
- **Impact** is supported for **JavaScript and TypeScript**, by resolving
  relative `import`, `export ... from`, `require` and dynamic `import()`
  specifiers (including `.js` specifiers that resolve to `.ts` sources).

## Costs, rate limits, network

None. testrazor makes no network calls, needs no API key or account and reads
only local files. The GitHub Action's optional PR comment uses the workflow's
own `GITHUB_TOKEN`, subject to normal GitHub API limits.
## Testing instructions (for judges)

```bash
npm ci
npm run typecheck        # strict TypeScript, no errors
npm test                 # 27 vitest cases, all green, emits reports/junit.xml
npm run build            # compiles to dist/
```

Then run the three sample commands in Quick start above. No test credentials are
required, because nothing authenticates.

To see testrazor judge itself, run the suite twice and flake-check the output:

```bash
npx vitest run --reporter=junit --outputFile=reports/run1.xml
npx vitest run --reporter=junit --outputFile=reports/run2.xml
node dist/cli.js flake --report reports/run1.xml --report reports/run2.xml \
  --quarantine .testrazor/quarantine.json
```

## How it works

Pure parsers turn a git diff and JUnit XML into normalized data. A source
walker builds the import graph. Two pure engines compute impact (test files that
transitively import a changed file) and flake (per-test pass/fail variance across
runs). A reporter renders a table, JSON or a Markdown PR comment and the gate
reduces it all to an exit code. The engines do no IO, so they are deterministic
and fully unit tested. See `.kiro/specs/testrazor/design.md`.

## Attribution

Depends on [`fast-xml-parser`](https://github.com/NaturalIntelligence/fast-xml-parser)
(MIT) for JUnit parsing. Everything else uses the Node standard library.

## License

MIT. See [LICENSE](./LICENSE).



