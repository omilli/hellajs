# [ ] Plan set: Fix polling-flaky `resource > polling` test

Set scope: eliminate the intermittent `NetworkError: ECONNREFUSED` failure in `resource > polling > stops polling on reset` when run in the full suite.

- **[unit-a-test-hygiene.md](unit-a-test-hygiene.md)** — Test-hygiene fixes: `resetResource()` in `beforeEach`, try/finally around each test body. Alone, reduces flake rate but doesn't fix the root cause (leaked timer from another test file). No deps. Can land first.
- **[unit-b-global-tracking.md](unit-b-global-tracking.md)** — Package-level fix: add a `Set<{ dispose }>` for active resources so `resetResource()` can stop all active timers. Solves the root cause. No deps on unit-a (independent).
