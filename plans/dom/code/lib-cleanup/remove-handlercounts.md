# [ ] remove-handlercounts

## Contract

### Surface change
no — `handlerCounts` is an internal Set never imported outside `lib/internal/`; the public delegation contract (`on:` prefix attribute → capture-phase listener on `document.body`) is unchanged. The fast-exit check at the top of `delegatedHandler` reads from a different Set with identical contents.

### Package
dom

### Guide governance
- Files ← `code.md` §Package File Structure, §Files (delete a file), §Naming (no naming change)
- Doc updates ← `docs.md` §Internal References (AGENTS.md table + prose)
- Behavioral scenarios ← none (no behavior change; existing event-delegation tests cover)

### Root cause (evidence)
`handlerCounts` (`lib/internal/counts.ts`) and `globalListeners` (`lib/internal/events.ts:5`) are populated identically in `setNodeHandler` (`events.ts:17-22`):

```ts
!state.handlers[type] && handlerCounts.add(type);   // (A)
if (!globalListeners.has(type)) {                    // (B)
  globalListeners.add(type);
  document.body.addEventListener(type, delegatedHandler, true);
}
```

Whenever (B) is true (first registration of `type` globally), (A) is also true (no element can have the type yet). Both Sets only grow; both are cleared together in `resetEventState` / `resetDom`. After any sequence of calls their contents are identical. The fast-exit `if (!handlerCounts.has(type)) return;` at `events.ts:36` can read `globalListeners.has(type)` with identical runtime behavior. No test references `handlerCounts` (grep confirmed).

### Files
- `packages/dom/lib/internal/counts.ts` — **delete** entire file
- `packages/dom/lib/internal/events.ts` — modify `setNodeHandler` (drop the `(A)` line and the `handlerCounts` import), modify `delegatedHandler` (change `!handlerCounts.has(type)` → `!globalListeners.has(type)`)
- `packages/dom/lib/internal/reset.ts` — drop `import { handlerCounts }` and the `handlerCounts.clear();` line
- `packages/dom/AGENTS.md` — three edits (see Doc updates)
- `packages/dom/dom-comparison.md` — one edit (see Doc updates)

### Doc updates
- `AGENTS.md` §Event delegation — rewrite the "Two Sets track types" bullet to a single-Set form: *"One Set tracks types: `globalListeners: Set<string>` holds every type with a registered `document.body.addEventListener(type, delegatedHandler, true)` capture listener; it is also the fast-exit checked at the top of `delegatedHandler`. Never decremented — types stay registered until `resetEventState()`."*
- `AGENTS.md` §Reset (test) — drop `handlerCounts` from the list ("…observers, queues, the `staticDom` cache between tests").
- `AGENTS.md` §Performance — change the bullet `**handlerCounts fast-exit** + inline prefix matching…` to `**globalListeners fast-exit** + inline prefix matching…`.
- `dom-comparison.md:111` — change `handlerCounts Set short-circuits when no handlers exist for a type (events.ts).` to `globalListeners Set short-circuits when no handlers exist for a type (events.ts).`

### Tests view
No new tests. Existing `tests/delegated-events.test.ts` (capture-phase delegation, cleanup/removal) and `tests/direct-events.test.ts` cover the unchanged behavior. Per `tests.md` §Test Structure, no scenario is added or removed — this is a pure internal substitution of one Set for another with identical contents.

### Docs view
`docs/api/` does not reference `handlerCounts` (only `AGENTS.md` and `dom-comparison.md` do). Both updates listed above. `CLAUDE.md` is the generated mirror of `AGENTS.md` — do not edit; post-commit hook regenerates.

---

## [ ] Remove redundant handlerCounts (Code)
**Type:** Code
**Depends on:** None

### Strategy
Pure deletion + import-site rewrite. The redundancy is proven by reading `setNodeHandler` once: both Sets receive `add(type)` under conditions where one implies the other, and both are cleared together. No semantic is lost by reading `globalListeners` for the fast-exit — if no global listener was ever registered for `type`, no element can possibly have a handler for it either, so the walk over `event.composedPath()` would be a guaranteed no-op. Keep `globalListeners` (still needed by `resetEventState` to know which `removeEventListener` calls to issue); drop `handlerCounts`. Update `resetDom` and AGENTS.md/dom-comparison.md in the same pass — leaving a dangling doc reference is an unfinished edit per `brain-prime`.

### Definition of Done
- [ ] `bun coverage dom` exits 0 (bundle rebuilds `dist/` — coverage is measured there)
- [ ] `bun lint` exits 0
- [ ] `packages/dom/lib/internal/counts.ts` is deleted
- [ ] No `import.*handlerCounts` remains anywhere in `packages/dom/` (`rg handlerCounts packages/dom` returns nothing)
- [ ] `delegatedHandler` fast-exit reads `globalListeners.has(type)`
- [ ] `setNodeHandler` no longer calls `handlerCounts.add`
- [ ] `resetDom` no longer references `handlerCounts`
- [ ] `AGENTS.md` §Event delegation, §Reset, §Performance updated as specified in Doc updates
- [ ] `dom-comparison.md:111` updated as specified
- [ ] Manual read: confirm `globalListeners` still drives both the fast-exit and `resetEventState`'s `removeEventListener` loop
