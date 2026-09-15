---
type: decision
title: Mutually-referencing timer/listener closures under prefer-const resolve as a .finally settle-hook, not a forward `let`
description: Mutually-referencing timer/listener closures flag prefer-const in every ordering — hoist `let onAbort!` and remove via `.finally` on the awaited promise, mirroring raceAbort.
tags: [arch, code]
timestamp: 2026-09-15
last_confirmed: 2026-09-15
triggers: [prefer-const, setTimeout, addEventListener, raceAbort, retry-delay]
---
# Why

The cycle {timer-callback reads listener, listener reads timer id} forces one closure to lexically precede the other's assignment; eslint `prefer-const` (repo: error) flags a single-assignment `let` whose reads precede the assignment **even with a definite-assignment `!`**. Every in-executor ordering was probed and flagged; the passing shape assigns inside the executor with all other reads lexically after (persistStore `resolveReady`, abort.ts `raceAbort`) — and when removal-on-settle is also needed, hoist the listener and attach `.finally(() => signal.removeEventListener("abort", onAbort))` to the awaited promise. This keeps `clearTimeout`-on-abort and adds removal-on-timer-resolve at the cost of one microtask hop. Editing the comment to admit listener accumulation instead of fixing the shape is the rejected alternative (audit finding origin).

# Evidence

`packages/resource/lib/internal/retry.ts` `fetchWithRetry` delay executor (2026-09-15): two lint failures (`'timeoutId' is never reassigned` / `'onAbort' is never reassigned` at 72:15) before the settle-hook shape; `bun coverage resource` exit 0 after. Same session, `packages/resource/lib/internal/abort.ts` `raceAbort` rewritten to the identical settle-hook for the listener-accumulation fix.
