## [ ] Make Portal target selector reactive

### Depends On
None

### Objective
At `lib/Portal.ts:32`, the portal target is resolved once via `document.querySelector(to)` inside an effect that runs only once. If the target element changes (selector changes, or target moves), the portal's content stays in the old location. The `to` prop should support reactive updates.

### Tasks

#### [ ] Support signal-driven target updates in Portal

#### Solution
Add support for the `to` prop to accept a signal (function) in addition to a static string. When a signal is used, the portal's effect re-runs on target changes — removes content from the old target and inserts into the new one.

Since we're following "default safe" (no breaking changes), the static string path continues to work unchanged. Add a reactive branch:

```ts
const effectiveTo = typeof to === 'function' ? to() : to;
```

When the target changes, the portal effect should:
1. Capture the existing `portalNodes` and clean them from the old target
2. Resolve the new target
3. Insert content into the new target

The existing cleanup via `portalCleanup` (`Portal.ts:48-56`) handles node removal — reuse that logic. The effect dependency is the effective target string.

Implementation strategy — the portal effect currently runs once (`if (portalNodes.length > 0) return;`). Replace this guard with a reactive target check:

```ts
registry.addEffect(anchor, () => {
  const resolvedTo = resolveValue(to) as string;
  // Clear old portal content if target changed
  if (portalNodes.length > 0) {
    // clean from old target
    ...
  }
  // Insert into new target
  ...
});
```

##### Tests
- Add test: Portal with static `to` string — verify existing behavior preserved
- Add test: Portal with signal `to` — verify target switching works
- Add test: Portal target switching — verify old content is removed from previous target
- Add test: Portal target switching — verify new content appears in new target
- Add test: Portal with signal `to` — verify cleanup on unmount removes content

##### Documentation
- AGENTS.md: update Portal architecture docs — `target-resolution` now supports signals
- CHANGELOG: minor entry (feature addition, backward compatible)

##### Validation
- `bun check dom` passes
- Static string targets work as before
- Signal targets switch and clean up correctly

### Tests
Extend `tests/portal.test.ts` with reactive target test cases.

### Documentation
AGENTS.md: update Portal internals and algorithm descriptions for reactive target support.

### Validation
Portal with static string works unchanged. Portal with signal toggles targets cleanly.
