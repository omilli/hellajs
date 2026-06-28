# [ ] persist

## Contract

### Surface change
yes — adds three new symbols (`persist`, `persistLocal`, `persistSession`) and two new types (`StorageAdapter`, `PersistConfig`) re-exported by `packages/store/lib/index.ts`. Per `code.md` §`index.ts` Rules and §Package File Structure, new re-exports are a surface change.

### Package
store

### Guide governance
- Files ← `code.md` §Package File Structure, §`index.ts` Rules, §Files, §Naming Conventions › Functions (`persist` / `persistLocal` / `persistSession`) and › Types (`StorageAdapter` / `PersistConfig`), §Functions & Modules
- Public API delta ← `code.md` §`index.ts` Rules, §Types, §JSDoc, §Decision Precedence, §Error Handling, §Memory
- Behavioral scenarios ← `tests.md` §Test Structure, §Scenario → test() derivation, §Mock Patterns, §Shared State and Cleanup
- Doc placement ← `docs.md` §File Locations & Naming, §Function & Prefix Docs, §Pattern Docs

### Files
- `packages/store/lib/persist.ts` — create — exports `persist`, `persistLocal`, `persistSession`, types `StorageAdapter` / `PersistConfig`; rehydrate-on-init, `effect()`-based subscription, microtask-batched writes via dirty flag, SSR-safe guards; follows the `lib/utils.ts:70-75` `wrapWithMiddleware` wrapper precedent and routes rehydrated writes through `lib/utils.ts:48-63` `applyUpdate`
- `packages/store/lib/index.ts` — modify — add re-exports for `persist`, `persistLocal`, `persistSession`, and type re-exports for `StorageAdapter` / `PersistConfig`
- `packages/store/tests/persist.test.ts` — create — seven scenarios (see Behavioral scenarios)
- `packages/store/docs/api/persist.mdx` — create — Function template
- `packages/store/docs/index.mdx` — modify — API bullet list: add `persist` (current list at `docs/index.mdx:39` lists only `store`)
- `packages/store/docs/patterns/state.mdx` — modify — new "Persistent State" pattern (localStorage + custom adapter)
- `packages/store/AGENTS.md` — modify — exports table: add `persist`, `persistLocal`, `persistSession` (+ types `StorageAdapter`/`PersistConfig`); regenerated `CLAUDE.md` + `.github/instructions/*` via `bun sync`

### Public API delta
```ts
export function persist<T extends Record<string, unknown>>(store: Store<T>, config: PersistConfig<T>): Store<T>;
export const persistLocal: StorageAdapter;
export const persistSession: StorageAdapter;
export type StorageAdapter = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};
export type PersistConfig<T> = {
  key: string;
  storage?: StorageAdapter;
  serialize?: (snapshot: T) => string;
  deserialize?: (raw: string) => T;
  debounce?: number;
};
```

```ts
import { store, persist, persistLocal } from "@hellajs/store";

const settings = store({ theme: "light", volume: 80 });
persist(settings, { key: "settings", storage: persistLocal });
// rehydrates from localStorage on call; writes on every snapshot change (microtask-batched)

settings.theme("dark"); // -> localStorage["settings"] updated on the next microtask
```

### Behavioral scenarios
- rehydrates from storage on init (pre-seeded adapter seeds the store)
- a snapshot change triggers a serialized write to storage
- custom serialize/deserialize round-trips a non-JSON value (e.g. Date → ISO string and back)
- middleware still applies to rehydrated writes (routes through `applyUpdate`)
- SSR-safe: undefined `globalThis.localStorage` does not throw
- microtask batching coalesces multiple snapshot changes into one `setItem` call
- explicit disconnect stops further writes

### Doc placement
- `packages/store/docs/api/persist.mdx` — Function template — title + `## API` + `## Basic Usage` — new page
- `packages/store/docs/index.mdx` — Index — API bullet list — add `persist` entry
- `packages/store/docs/patterns/state.mdx` — Pattern — new "Persistent State" pattern (localStorage + IndexedDB-style adapter)

### Tests view
New `tests/persist.test.ts`, one `test()` per scenario in Behavioral scenarios (seven). Mock `StorageAdapter` as an in-memory `{ map, getItem, setItem, removeItem }` (tests.md §Mock Patterns — no external deps); track `setItem` counts with `mock()`; flush microtask batching with `await tick(0)`.

### Docs view
New `docs/api/persist.mdx` (Function template) + `docs/index.mdx` API list entry + `docs/patterns/state.mdx` "Persistent State" pattern, per Doc placement. This trio owns the full blast radius: the standalone `api/persist.mdx` page + the `packages/store/AGENTS.md` exports-table add (`persist`/`persistLocal`/`persistSession` + types), then `bun sync` to regenerate mirrors. No meta coordination plan is cited.

---

## [ ] Implement persist wrapper and StorageAdapter types (Code)
**Type:** Code
**Depends on:** None

### Strategy
`persist()` rehydrates from `storage.getItem(key)` on call (deserialize + `store.update(...)` routing through `applyUpdate` per `lib/utils.ts:48-63`), then subscribes to snapshot changes via `effect(() => scheduleWrite(serialize(store.snapshot())))` from the `@hellajs/core` peer (re-exported through `lib/internal/core.ts`). Writes coalesce through a dirty flag flushed by `queueMicrotask`, reset at the start of the flush so subsequent ticks re-arm (code.md §Memory "Batched writes"); optional `config.debounce` swaps to `setTimeout`. Default `storage` is `persistLocal`; default serialize/deserialize are `JSON.stringify`/`JSON.parse`. Parse errors are untrusted platform input — narrow `try { JSON.parse } catch` with `console.error` + continue (the narrow-catch rule, code.md §Error Handling). `persistLocal`/`persistSession` guard for SSR/undefined. `persist()` returns the same `store` reference (not a wrapper); the disconnect (dispose effect + final flush) is exposed on the store or as a separate return — cleanest non-breaking shape left to the worker. The wrapper mirrors the `lib/utils.ts:70-75` `wrapWithMiddleware` precedent. No new runtime dep. Trade-off considered and rejected: a proxy-based wrapper — violates the store's direct-access design; reusing the existing middleware/applyUpdate path keeps persistence orthogonal.

### Definition of Done
- [ ] `bun coverage store` exits 0
- [ ] `bun lint` exits 0
- [ ] Every file in Contract.Files touched/created as specified
- [ ] Public API delta in Contract implemented verbatim — `lib/index.ts` re-exports `persist`, `persistLocal`, `persistSession`, `StorageAdapter`, `PersistConfig`
- [ ] Every new exported symbol has JSDoc (all are re-exported by `index.ts`, so no `@internal`)
- [ ] No new runtime dependency (`effect` from the core peer)
- [ ] Contract Tests-view and Docs-view hold — sibling Tests + Docs tasks exist (below)
- [ ] Audit skill run on `lib/persist.ts` + `lib/index.ts` reports no deviations from `./guides/code.md`

## [ ] Test persist wrapper and StorageAdapter types (Tests)
**Type:** Tests
**Depends on:** Implement persist wrapper and StorageAdapter types

### Strategy
One `test()` per Behavioral scenario (seven). In-memory `StorageAdapter` (`{ map: Map<string,string>, getItem, setItem, removeItem }`) per tests.md §Mock Patterns; `mock()` for `setItem` call counts (no boolean flags / integer counters); `await tick(0)` to flush microtask batching and assert coalescing. SSR scenario deletes `globalThis.localStorage` for that test only. Cross-check each assertion against `lib/persist.ts`.

### Definition of Done
- [ ] `bun coverage` shows 100% coverage on `lib/persist.ts` (name the file + line range in the commit message)
- [ ] One `test()` exists per scenario in Contract.Behavioral scenarios (seven)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, the double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every test asserts a behavior the source actually exposes — cross-checked against `lib/persist.ts`

## [ ] Document persist wrapper and StorageAdapter types (Docs)
**Type:** Docs
**Depends on:** Implement persist wrapper and StorageAdapter types

### Strategy
Write `docs/api/persist.mdx` from the Function template (docs.md §Function & Prefix Docs) — title, `## API` (signatures verbatim from Contract.Public API delta), `## Basic Usage` (the Contract example). Add `persist` to the `docs/index.mdx` API bullet list. Add a "Persistent State" pattern to `docs/patterns/state.mdx` (docs.md §Pattern Docs) showing localStorage plus a custom IndexedDB-style adapter. Add `persist`/`persistLocal`/`persistSession` (+ types) to `packages/store/AGENTS.md` exports table, then run `bun sync` to regenerate the `CLAUDE.md` mirror + `.github/instructions/*`. This trio owns the standalone page + AGENTS.md entry itself — no meta-plan registry is cited.

### Definition of Done
- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The Function template from `./guides/docs.md` is used on `persist.mdx`; the Pattern template on the new `patterns/state.mdx` section
- [ ] Package docs (`packages/store/docs/**/*.mdx`) have no frontmatter
- [ ] Every section in Contract.Doc placement exists with the specified content
- [ ] Public API delta signatures appear verbatim in `persist.mdx`; the Contract usage example appears under `## Basic Usage`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against `lib/persist.ts` and tests
- [ ] `packages/store/docs/index.mdx` API list includes `persist`
