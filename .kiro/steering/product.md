---
inclusion: always
---

# Product

testrazor makes CI fast and trustworthy from artifacts a test suite already
produces. Two jobs:

- **Impact.** Run only the tests a change touches, using a coverage map and a
  git diff. Feedback in seconds, not minutes.
- **Flake.** Detect flaky tests from run history and quarantine them, so a green
  build reflects real health and a real failure is never hidden.

## Who it is for

Any team whose CI is slow, flaky or both. It is a single binary and a GitHub
Action. No dashboard to host, no account, no key.

## Principles

- **Deterministic.** Same inputs, same output. Nothing to mock, nothing to key.
- **Offline.** No network, ever. This is a hard requirement, not a preference.
- **Honest scope.** Support the formats we actually parse (JUnit, lcov,
  Cobertura) and say so. Never claim a language we have not tested.
- **A real failure is sacred.** Quarantine only tests proven flaky by mixed
  pass and fail history. A test that only fails is a bug and the gate must show
  it.
