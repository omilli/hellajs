## [ ] Fix delegated handlerCounts leak on permanent nodes

### Depends On
None

### Objective
At `lib/internal/cleanup.ts:58-69`, the `clean()` function decrements `handlerCounts` entries when an element with delegated handlers is cleaned up. However, if a handler is registered on a node that is never removed from the DOM (e.g., a root mount target), `clean()` is never called for that node, and the `handlerCounts` entry for that event type permanently remains at >= 1 — even if all handlers for that event type have been replaced with new handlers on different nodes.

This doesn't cause observable bugs (the count is only used for the fast-exit check at `events.ts:36`), but over time the count drifts upward meaninglessly.

### Tasks

#### [ ] Add safety cap or periodic reconciliation for handlerCounts

#### Solution
The handler count drift has no functional impact — the fast-exit check at `events.ts:36` (`if (!handlerCounts.has(type)) return`) still works correctly once the count is >= 1. The drift is harmless but technically untidy.

Two approaches:

1. **Boolean-based tracking**: Change `handlerCounts` from `Map<string, number>` to `Set<string>`. Since the count is only used as a has/not-has check (never read as a number), a Set is sufficient. The cleanup code at `clean.ts:63-68` would be simplified: never decrement, just add. This eliminates the leak entirely.

2. **Keep counter, ignore**: Document that the count can drift upward on permanent nodes and is harmless.

Approach 1 is cleaner. The handlerCount is never read as a number — it's only checked with `.has()`. A `Set<string>` with `add`/`delete` in the right places works identically and doesn't have the decrement issue.

However, check: is the count ever used as a number? In `events.ts:17`: `handlerCounts.set(type, (handlerCounts.get(type) || 0) + 1)` — this increments. And `clean.ts:63-68` decrements. Only `events.ts:36` uses `.has()`. So yes, a `Set` works.

Change:
- `counts.ts`: change `handlerCounts` to `Set<string>`, rename to `delegatedTypes` or keep the name
- `events.ts:17`: `handlerCounts.add(type)` instead of increment
- `clean.ts:63-68`: simplify — check if the cleaned node had handlers and consider deleting the type from the set only if no other node in the active DOM tree has a handler of that type (complex) or simply: never remove from the set (the global listener stays active regardless)

Actually, the cleanest fix: **never remove from the Set**. The global listener stays registered for the event type. If all nodes with that handler are removed, the global listener fires but the handler lookup finds nothing — negligible cost. This is how React's delegation works.

##### Tests
- Add test: register handler for event type X on permanent node → verify `handlerCounts.has('click')` is true after cleanup of unrelated nodes
- Add test: register and remove handler on a removable node → verify global listener for that type stays (no crash)
- Add test: existing event tests pass

##### Documentation
- AGENTS.md: update the `handlerCounts` data structure description


##### Validation
- `bun check dom` passes
- No regression in event handling tests
- `handlerCounts` is a Set with stable membership

### Tests
Extend `tests/events.test.ts` with handlerCount introspection tests.

### Documentation
AGENTS.md: update the "handler-counting" algorithm and "handlerCount" data structure.

### Validation
Set-based tracking works identically for the fast-exit check. No functional change.
