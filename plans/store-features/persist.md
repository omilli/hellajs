## [ ] Add persist() wrapper for store state synchronization

### Depends On
None

### Objective
A standalone `persist()` wrapper syncs any store's snapshot to `localStorage`, `sessionStorage`, or a custom `StorageAdapter`, with serialization hooks and one-time rehydration on init — closing the persistence gap every major state library competitor ships.

### Sub-tasks

#### [ ] persist() wrapper and StorageAdapter types (Code)
**Solution:**
New file `packages/store/lib/persist.ts` exports `persist`, `persistLocal`, `persistSession`, and the `StorageAdapter` / `PersistConfig` types. Update `packages/store/lib/index.ts` barrel to re-export them.

Public API (modeled after the `lib/store.ts` overload style and the `lib/utils.ts:70-75` `wrapWithMiddleware` precedent):

- `persist<T extends Record<string, unknown>>(store: Store<T>, config: PersistConfig<T>): Store<T>` — wraps an existing store, rehydrates from storage on call, subscribes to snapshot changes via `effect()` from the core peer dep (re-exported through `lib/internal/core.ts:1`). Returns the same store reference for chaining.
- `PersistConfig<T>`: `{ key: string; storage?: StorageAdapter; serialize?: (snapshot: T) => string; deserialize?: (raw: string) => T; debounce?: number }`.
- `StorageAdapter`: `{ getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }`.
- `persistLocal`: `StorageAdapter` over `globalThis.localStorage`, guarded for SSR/undefined environments.
- `persistSession`: same for `globalThis.sessionStorage`.

Implementation notes:

- Default `storage` is `persistLocal`. Default `serialize`/`deserialize` are `JSON.stringify` / `JSON.parse`.
- Rehydration on init: read `storage.getItem(config.key)`; if present, `store.update(config.deserialize(raw))`. The update routes through middleware per `lib/utils.ts:48-63` `applyUpdate`. Parse errors from storage are untrusted platform input — narrow `try { JSON.parse } catch` with a `console.error` and continue with empty state (the narrow-catch exception in `guides/code.md` Error Handling).
- Subscribe to changes via `effect(() => { const snap = store.snapshot(); scheduleWrite(config.serialize(snap)); })`. The effect runs once on registration (writing the just-rehydrated state back — harmless idempotent write), then on every snapshot change.
- Writes are coalesced through a dirty flag flushed by `queueMicrotask`, per the `guides/code.md` Memory "Batched writes" rule. Reset the flag at the start of the flush so subsequent ticks re-arm. Optional `config.debounce` defers via `setTimeout` instead; when omitted, microtask batching applies.
- `persist()` returns the same `store` reference (not a wrapper). The wrapper holds a `DisconnectFunction` (dispose the effect + final flush). Exposed as `persist.disconnect` on the store or via a separate return — final shape left to the worker skill based on the cleanest non-breaking API.

No new runtime deps; `effect` comes from the existing `@hellajs/core` peer.

Cited evidence: `comparison` §9 Features Matrix row "Persistence: HellaJS None vs Zustand `persist`, Jotai `atomWithStorage`"; `comparison` §10 Bottom Line ("no `persist` middleware"); `file` `lib/internal/core.ts:1` (effect available via core peer); `file` `lib/utils.ts:70-75` (wrapper-pattern precedent).

**Definition of Done:**
- [ ] `bun check store` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by the package's `index.ts`)
- [ ] No new runtime dependency, OR the dependency is justified in Solution and a changeset exists
- [ ] Backward compatible, OR a changeset exists at `.changeset/*.md` describing the break
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`

#### [ ] persist() test suite (Tests)
**Solution:**
New file `packages/store/tests/persist.test.ts`. Covers: rehydration on init from a pre-seeded adapter; write-on-change via a mock `StorageAdapter`; custom serialize/deserialize round-trip (e.g. Date -> ISO string); middleware still applies to rehydrated writes (per `lib/utils.ts:48-63`); SSR-safe when `globalThis.localStorage` is undefined (no throw); microtask-batched writes coalesce multiple snapshot changes into one `setItem` call; explicit disconnect stops further writes.

Mock `StorageAdapter` as an in-memory `{ map: Map<string, string>, getItem, setItem, removeItem }` per `guides/tests.md` Mock Patterns — no external deps. Use `mock()` to track `setItem` call counts (no boolean-flag or pure-integer counters per the anti-pattern list). Use `await tick(0)` to flush microtask batching.

Cited evidence: `test` missing — no `tests/persist*.test.ts` exists; `comparison` §9 confirms zero persistence feature today.

**Definition of Done:**
- [ ] `bun check store` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (`lib/persist.ts` end-to-end, name the file and line range in the commit message)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, `await tick(); await tick()`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the implementation

#### [ ] persist() docs (Docs)
**Solution:**
New file `packages/store/docs/api/persist.mdx` following the Function template from `guides/docs.md`. Update `packages/store/docs/index.mdx` to list `persist` under API (current surface at `docs/index.mdx:39` lists only `store`). Add a "Persistent State" pattern to `packages/store/docs/patterns/state.mdx` showing localStorage plus a custom IndexedDB-style adapter.

Cited evidence: `doc` missing — `docs/api/persist.mdx` does not exist; `file` `packages/store/docs/index.mdx:39` (current API list).

**Definition of Done:**
- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (Function / Prefix / Concept / Pattern / Index)
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter
- [ ] Website wrapper pages (`docs/src/pages/**/*.mdx`) have `title`, `description`, and `layout`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] File name matches the export name (API docs) or is lowercase-hyphenated (concepts / patterns)
