## [ ] Make element() slot capture reactive

### Depends On
None

### Objective
At `lib/element.ts:31-45`, child nodes (slots) are captured once before mount. Adding, removing, or reordering children after the custom element is mounted is not reflected. Named slots (`slot="name"`) are also static.

### Tasks

#### [ ] Add reactive slot observation to element()

#### Solution
Use a `MutationObserver` on the custom element to watch for child list changes and update the `props.children` and `props.slots` arrays reactively. When children change, bump the version signal to trigger reactive re-renders.

Implementation:

1. After the initial slot capture in `_mount()`, start observing `this` (the custom element) for `childList` mutations.
2. On mutation, re-capture children and slots, update the cached arrays, and bump the version signal.
3. The props proxy reads `children` and `slots` directly from the cached arrays (which are updated by the observer).
4. Wrap children/slots getters in a version signal dependency so reactive bindings update.

Since the observer runs synchronously during mutation, the version bump triggers a synchronous `flush()` which schedules effects. The `_bumpVersion` method already calls `flush()`.

Key consideration: the `children` and `slots` arrays in the props proxy are currently captured once and returned by reference. With reactive observation, keep the arrays updated by mutation observer and have the proxy return the live arrays.

Since we're following "default safe", this behavior is additive — slots that don't change continue to work exactly as before. Users who don't dynamically change slot content see no difference.

##### Tests
- Add test: element with static children — verify existing behavior preserved
- Add test: element with `appendChild` after mount — verify child appears in `props.children`
- Add test: element with `removeChild` after mount — verify child removed from `props.children`
- Add test: element with named slot added dynamically — verify `props.slots[name]` updated
- Add test: element with reactive template driven by children — verify re-renders on child change
- Add test: element cleanup → observer disconnected

##### Documentation
- AGENTS.md: update element() non-obvious behaviors — slot capture is now reactive
- AGENTS.md: add observer usage to element() architecture

##### Validation
- `bun check dom` passes
- Static slot behavior unchanged
- Dynamic slot changes propagate to reactive templates

### Tests
Extend `tests/element.test.ts` with dynamic slot test cases.

### Documentation
AGENTS.md: remove "slots captured once before mount" from non-obvious behaviors. Add observation mechanism to element() architecture.

### Validation
Dynamic children are reflected in element templates. No memory leaks from observer.
