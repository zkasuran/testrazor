# Requirements Document

## Introduction

testrazor is a zero-key, language-agnostic command line tool and GitHub Action
that makes continuous integration both fast and trustworthy. It does two things
from artifacts a test suite already produces. It selects only the tests a change
actually touches, so feedback comes back in seconds instead of minutes. It
detects flaky tests from run history and quarantines them, so a green build
reflects real health rather than luck.

Everything runs offline from JUnit XML, a source import graph and a git diff.
There is no account, no API key and no network call.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to run only the tests affected by my
change, so that CI gives feedback in seconds instead of minutes.

#### Acceptance Criteria

1. WHEN given a base ref and a head ref THEN testrazor SHALL compute the set of changed files from the git diff.
2. WHEN given a project root THEN testrazor SHALL build a dependency graph of which test files import each source file, directly or transitively, by resolving relative import and require specifiers.
3. WHEN the changed files and the dependency graph are both known THEN testrazor SHALL select the test files that transitively import a changed source file, plus any changed test file itself.
4. IF a changed file is not a resolvable source file (for example a config file or a non-JavaScript file) THEN testrazor SHALL select all tests as a fail-safe and SHALL report that it did so and why.
5. WHEN a changed source file is imported by no test THEN testrazor SHALL report it as an uncovered change rather than hiding it.
6. WHEN impact selection completes THEN testrazor SHALL print the selected test files in a form a test runner can consume.

### Requirement 2

**User Story:** As a developer, I want flaky tests identified from run history,
so that a nondeterministic failure does not block a correct change.

#### Acceptance Criteria

1. WHEN given two or more JUnit result files THEN testrazor SHALL compute a per-test record of passes and failures.
2. WHEN a test both passes and fails across the provided runs THEN testrazor SHALL classify it as flaky.
3. WHEN a test fails in every run THEN testrazor SHALL classify it as a consistent failure and SHALL NOT mark it flaky.
4. WHEN classifying a test THEN testrazor SHALL compute a flake score from 0 to 1 derived from its pass and fail counts.

### Requirement 3

**User Story:** As a maintainer, I want flaky tests quarantined, so that a green
build reflects real health.

#### Acceptance Criteria

1. WHEN a test is classified as flaky THEN testrazor SHALL add it to a quarantine list with its flake score and the runs it was seen in.
2. WHEN the gate is evaluated THEN testrazor SHALL exclude quarantined tests from the pass or fail decision.
3. IF a quarantined test passes consistently across the configured window THEN testrazor SHALL recommend removing it from quarantine.
4. WHEN a quarantine list is written THEN testrazor SHALL persist it to a configured path in a stable diff-friendly format.

### Requirement 4

**User Story:** As a reviewer, I want a clear report of what ran and what is
flaky, so that I can trust the result at a glance.

#### Acceptance Criteria

1. WHEN a command completes THEN testrazor SHALL print a human-readable table to stdout.
2. WHEN the json flag is set THEN testrazor SHALL emit a machine-readable JSON report.
3. WHEN the markdown flag is set THEN testrazor SHALL emit a Markdown summary suitable for a pull request comment.
4. WHEN reporting impact THEN testrazor SHALL state the total test count, the selected count and the fraction of tests skipped.
5. WHEN reporting flakes THEN testrazor SHALL list each flaky test with its score and the runs observed.

### Requirement 5

**User Story:** As a team, I want one command that decides pass or fail for CI,
so that the gate is unambiguous.

#### Acceptance Criteria

1. WHEN the gate runs and a non-quarantined test is failing THEN testrazor SHALL exit with a non-zero status.
2. WHEN the gate runs and every non-quarantined test passes THEN testrazor SHALL exit zero.
3. WHEN a consistent failure exists THEN testrazor SHALL never hide it through quarantine.
4. WHEN running inside GitHub Actions THEN testrazor SHALL post or update a single pull request comment carrying the report.

### Requirement 6

**User Story:** As a user, I want testrazor to run with no account or key, so
that anyone can run it offline.

#### Acceptance Criteria

1. WHEN testrazor runs THEN it SHALL NOT require network access, an API key or an account.
2. WHEN a testrazor.config.json file exists THEN testrazor SHALL load report paths, the project root, the quarantine path and ignore globs from it.
3. WHEN a CLI flag conflicts with a config value THEN the CLI flag SHALL take precedence.
4. WHEN the init command runs THEN testrazor SHALL scaffold a config file and a runnable example.

### Requirement 7

**User Story:** As a user on any stack, I want honest, documented input support,
so that I know what works before I try it.

#### Acceptance Criteria

1. WHEN ingesting results THEN testrazor SHALL accept JUnit XML as produced by jest, vitest, pytest, mocha and go test through a converter, so flake detection works for any language that emits JUnit.
2. WHEN building the impact graph THEN testrazor SHALL resolve relative import, export and require specifiers in JavaScript and TypeScript sources and impact selection SHALL be documented as supported for those languages.
3. IF an unsupported result format is supplied THEN testrazor SHALL fail with a message naming the supported formats.
