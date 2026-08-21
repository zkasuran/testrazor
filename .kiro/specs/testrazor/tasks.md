# Implementation Plan

- [ ] 1. Data models and config loader
  - Define the types in `src/models.ts` (TestOutcome, RunResults, CoverageMap, FlakeVerdict, QuarantineEntry).
  - Implement `src/config.ts` to load `testrazor.config.json` and merge CLI overrides, CLI winning.
  - _Requirements: 6.2, 6.3_

- [ ] 2. Ingestion parsers
  - [ ] 2.1 JUnit XML parser in `src/ingest/junit.ts` using fast-xml-parser, normalising jest, vitest, pytest and mocha shapes to RunResults.
    - _Requirements: 2.1, 7.1_
  - [ ] 2.2 Dependency graph builder in `src/graph/imports.ts`, scanning relative import, export and require specifiers and resolving them to files, producing a DepGraph.
    - _Requirements: 1.2, 7.2_
  - [ ] 2.3 Git diff reader in `src/ingest/git.ts` shelling out to `git diff --name-only base..head`.
    - _Requirements: 1.1_
  - [ ] 2.4 Reject unsupported formats with a message naming supported ones.
    - _Requirements: 7.3_

- [ ] 3. Flake engine
  - Group outcomes across runs, count passes and fails, compute the flake score, classify flaky vs consistent failure.
  - Guarantee a test that only fails is never flagged flaky.
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Quarantine
  - Build and persist the quarantine list in a stable format, recommend releases, exclude quarantined ids from the gate.
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 5. Impact engine
  - Build the graph, select test files that transitively import a changed source file, fail-safe to ALL on a non-source change, report uncovered changes.
  - _Requirements: 1.3, 1.4, 1.5, 1.6_

- [ ] 6. Reporter
  - Render a Report to a table, JSON and Markdown, including impact ratio and the flaky list.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7. CLI and gate
  - [ ] 7.1 Wire `impact`, `flake`, `report`, `gate`, `init` with `util.parseArgs`.
    - _Requirements: 6.1, 6.4_
  - [ ] 7.2 Gate exit codes, never masking a consistent failure.
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 8. GitHub Action
  - Composite `action.yml` that runs the CLI and upserts one PR comment through the job token.
  - _Requirements: 5.4_

- [ ] 9. Dogfood and green gate
  - Tag every test `@covers <req>.<n>`, emit JUnit and coverage, run testrazor on itself, commit its own quarantine file, keep vitest and tsc green.
  - _Requirements: 2.1, 4.5_

- [ ] 10. Example, README and packaging
  - Ship a `fixtures/sample-repo` with a flaky test and a small module graph for a 60-second judge run, write the README with every required section, build to `dist/`.
  - _Requirements: 6.1, 6.4, 7.1, 7.2_
