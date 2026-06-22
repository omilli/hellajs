## [ ] Add Redux DevTools bridge and action() label helper

### Depends On
None

### Objective
A `devtools()` helper connects any HellaJS store to the Redux DevTools browser extension via the global `window.__REDUX_DEVTOOLS_EXTENSION__` hook, and an `action(label, fn)` helper labels sequences of mutations for the DevTools action log — closing the devtools gap every named competitor ships.

### Sub-tasks

#### [ ] devtools() and action() implementation (Code)
**Solution:**
New file `packages/store/lib/devtools.ts` exports `devtools`, `action`, and the `DevToolsConfig` type. Update `packages/store/lib/index.ts` barrel.

Public API:

- `devtools<T>(store: Store<T>, config?: DevToolsConfig): DisconnectFunction` — connects the store to Redux DevTools and returns a disconnect function.
- `DevToolsConfig`: `{ name?: string; maxAge?: number; trace?: boolean }` — forwarded to the Redux DevTools `connect` options.
- `action<T>(label: string, fn: () => T): T` — runs `fn()` with `label` pushed onto a module-level label stack, so the snapshot change triggered by `fn()` is sent to DevTools under that label. Stack is LIFO so nested actions compose. Outside any `action()` call, snapshot-only changes get an auto-generated label like `"update"`.
- `DisconnectFunction`: `() => void`.

Implementation notes:

- `devtools()` checks `typeof window !== "undefined" && (window as any).__REDUX_DEVTOOLS_EXTENSION__`. If absent, return a no-op disconnect. The bridge is opt-in; if the extension is not installed, nothing happens. (Use `unknown` cast, not `any`, per `guides/code.md` Types — declare an ambient `ReduxDevToolsExtension` interface in a co-located `.d.ts` or via `declare global` in `devtools.ts`.)
- On connect: `extension.connect({ name: config?.name })` returns a devtools instance. Send `devtools.send("@@INIT", store.snapshot())` immediately so the panel shows initial state.
- Subscribe to snapshot changes via `effect(() => { const snap = store.snapshot(); const label = peekLabel() ?? "update"; devtools.send(label, snap); })`. The effect reads `store.snapshot()` and therefore subscribes to every leaf signal through the snapshot computed (the same mechanism already used by `lib/create.ts:38-59`).
- The label stack is a module-level `string[]`. `action(label, fn)` pushes `label`, runs `fn`, pops in its own `finally` block so exceptions do not leak the stack. The devtools effect reads `peekLabel()` (top of stack) when it fires synchronously inside `fn()`.
- `DisconnectFunction` calls `devtools.disconnect()` and disposes the effect (the dispose function returned by `effect()`).
- `action()` is usable without `devtools()` connected — the stack push/pop is cheap, and `peekLabel()` returns `undefined` when no DevTools effect is reading. No allocation on the hot path when DevTools is absent.

No new runtime dep — the Redux DevTools extension is loaded by the browser, not bundled. `effect` comes from the existing `@hellajs/core` peer, so no new public `subscribe()` API is needed (user-confirmed: subscribe is redundant since `effect()` is already in core).

Cited evidence: `comparison` §9 Features Matrix row "DevTools integration: HellaJS None vs Redux DevTools (Zustand/RTK/Jotai/Valtio), mobx-devtools"; `comparison` §10 Bottom Line ("no devtools, no Redux DevTools bridge"); `file` `lib/internal/core.ts:1` (effect available via core peer).

**Definition of Done:**
- [ ] `bun check store` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by the package's `index.ts`)
- [ ] No new runtime dependency, OR the dependency is justified in Solution and a changeset exists
- [ ] Backward compatible, OR a changeset exists at `.changeset/*.md` describing the break
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`

#### [ ] devtools() test suite (Tests)
**Solution:**
New file `packages/store/tests/devtools.test.ts`. Mock `window.__REDUX_DEVTOOLS_EXTENSION__` via `beforeEach` save / `afterEach` restore per `guides/tests.md` Patched browser globals. Build a fake extension that records every `connect` / `send` / `disconnect` call into a `mock()`-tracked list.

Covers: `@@INIT` send on connect with the initial snapshot; snapshot changes propagate to devtools with auto-generated `"update"` label; `action(label, fn)` labels the next send with `label`; nested `action()` calls preserve the outer label after the inner returns (LIFO stack semantics); disconnect disposes the effect and stops further sends; absent devtools extension returns a no-op disconnect without throwing; `action()` without devtools connected runs `fn` and returns its value unchanged.

Cited evidence: `test` missing — no `tests/devtools*.test.ts` exists; `comparison` §9 confirms zero devtools integration today.

**Definition of Done:**
- [ ] `bun check store` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (`lib/devtools.ts` end-to-end, name the file and line range in the commit message)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, `await tick(); await tick()`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the implementation

#### [ ] devtools() docs (Docs)
**Solution:**
New file `packages/store/docs/api/devtools.mdx` following the Function template from `guides/docs.md`. Update `packages/store/docs/index.mdx:39` to list `devtools` under API. Add a short "Debugging with Redux DevTools" subsection to `packages/store/docs/concepts/state.mdx` showing how to wire `devtools()` + `action()`.

Cited evidence: `doc` missing — `docs/api/devtools.mdx` does not exist.

**Definition of Done:**
- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (Function / Prefix / Concept / Pattern / Index)
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter
- [ ] Website wrapper pages (`docs/src/pages/**/*.mdx`) have `title`, `description`, and `layout`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] File name matches the export name (API docs) or is lowercase-hyphenated (concepts / patterns)
