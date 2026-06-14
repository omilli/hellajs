## [ ] Fix observer registration timing in mount()

### Depends On
None

### Objective
At `lib/mount.ts:22-23`, `registerContainer(container)` is called AFTER `container.replaceChildren(mountedNode)`. If any nodes are created synchronously during `mountNode`/`resolveNode` that trigger reactivity or lifecycle hooks producing new DOM nodes, those nodes are inserted before the container observer is active — they miss the MutationObserver safety net entirely.

### Tasks

#### [ ] Register container observer before inserting children

#### Solution
Swap the order: call `registerContainer(container)` before `container.replaceChildren(mountedNode)`. This ensures the MutationObserver is active before any nodes enter the DOM.

```ts
registerContainer(container);
container.replaceChildren(mountedNode);
```

Verify that `registerContainer` has no side effects that depend on the container having content (it shouldn't — it only sets up the observer).

##### Tests
- Add test: mount with synchronous reactive child creation — verify the observer detects added nodes
- Add test: mount then externally remove a node — verify cleanup is triggered (this relies on observer being active from the start)
- Add test: existing mount tests pass (no regression)

##### Documentation
- No docs changes needed (internal fix)
- CHANGELOG: patch entry

##### Validation
- `bun check dom` passes
- Manual review confirms observer is registered before DOM insertion

### Tests
Extend `tests/mount.test.ts` with observer-active-on-mount test.

### Documentation
None — this is an internal ordering fix. The AGENTS.md already correctly describes the observer behavior (it just wasn't active early enough).

### Validation
Observer is active from the first DOM insertion in `mount()`. Verified by test.
