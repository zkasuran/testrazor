---
inclusion: always
---

# Tech

- **Language.** TypeScript, strict, compiled to ESM for Node 20+.
- **Runtime deps.** One only: `fast-xml-parser` for JUnit XML. Keep it
  that way. Prefer Node built-ins (`util.parseArgs`, `node:fs`, `node:child_process`).
- **Dev deps.** vitest, typescript, @types/node. All pinned exact.
- **Tests.** vitest, run with `npm test`. It emits `reports/junit.xml` and
  coverage so testrazor can run on itself.
- **Types.** No `any`. `noUncheckedIndexedAccess` is on. Engines are pure
  functions with no IO so they are trivially testable.

## Commands

- `npm test` run the suite (emits JUnit + coverage)
- `npm run typecheck` strict tsc, no emit
- `npm run build` compile to `dist/`
- `node dist/cli.js <command>` run the CLI

## Conventions

- Comments explain why, not what. Match the density of the surrounding code.
- Parsers never throw on malformed input without a message that names the file
  and the expected format.
- Every new acceptance criterion gets a test tagged `@covers <req>.<n>`.
