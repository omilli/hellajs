---
title: "Assert times with UTC getters: bun test normalized TZ to UTC, vitest inherits the system zone"
description: "Time-of-day assertions on parsed or constructed dates must use getUTC*/setUTC* — bun test masked the system timezone, vitest/node forks expose it."
tags: [testing, timezone, vitest, dates]
confirmed: 2026-10-15
---
# Why

`bun test` ran test processes with UTC-normalized local time, so tests asserting `new Date("...Z").getHours() === 12` passed on any host. Under the vitest (node forks) runner those same assertions read the host zone — on a UTC+7 host `getHours()` returns 19 and the test reds. The bug is the assertion, not the runner: local getters on UTC-parsed dates are host-dependent. Always assert with `getUTCHours()`/`getUTCMonth()`/etc. and mutate with `setUTCHours(...)` (or construct with the local `new Date(y, m, d, h)` form consistently on both sides, which round-trips any zone).

# Evidence

Empirical, same host (Asia/Bangkok, 2026-10-15): `bun test packages/store/tests/draft.test.ts` passed (16/16) while plain `node -e` and `bun -e` both printed `19` for `new Date('2024-01-15T12:00:00Z').getHours()`; `Intl.DateTimeFormat().resolvedOptions().timeZone` = Asia/Bangkok. The vitest run of the same test failed with `expected 19 to be 12`. Fix: packages/store/tests/draft.test.ts switched to `setUTCHours`/`getUTCHours` — green under both runners.
