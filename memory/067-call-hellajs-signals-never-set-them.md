---
title: Call HellaJS signals, never .set() them
description: "HellaJS signals are callable accessor-functions: read with sig(), write with sig(next) — a .set() call throws TypeError."
tags: [core, signals, tests, api-shape, flush]
confirmed: 2026-10-30
---
# Why

`signal(x)` returns a callable accessor-function, not an object with a setter method: read it as `sig()`, write it as `sig(next)`. There is no `.set()` — calling one throws `TypeError: value.set is not a function` at the write site. Effect flushes stay explicit and bare: `flush()` (synchronous, never awaited) after a write when an effect must re-run before the next assertion.

# Evidence

`packages/headless/tests/input-otp.test.ts` (2026-10-30): `value.set("7777")` failed the scoped run with `TypeError: value.set is not a function`; `value("7777")` followed by bare `flush()` passed (7/7). The same callable-write form appears in `packages/ui/tests/input-otp.test.ts` (`external("998877")`) and `packages/headless/tests/tabs.test.ts` (`value(next)` inside `onValueChange`).
