# [ ] dom-reset-mount-handle

## Contract

### Surface change
yes — renames `resetDomState`→`resetDom` (re-exported from `lib/index.ts`), changes `mount()`'s return type to `MountHandle`, exposes the `MountHandle` interface, and removes eight re-exports from `lib/index.ts` (`flushMount`, `queueCleanup`, `getState`, `hasState`, `peekState`, `deleteState`, `multiSelectors`, `checkMultiSelectors`). Per `code.md` §`index.ts` Rules and §Package File Structure, a renamed/removed re-export and a changed public signature are surface changes.

### Package
dom

### Guide governance
- Files ← `code.md` §Package File Structure, §`index.ts` Rules, §Files, §Naming Conventions › Functions (`reset<Package>` verb-first), §Types, §JSDoc
- Public API delta ← `code.md` §`index.ts` Rules, §Naming Conventions › Functions, §Types
- Behavioral scenarios ← `tests.md` §Files, §File-naming for tests, §Test Structure, §Scenario → test() derivation, §Shared State and Cleanup › `beforeEach` with `resetTestState()`
- Doc placement ← `docs.md` §File Locations & Naming, §Template Selection, §Function & Prefix Docs

### Files
- `packages/dom/lib/internal/testing.ts` — modify — rename `resetDomState`→`resetDom`; call the new `resetErrorState()` so it is a true factory-reset (alongside the existing `resetQueueState`/`resetEventState`/`resetSelectorState`/`handlerCounts.clear()`)
- `packages/dom/lib/internal/error.ts` — modify — add `@internal resetErrorState()` that clears its `handlers` Set (the source of `onError` registrations)
- `packages/dom/lib/mount.ts` — modify — `mount()` returns a `MountHandle { container; flush(); unmount() }`; sync path builds and returns the handle after `attach()`; async path (Promise-returning node) returns the handle immediately and defers `flush`/`unmount` until attached; `unmount()` before attach sets a `cancelled` flag the `.then` continuation checks and bails (mirrors the `Lazy` guard pattern in `lib/Lazy.ts`); `flush()` runs the existing `processMountQueue` + `processCleanupQueue` logic for this mount's container, consolidating what `flushMount` and `queueCleanup` did separately
- `packages/dom/lib/types/nodes.d.ts` — modify — expose the `MountHandle` interface
- `packages/dom/lib/index.ts` — modify — rename the `resetDomState` re-export to `resetDom`; remove the eight re-exports (`flushMount`, `queueCleanup`, `getState`, `hasState`, `peekState`, `deleteState`, `multiSelectors`, `checkMultiSelectors`) — the symbols stay defined in their `internal/` modules and tests reach them by source-relative import
- `packages/dom/tests/reset-dom.test.ts` — create — new test file (surface-named) for `resetDom` + the `MountHandle` flush/unmount/cancel scenarios
- `packages/dom/tests/*.test.ts` — modify — migrate every reference to the eight removed exports (`flushMount`/`queueCleanup` → handle methods; `peekState`/`getState`/`hasState`/`deleteState`/`multiSelectors`/`checkMultiSelectors` → source-relative imports from `lib/internal/*`)
- `packages/dom/docs/api/mount.mdx` — modify — document the `MountHandle` return type + a `###` Key Concepts entry on the handle lifecycle
- `packages/dom/docs/index.mdx` — modify — API list: rename `resetDomState`→`resetDom`, drop the eight removed entries

### Public API delta
```ts
// packages/dom/lib/types/nodes.d.ts — addition
interface MountHandle {
  container: Element;
  flush(): void;
  unmount(): void;
}

// packages/dom/lib/mount.ts — return-type change
function mount(node, target = "#app"): MountHandle;

// packages/dom/lib/internal/testing.ts — rename + completed nuke
function resetDom(): void;  // was resetDomState; now also clears the error-handler registry

// packages/dom/lib/index.ts — removed re-exports (eight)
// flushMount, queueCleanup           → logic now on MountHandle
// getState, hasState, peekState, deleteState, multiSelectors, checkMultiSelectors
//                                    → internal inspection; remain defined in lib/internal/*
```

```ts
import { mount, resetDom } from "@hellajs/dom";

const app = mount(() => <App/>, "#app");
app.container;   // resolved Element
app.flush();     // drain mount + cleanup queues for this mount (replaces flushMount)
app.unmount();   // subtree teardown + remove the mounted node (replaces queueCleanup + el.remove)
resetDom();      // factory-reset all dom shared state incl. error handlers
```

### Behavioral scenarios
- `resetDom()` clears all dom shared state including the error-handler registry (factory-reset)
- `mount()` returns a `MountHandle` exposing `.container` (resolved Element), `.flush()`, `.unmount()`
- `app.flush()` drains the mount + cleanup queues for this mount's container (replaces `flushMount` + `queueCleanup`)
- `app.unmount()` tears down the subtree (`cleanupSubtree`) and removes the mounted node
- async `mount()` (Promise-returning node) returns a handle immediately; `flush`/`unmount` defer until attached
- `app.unmount()` before async attach sets a `cancelled` flag and the `.then` continuation bails (no mount)

### Doc placement
- `packages/dom/docs/api/mount.mdx` — Function template (modify) — document the `MountHandle` return type; add `### Mount Lifecycle Handle` under Key Concepts covering `flush`/`unmount` + the async-defer/cancel behavior
- `packages/dom/docs/index.mdx` — Index — API bullet list — rename `resetDomState`→`resetDom`, drop the eight removed entries

### Tests view
New `packages/dom/tests/reset-dom.test.ts` (surface-named per `tests.md` §File-naming — matches `resetDom`), one `test()` per the six Behavioral scenarios, plus migrating every existing test that references the eight removed barrel exports (`flushMount`/`queueCleanup`/`peekState`/`getState`/`multiSelectors`/`checkMultiSelectors`/…) to handle methods (`app.flush()`/`app.unmount()`) or source-relative imports for the introspection helpers, per `tests.md` §Files and §Shared State and Cleanup (`beforeEach` with `resetTestState()` + `resetDom()`). Import from `@hellajs/dom/bundle`; `mount`/`resetDom` from the bundle, injected helpers (`tick`/`delay`/`wait`/`setupContainer`/`resetTestState`/`onError`) from `globalThis`. The Code task's `bun check dom` is unblocked only once this migration lands (`mount`'s new return + the barrel trim break existing tests until then).

### Docs view
Modify `packages/dom/docs/api/mount.mdx` (document `MountHandle` return + Key Concepts section) and `packages/dom/docs/index.mdx` API list (rename + drop the eight entries), per Doc placement above, per `docs.md` §Function & Prefix Docs and §File Locations & Naming. The standalone `resetdom.mdx` reference page is owned by `meta/docs/api-reference-pages.md` per the coordination spec (not duplicated here); the `AGENTS.md`/`CLAUDE.md` sync for the removed exports is owned by `meta/docs/agents-md-sync.md`.

---

## [ ] Implement resetDom + MountHandle (Code)
**Type:** Code
**Depends on:** None

### Strategy
Three coupled changes. (1) Rename `resetDomState`→`resetDom` in `lib/internal/testing.ts` and complete the nuke: add `@internal resetErrorState()` to `lib/internal/error.ts` that clears its `handlers` Set (the source of `onError` registrations), and call it from `resetDom` alongside the existing `resetQueueState`/`resetEventState`/`resetSelectorState`/`handlerCounts.clear()` — a separate `onError(null)` becomes redundant once `resetDom` covers it. (2) `mount()` (`lib/mount.ts`) returns a `MountHandle`: sync path builds and returns the handle after `attach()`; async path returns the handle immediately with an `attached` flag, and a `cancelled` flag set by `unmount()`-before-attach that the `.then` continuation checks and bails (mirrors the `Lazy` guard in `lib/Lazy.ts`); `flush()` runs the existing `processMountQueue` + `processCleanupQueue` for this mount's container, consolidating what `flushMount` and `queueCleanup` did separately. (3) Trim the barrel: remove the eight re-exports — the symbols stay defined in their `internal/` modules and tests reach them by source-relative import. `MountHandle` exposed from `lib/types/nodes.d.ts`. Trade-off considered and rejected: keeping deprecated re-exports of `flushMount`/`queueCleanup` — would violate `code.md` §`index.ts` Rules (single source of truth) and the handle already carries their logic.

### Definition of Done
- [ ] `bun check dom` exits 0 (satisfied when the Tests task migrates the broken call sites; `mount`'s new return + the barrel trim break existing tests until then)
- [ ] `bun lint` exits 0
- [ ] Every file in Contract.Files touched as specified
- [ ] Public API delta in Contract implemented verbatim — `mount()` returns `MountHandle`; `resetDom` renamed; the eight re-exports gone from `lib/index.ts` (verified by reading the barrel)
- [ ] Every new/changed exported symbol has JSDoc (`@internal` on `resetErrorState` since it is not re-exported; `resetDom`, `MountHandle`, and `mount`'s new return documented as public)
- [ ] No new runtime dependency
- [ ] A changeset exists at `.changeset/*.md` declaring `major` for `@hellajs/dom` (renamed export + changed `mount` return type + eight removed exports — breaking)
- [ ] Contract Tests-view and Docs-view hold — sibling Tests + Docs tasks exist (below)
- [ ] Audit skill run on `mount.ts`, `internal/testing.ts`, `internal/error.ts`, `index.ts`, `types/nodes.d.ts` reports no deviations from `./guides/code.md`

## [ ] Migrate dom tests + add reset/handle scenarios (Tests)
**Type:** Tests
**Depends on:** Implement resetDom + MountHandle

### Strategy
Two concerns. (1) Migrate every existing test referencing the eight removed barrel exports: `flushMount(container)` → the handle's `app.flush()` (tests capture the `mount()` return); `queueCleanup(el)` → `app.unmount()` or a source-relative import of the cleanup helper where the test bypasses the observer on a detached node; `peekState`/`getState`/`multiSelectors`/`checkMultiSelectors` → source-relative imports from `lib/internal/*` (the barrel no longer carries them). This un-breaks `bun check dom`. (2) New `reset-dom.test.ts`, one `test()` per Behavioral scenario: `resetDom()` clears error handlers (register an `onError` handler, call `resetDom()`, assert it's gone); the sync `MountHandle` fields/methods; `flush()` drains queues; `unmount()` tears down the subtree; the async-defer handle; and the cancel-before-attach `cancelled` flag. `beforeEach` runs `resetTestState()` + `resetDom()`. Import from `@hellajs/dom/bundle`; use `mock()` for call counts, never boolean flags.

### Definition of Done
- [ ] `bun check dom` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (`mount.ts`, `internal/testing.ts`, `internal/error.ts`)
- [ ] One `test()` exists per scenario in Contract.Behavioral scenarios (six) in `reset-dom.test.ts`
- [ ] No bare reference to the eight removed exports remains in `packages/dom/tests/**` (migrated to handle methods or source-relative imports)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, the double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every test asserts a behavior the source actually exposes — cross-checked against the implementation

## [ ] Update mount docs + API list (Docs)
**Type:** Docs
**Depends on:** Implement resetDom + MountHandle

### Strategy
Update `docs/api/mount.mdx`: document the `MountHandle` return type in `## API` (show the interface), refresh `## Basic Usage` with the handle example from Contract.Public API delta (`app.flush()`/`app.unmount()`), and add a `### Mount Lifecycle Handle` under Key Concepts covering flush/unmount plus the async-defer and cancel-before-attach behavior. Update `docs/index.mdx` API list: rename `resetDomState`→`resetDom` and drop the eight removed entries. Per `docs.md` §Function & Prefix Docs. The standalone `resetdom.mdx` reference page is owned by `meta/docs/api-reference-pages.md` (coordination spec) — not created here.

### Definition of Done
- [ ] Every code example in the changed `.mdx` files compiles against the current source signatures
- [ ] The Function Doc template from `./guides/docs.md` is preserved on `mount.mdx`
- [ ] Every section in Contract.Doc placement exists with the specified content
- [ ] Public API delta signatures appear verbatim in `mount.mdx`; the usage example from Contract appears under `## Basic Usage`
- [ ] Package docs (`packages/dom/docs/**/*.mdx`) have no frontmatter
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] `packages/dom/docs/index.mdx` API list reflects `resetDom` (not `resetDomState`) and contains none of the eight removed entries
