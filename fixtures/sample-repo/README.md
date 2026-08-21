# sample-repo

A tiny project for trying testrazor in 60 seconds. No install, no keys.

Import graph: `cart.ts` -> `discount.ts` -> `price.ts`, each with a test.
`runs/run1.xml` and `runs/run2.xml` are two recorded runs where `cart :: sums a
cart` passes once and fails once, so it is flaky.

From the testrazor repo root:

```bash
# 1. Impact: which tests does a change to discount.ts touch?
node dist/cli.js impact --root fixtures/sample-repo --changed src/discount.ts
#   selects discount.test.ts and cart.test.ts, skips price.test.ts

# 2. Flake: find the flaky test across the two recorded runs
node dist/cli.js flake \
  --report fixtures/sample-repo/runs/run1.xml \
  --report fixtures/sample-repo/runs/run2.xml \
  --quarantine /tmp/sample-quarantine.json
#   flags "cart :: sums a cart" as flaky and quarantines it

# 3. Gate: the flaky failure does not block, a real one would
node dist/cli.js gate \
  --report fixtures/sample-repo/runs/run2.xml \
  --quarantine /tmp/sample-quarantine.json
#   PASS (exit 0): the only failure is the quarantined flaky test
```
