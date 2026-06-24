# [ ] devtools

## Contract

### Surface change
yes — adds two new symbols (`devtools`, `action`) and two new types (`DevToolsConfig`, `DisconnectFunction`) re-exported by `packages/store/lib/index.ts`. Per `code.md` §`index.ts` Rules and §Package File Structure, a new re-export is a surface change.

### Package
store

### Guide governance
- Files ← `code.md` §Package File Structure, §`index.ts` Rules, §Files, §Naming Conventions › Functions (`devtools` / `action`) and › Types (`DevToolsConfig` / `DisconnectFunction`)
- Public API delta ← `code.md` §`index.ts` Rules, §Types, §JSDoc, §Decision Precedence
- Behavioral scenarios ← `tests.md` §Test Structure, §Scenario → test() derivation, §Patched browser globals, §Mock Patterns, §Shared State and Cleanup
- Doc placement ← `docs.md` §File Locations & Naming, §Function & Prefix Docs, §Concept Docs

### Files
- `packages/store/lib/devtools.ts` — create — exports `devtools<T>(store, config?)`, `action<T>(label, fn)`, types `DevToolsConfig` / `DisconnectFunction`; Redux DevTools bridge via `window.__REDUX_DEVTOOLS_EXTENSION__`; module-level LIFO label stack
- `packages/store/lib/index.ts` — modify — add `export { devtools, action } from "./devtools"` and type re-exports for `DevToolsConfig` / `DisconnectFunction`
- `packages/store/tests/devtools.test.ts` — create — seven scenarios (see Behavioral scenarios)
- `packages/store/docs/api/devtools.mdx` — create — Function template
- `packages/store/docs/index.mdx` — modify — API bullet list: add `devtools`
- `packages/store/docs/concepts/state.mdx` — modify — new "Debugging with Redux DevTools" subsection wiring `devtools()` + `action()`

### Public API delta
```ts
export function devtools<T>(store: Store<T>, config?: DevToolsConfig): DisconnectFunction;
export function action<T>(label: string, fn: () => T): T;
export type DevToolsConfig = { name?: string; maxAge?: number; trace?: boolean };
export type DisconnectFunction = () => void;
```

```ts
import { store, devtools, action } from "@hellajs/store";

const counter = store({ count: 0 });
const disconnect = devtools(counter, { name: "counter" });

action("increment", () => counter.count(counter.count() + 1));
// Redux DevTools panel logs "increment" with snapshot { count: 1 }

disconnect(); // stops sending, disposes the internal effect
```

### Behavioral scenarios
- connecting sends `@@INIT` to the panel with the store's initial snapshot
- a snapshot-only change propagates to the panel under the auto-generated label `"update"`
- `action(label, fn)` labels the snapshot change triggered inside `fn` with `label`
- nested `action()` calls restore the outer label after the inner returns (LIFO stack)
- `disconnect()` stops further sends and disposes the internal effect
- connecting when the extension is absent returns a no-op disconnect without throwing
- `action()` without `devtools()` connected runs `fn` and returns its value unchanged

### Doc placement
- `packages/store/docs/api/devtools.mdx` — Function template — title + `## API` + `## Basic Usage` — new page
- `packages/store/docs/index.mdx` — Index — API bullet list — add `devtools` entry
- `packages/store/docs/concepts/state.mdx` — Concept — new "Debugging with Redux DevTools" subsection

### Tests view
New `tests/devtools.test.ts`, one `test()` per scenario in Behavioral scenarios (seven total). Mock `window.__REDUX_DEVTOOLS_EXTENSION__` via `beforeEach` save / `afterEach` restore (tests.md §Patched browser globals); record `connect`/`send`/`disconnect` through a fake extension backed by `mock()` (tests.md §Mock Patterns — no boolean-flag or pure-integer counters).

### Docs view
New `docs/api/devtools.mdx` (Function template) + `docs/index.mdx` API list entry + `docs/concepts/state.mdx` subsection, per Doc placement. The standalone `api/devtools.mdx` new-export page is registered in `meta/docs/api-reference-pages.md` (registry owned by that meta plan); this Docs task writes the page content. `AGENTS.md` / `CLAUDE.md` sync owned by `meta/docs/agents-md-sync.md`.

---

## [ ] Implement devtools bridge and action label helper (Code)
**Type:** Code
**Depends on:** None

### Strategy
`devtools()` opts into the Redux DevTools extension via the global `window.__REDUX_DEVTOOLS_EXTENSION__` hook; when absent it returns a no-op disconnect (opt-in bridge — no allocation on the hot path when DevTools is missing). On connect: `extension.connect({ name })`, send `@@INIT` with `store.snapshot()`, then subscribe via `effect(() => { devtools.send(peekLabel() ?? "update", store.snapshot()) })` — the effect reads the snapshot computed (`lib/create.ts:38-59`) and therefore subscribes to every leaf signal through the same mechanism the store already uses. The label stack is a module-level `string[]`; `action(label, fn)` pushes, runs `fn`, pops in a `finally` so exceptions do not leak the stack; `peekLabel()` returns the top (or `undefined` when empty). `disconnect()` calls `devtools.disconnect()` and disposes the effect. Use `unknown` casts + an ambient `ReduxDevToolsExtension` interface (`declare global` in `devtools.ts`) rather than `any` (code.md §Types). `effect` comes from the existing `@hellajs/core` peer (re-exported through `lib/internal/core.ts`) — no new dep, no new `subscribe()` API. Trade-off considered and rejected: a separate `subscribe()` on the store — redundant since `effect()` over `snapshot()` already tracks every leaf.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun lint` exits 0
- [ ] Every file in Contract.Files touched/created as specified
- [ ] Public API delta in Contract implemented verbatim — `lib/index.ts` re-exports `devtools`, `action`, `DevToolsConfig`, `DisconnectFunction`
- [ ] Every new exported symbol has JSDoc (all are re-exported by `index.ts`, so no `@internal`)
- [ ] No new runtime dependency (Redux DevTools extension is browser-loaded, not bundled; `effect` from the core peer)
- [ ] A changeset exists at `.changeset/*.md` declaring `minor` for `@hellajs/store` (purely additive)
- [ ] Contract Tests-view and Docs-view hold — sibling Tests + Docs tasks exist (below)
- [ ] Audit skill run on `lib/devtools.ts` + `lib/index.ts` reports no deviations from `./guides/code.md`

## [ ] Test devtools bridge and action label helper (Tests)
**Type:** Tests
**Depends on:** Implement devtools bridge and action label helper

### Strategy
One `test()` per Behavioral scenario (seven). Build a fake extension that records `connect`/`send`/`disconnect` into a `mock()`-tracked list; install it on `window.__REDUX_DEVTOOLS_EXTENSION__` under `beforeEach` save / `afterEach` restore (tests.md §Patched browser globals). The absent-extension scenario deletes the global for that one test only. Assert send labels and counts via the mock trackers (tests.md §Mock Patterns — `mock()` from `bun:test`, no boolean flags or integer counters). Cross-check each assertion against `lib/devtools.ts`.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun coverage` shows 100% coverage on `lib/devtools.ts` (name the file + line range in the commit message)
- [ ] One `test()` exists per scenario in Contract.Behavioral scenarios (seven)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, the double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every test asserts a behavior the source actually exposes — cross-checked against `lib/devtools.ts`

## [ ] Document devtools bridge and action label helper (Docs)
**Type:** Docs
**Depends on:** Implement devtools bridge and action label helper

### Strategy
Write `docs/api/devtools.mdx` from the Function template (docs.md §Function & Prefix Docs) — title, `## API` (signatures verbatim from Contract.Public API delta), `## Basic Usage` (the Contract example). Add `devtools` to the `docs/index.mdx` API bullet list (currently only `store`). Add a "Debugging with Redux DevTools" subsection to `docs/concepts/state.mdx` showing `devtools()` + `action()` wiring. The standalone new-export page is registered in `meta/docs/api-reference-pages.md`; this task writes the page itself.

### Definition of Done
- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The Function template from `./guides/docs.md` is used on `devtools.mdx`
- [ ] Package docs (`packages/store/docs/**/*.mdx`) have no frontmatter
- [ ] Every section in Contract.Doc placement exists with the specified content
- [ ] Public API delta signatures appear verbatim in `devtools.mdx`; the Contract usage example appears under `## Basic Usage`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against `lib/devtools.ts` and tests
- [ ] `packages/store/docs/index.mdx` API list includes `devtools`
