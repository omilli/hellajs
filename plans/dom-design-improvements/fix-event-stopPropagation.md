## [ ] Respect event.stopPropagation() in delegated handlers

### Depends On
None

### Objective
At `lib/internal/events.ts:38-62`, the delegated event handler traverses the entire `composedPath()` regardless of whether `event.stopPropagation()` was called by an earlier handler. This breaks the standard DOM expectation that `stopPropagation()` prevents ancestors from receiving the event.

### Tasks

#### [ ] Add stopPropagation check during composedPath traversal

#### Solution
After each handler invocation, check `event.cancelBubble` (the legacy but universally-supported flag that `stopPropagation()` sets to `true`). If propagation is cancelled, break the loop.

```ts
while (i < len) {
  const element = path[i++] as Element;
  if (!hasState(element)) continue;
  const handler = getState(element).handlers[type];
  if (handler) {
    try {
      handler.call(element, event);
      if (event.cancelBubble) break; // stopPropagation was called
    } catch (e) { ... }
  }
}
```

This does not change the capture-phase nature of the delegation — handlers still fire in capture order (root → target). But once a handler calls `stopPropagation()`, upstream (closer-to-root) handlers on the path are skipped.

The `event.cancelBubble` check works because:
- `stopPropagation()` sets `cancelBubble = true` in addition to the `propagationStopped` flag
- It works across all browsers
- It's set synchronously when `stopPropagation()` is called

If avoiding any behavioral change for existing users, gate this behind an opt-in config or flag. However, respecting `stopPropagation()` is the expected DOM behavior, so this is a bug fix.

Since the user said "default safe" (add new APIs alongside old, deprecate old), add a global option:

```ts
// In events.ts or a config module
let respectStopPropagation = false;
export function setRespectStopPropagation(val: boolean) {
  respectStopPropagation = val;
}
```

Default: `false` (current behavior). Users opt-in. Future major version: default to `true`.

##### Tests
- Add test: delegated handler calls `stopPropagation()` — verify subsequent handlers don't fire (opt-in mode)
- Add test: delegated handler without `stopPropagation()` — verify all handlers fire (both modes)
- Add test: `setRespectStopPropagation(false)` — verify old behavior preserved
- Add test: existing event tests pass unchanged

##### Documentation
- AGENTS.md: add `setRespectStopPropagation()` to API docs, note default behavior

##### Validation
- `bun check dom` passes
- Opt-in mode respects stopPropagation
- Default mode retains current behavior

### Tests
Extend `tests/events.test.ts` with stopPropagation test cases.

### Documentation
AGENTS.md: update "event-delegation" algorithm — add stopPropagation behavior note. Update "non-obvious-behaviors" section.

### Validation
Both modes work correctly. Default behavior unchanged.
