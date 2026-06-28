# [ ] mutation-auto-invalidation

## Contract

### Surface change
yes — adds an `invalidates?: Array<string | RegExp>` field to `ResourceOptions`, which is re-exported by `packages/resource/lib/index.ts` via `export type * from "./types/resource"`. Per `code.md` §`index.ts` Rules and §Package File Structure, a new field on a public type consumers pass is a surface change.

### Package
resource

### Guide governance
- Files ← `code.md` §Package File Structure, §`index.ts` Rules, §Files, §Naming Conventions › Types, §Types, §JSDoc
- Public API delta ← `code.md` §`index.ts` Rules, §Types, §JSDoc
- Behavioral scenarios ← `tests.md` §Test Structure, §Scenario → test() derivation, §Mock Patterns, §Shared State and Cleanup
- Doc placement ← `docs.md` §File Locations & Naming, §Function & Prefix Docs, §Template Selection, §Multi-Method Exports

### Files
- `packages/resource/lib/resource.ts` — modify — destructure `invalidates` from `options` (~line 90, inside the existing destructure at lines 76-93); in `mutate`'s success path, after `await options.onSettled?.(result, undefined, variables, mutationContext)` at line 451, iterate `invalidates` dispatching each item to `resourceCache.invalidateByPrefix` (string) or `resourceCache.invalidateByPattern` (RegExp)
- `packages/resource/lib/types/resource.d.ts` — modify — add `invalidates?: Array<string | RegExp>` to `ResourceOptions` (after `onSettled`, ~line 102) with JSDoc

### Public API delta
```ts
// packages/resource/lib/types/resource.d.ts — ResourceOptions
export interface ResourceOptions<T, K, TTransformed = T> {
  // ...existing members...
  /** After a successful mutation, invalidate cache entries matching any prefix (string) or pattern (RegExp). Strings → invalidateByPrefix; RegExp → invalidateByPattern. No invalidation on error or abort. */
  invalidates?: Array<string | RegExp>;
}
```

```ts
import { resource, resourceCache } from "@hellajs/resource";

resourceCache.set("user:1", { id: 1 }, 60000);
const r = resource(async (vars) => ({ ok: true }), {
  invalidates: ["user:", /^posts:\d+$/],
});
await r.mutate({ action: "save" }); // on success: invalidateByPrefix("user:") + invalidateByPattern(/^posts:\d+$/)
```

### Behavioral scenarios
- A mutation with `invalidates: ["user:"]` calls `resourceCache.invalidateByPrefix("user:")` on success
- A mutation with `invalidates: [/^posts:\d+$/]` calls `resourceCache.invalidateByPattern(/^posts:\d+$/)` on success
- A mutation with `invalidates` does NOT invalidate on error or abort (the success path at resource.ts:449-453 is the only trigger)

### Doc placement
- `packages/resource/docs/api/resource.mdx` — Function Doc template (multi-method) — `## API`: add `invalidates` to the documented `ResourceOptions` block (~the options listing); `## Key Concepts` (line 303): add a `### Mutation invalidation` subsection covering string→prefix, RegExp→pattern, success-only behavior, and the example above, per `docs.md` §Multi-Method Exports

### Tests view
New `tests/mutation-auto-invalidation.test.ts`, 3 scenarios per Behavioral scenarios above, per `tests.md` §Test Structure and §Scenario → test() derivation. Mock `resourceCache.invalidateByPrefix`/`invalidateByPattern` with `mock()` from `bun:test` to assert call args (per `tests.md` §Mock Patterns — `bun:test`'s `mock`, never `vi.fn`/`jest.fn`).

### Docs view
Modify `docs/api/resource.mdx` per Doc placement above, per `docs.md` §Function & Prefix Docs and §Multi-Method Exports (existing interface doc, owned fully by this trio — no standalone page).

---

## [ ] Implement mutation auto-invalidation (Code)
**Type:** Code
**Depends on:** None

### Strategy
Minimal, surgical change. Destructure `invalidates` from `options` alongside the existing mutation-relevant fields. In `mutate`, **after** `await options.onSettled?.(result, undefined, variables, mutationContext)` on the success path (resource.ts:451) — never on the error/abort path at line 459 — iterate `invalidates` (if present): `typeof item === "string"` → `resourceCache.invalidateByPrefix(item)`; else → `resourceCache.invalidateByPattern(item)`. The ordering decision (after `onSettled`) is deliberate so user code can inspect the result before cache state changes; the success-only decision preserves the existing contract that error/abort paths leave the cache alone (users call `invalidate()` manually in `onSettled` for error-path invalidation). Mixed arrays are allowed: `invalidates: ["user:", /^posts:\d+$/]`. Reuses existing invalidation methods — no new invalidation logic. Trade-off considered and rejected: invalidating before `onSettled` — rejected because it hides the pre-invalidation cache snapshot from the user's settle hook.

### Definition of Done
- [ ] `bun coverage resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every file in Contract.Files touched as specified
- [ ] Public API delta in Contract implemented verbatim — `invalidates?: Array<string | RegExp>` exists on `ResourceOptions`; the mutate success path dispatches strings to `invalidateByPrefix` and RegExp to `invalidateByPattern`
- [ ] Every new or changed exported symbol has JSDoc (the `invalidates` field carries JSDoc in the `.d.ts`)
- [ ] No new runtime dependency
- [ ] Backward compatible — `invalidates` is optional, no change to existing mutation behavior
- [ ] Contract Tests-view and Docs-view hold — sibling Tests + Docs tasks exist (below)
- [ ] Audit skill run on `resource.ts`, `types/resource.d.ts` reports no deviations from `./guides/code.md`

## [ ] Test mutation auto-invalidation (Tests)
**Type:** Tests
**Depends on:** Implement mutation auto-invalidation

### Strategy
Three `test()`s map 1:1 to the Behavioral scenarios. Use `mock()` from `bun:test` to spy on `resourceCache.invalidateByPrefix` and `resourceCache.invalidateByPattern` (replace, assert `toHaveBeenCalledWith`, restore in `afterEach` — per `tests.md` §Mock Patterns). Prefix case: a resource with `invalidates: ["user:"]`, `r.mutate(...)`, assert prefix spy called with `"user:"`. Pattern case: same with `/^posts:\d+$/`. Negative case: a fetcher that rejects (or aborts via `timeout`/`abortSignal`), assert neither spy was called — covers the error and abort paths. `beforeEach` resets the cache and the spies.

### Definition of Done
- [ ] `bun coverage` shows 100% coverage on the changed source lines (the `invalidates` destructure + dispatch in `mutate`) named in Contract.Files
- [ ] One `test()` exists per scenario in Contract.Behavioral scenarios (3 total)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn`/`vi.fn`, `any`, `it()`/`test.skip`, `await tick()` without `0`, the double-tick, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every test asserts a behavior the source exposes — cross-checked against the implementation

## [ ] Document mutation auto-invalidation (Docs)
**Type:** Docs
**Depends on:** Implement mutation auto-invalidation

### Strategy
Per `docs.md` §Function & Prefix Docs and §Multi-Method Exports, `resource.mdx` documents `ResourceOptions` inline; extend it in place — add the `invalidates` field to the `ResourceOptions` block in `## API`, then a `### Mutation invalidation` subsection under `## Key Concepts` (line 303) explaining string→`invalidateByPrefix`, RegExp→`invalidateByPattern`, and the success-only contract (no invalidation on error/abort; users call `invalidate()` manually in `onSettled` for the error path). Seed the example from Contract.Public API delta verbatim.

### Definition of Done
- [ ] Every code example in the changed `resource.mdx` compiles against the current source signatures
- [ ] The Function Doc template from `./guides/docs.md` is preserved
- [ ] Every section in Contract.Doc placement exists with the specified content
- [ ] Public API delta signatures appear verbatim in the doc; usage example from Contract appears under `## Key Concepts`
- [ ] Package docs (`packages/resource/docs/**/*.mdx`) have no frontmatter
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
