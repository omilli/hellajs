## [ ] Add resetDom nuke and mount lifecycle handle
**Type:** Code

### Depends On
- None

### Objective
`@hellajs/dom` exports one true factory-reset (`resetDom`, absorbing error-handler clearing) and `mount()` returns a lifecycle handle whose `flush`/`unmount` methods dissolve the free-floating `flushMount`/`queueCleanup` helpers; the six internal-state inspection exports leave the public barrel.

### Solution
Three coupled changes in `packages/dom/`:

**Rename `resetDomState` → `resetDom` and complete the nuke.** Rename the function in `lib/internal/testing.ts`. Make it a true factory-reset by also clearing the error-handler registry: add an `@internal resetErrorState()` to `lib/internal/error.ts` that clears its `handlers` Set (the source of `onError` registrations) and call it from `resetDom` alongside the existing `resetQueueState`/`resetEventState`/`resetSelectorState`/`handlerCounts.clear()`. A separate `onError(null)` call becomes redundant once `resetDom` covers it.

**`mount()` returns a `MountHandle`.** Change `mount()` (`lib/mount.ts`) to return a handle:

```ts
const app = mount(node, "#app");
app.container;   // resolved Element
app.flush();     // drain mount + cleanup queues for this mount (replaces flushMount)
app.unmount();   // cleanup subtree + remove mounted node (replaces queueCleanup + el.remove)
```

- Sync path: build and return the handle after `attach()`.
- Async path (Promise-returning node): return the handle immediately; `flush`/`unmount` defer until attached. Add an `attached` flag; `unmount()` before attach sets a `cancelled` flag that the `.then` continuation checks and bails (mirrors `Lazy`'s guard pattern in `lib/Lazy.ts`).
- `flush()` runs the existing `processMountQueue` + `processCleanupQueue` logic for this mount's container, consolidating what `flushMount` and `queueCleanup` did separately.
- Expose the `MountHandle` interface from `lib/types/nodes.d.ts`.

**Trim the barrel.** Remove eight re-exports from `lib/index.ts`: `flushMount`, `queueCleanup` (logic now on the handle), `getState`, `hasState`, `peekState`, `deleteState`, `multiSelectors`, `checkMultiSelectors` (internal inspection — leave defined in their `internal/` modules; this repo's tests reach them by source-relative import per the test-harness task). Keep `resetDom` (renamed). The existing `@internal` JSDoc on those eight becomes accurate (no longer re-exported).

Breaking change (`mount` return type + eight removed exports) → major changeset for `@hellajs/dom`.

```ts
import { mount, resetDom } from "@hellajs/dom";
const app = mount(() => <App/>, "#app");
app.flush();        // afterMount fired synchronously
app.unmount();      // subtree torn down
resetDom();         // factory-reset all dom shared state incl. error handlers
```

### Definition of Done
- [ ] `bun check dom` exits 0 (satisfied when the test-harness task lands; `mount`'s new return + the barrel trim will break existing tests until then)
- [ ] `bun lint` exits 0
- [ ] Solution includes a runnable code example for `resetDom` and the `mount` handle (above)
- [ ] `resetDom`, the `MountHandle` interface, and `mount`'s new return have JSDoc; the `@internal resetErrorState` helper has JSDoc
- [ ] `lib/index.ts` no longer re-exports `flushMount`, `queueCleanup`, `getState`, `hasState`, `peekState`, `deleteState`, `multiSelectors`, or `checkMultiSelectors` (verified by reading the barrel)
- [ ] A changeset exists at `.changeset/*.md` declaring `major` for `@hellajs/dom`
- [ ] Audit skill run on `mount.ts`, `internal/testing.ts`, `internal/error.ts`, `index.ts`, `types/nodes.d.ts` reports no deviations from `./guides/code.md`
