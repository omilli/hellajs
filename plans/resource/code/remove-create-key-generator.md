# [x] remove-create-key-generator

## Contract

### Surface change
yes — removes `createKeyGenerator<T>()` from the exported `ResourceCache` interface and the `resourceCache` object. This is a public API removal. No replacement; the method was an identity function that returned its argument unchanged.

### Package
resource

### Guide governance
- `packages/resource/lib/cache.ts` ← `code.md` §Files, §Package File Structure
- `packages/resource/lib/types/cache.d.ts` ← `code.md` §Types, §Package File Structure
- `packages/resource/tests/resource-cache-basic.test.ts` ← `tests.md` §Test Structure, §Removing Tests
- `packages/resource/docs/api/resourcecache.mdx` ← `docs.md` §File Locations & Naming, §Multi-Method Exports
- `packages/resource/resource-comparison.md` ← `docs.md` §When NOT to write docs (comparison doc is supplementary doc owned by this package)
- `packages/resource/AGENTS.md` ← `brain-author` governance (agent-instruction file; edited directly, never `CLAUDE.md`)

### Files
- `packages/resource/lib/types/cache.d.ts` — modify — remove `createKeyGenerator` method from the `ResourceCache` interface
- `packages/resource/lib/cache.ts` — modify — remove the `createKeyGenerator` property from the `resourceCache` object literal
- `packages/resource/tests/resource-cache-basic.test.ts` — modify — remove the `test("createKeyGenerator returns template function", ...)` block
- `packages/resource/docs/api/resourcecache.mdx` — modify — remove the `### createKeyGenerator` subsection and its docs table entry; remove the example block using it
- `packages/resource/resource-comparison.md` — modify — remove the `createKeyGenerator<T>()` curried-typing bullet from the Feature comparison table
- `packages/resource/AGENTS.md` — modify — remove `resourceCache` method description for `createKeyGenerator` in the Public exports table row and the `resourceCache` methods section

### Public API delta
Removed from `ResourceCache`:
```ts
createKeyGenerator<T>(): (template: (params: T) => unknown) => (params: T) => unknown;
```

### Behavioral scenarios
None — no runtime behavior change; the method was always a no-op.

### Doc placement
- `docs/api/resourcecache.mdx`: remove `### createKeyGenerator` subsection (heading + description + usage example); remove the `createKeyGenerator` row from the methods table in the doc's `## API` section
- `resource-comparison.md`: remove the `createKeyGenerator<T>() curried typing` bullet from the Feature comparison
- `AGENTS.md`: remove the `createKeyGenerator` method description from the `resourceCache` methods paragraph

### Tests view
Remove the single `test("createKeyGenerator returns template function")` from `tests/resource-cache-basic.test.ts`. No new tests — the method was a no-op, removing it has no behavioral impact.

### Docs view
Three doc files change: `docs/api/resourcecache.mdx`, `resource-comparison.md`, `AGENTS.md`. See Doc placement.

---

## [x] Remove createKeyGenerator from source + types (Code)
**Type:** Code
**Depends on:** None

### Strategy
Two surgical deletions:
1. `packages/resource/lib/types/cache.d.ts:153` — delete the `createKeyGenerator` line from the `ResourceCache` interface
2. `packages/resource/lib/cache.ts:361` — delete the `createKeyGenerator` property from the `resourceCache` object literal (remove the line, then add a trailing comma to the preceding `invalidateResources` line if needed)

No other source file references this symbol. No behavioral impact — the method was identity.

### Definition of Done
- [x] `createKeyGenerator` removed from `ResourceCache` interface in `cache.d.ts`
- [x] `createKeyGenerator` property removed from `resourceCache` object in `cache.ts`
- [x] `bun coverage resource` exits 0 — verified (175 pass, 0 fail, lint clean)

## [x] Remove createKeyGenerator test (Tests)
**Type:** Tests
**Depends on:** Remove createKeyGenerator from source + types

### Strategy
Remove the test block in `packages/resource/tests/resource-cache-basic.test.ts` (lines 29-35, the `test("createKeyGenerator returns template function", ...)` call). Verify no other test references `createKeyGenerator`.

### Definition of Done
- [x] The `test("createKeyGenerator returns template function", ...)` block removed from `resource-cache-basic.test.ts`
- [x] No stale reference to `createKeyGenerator` remains in any test file — verified via `rg createKeyGenerator packages/resource/tests/` (0 matches)
- [x] `bun coverage resource` exits 0 — verified

## [x] Remove createKeyGenerator from docs (Docs)
**Type:** Docs
**Depends on:** Remove createKeyGenerator from source + types

### Strategy
Four files, each a surgical removal of the `createKeyGenerator` reference:
1. `packages/resource/docs/api/resourcecache.mdx` — removed from the `## API` interface block (line 24) and the `### createKeyGenerator` subsection (lines 269-290) with its code example
2. `packages/resource/resource-comparison.md` — removed the `createKeyGenerator<T>() curried typing` bullet (line 251)
3. `packages/resource/AGENTS.md` — removed the `createKeyGenerator` clause from the `resourceCache` methods paragraph (line 173)
4. `docs/public/llms.txt` — removed the `createKeyGenerator` line (line 516) from the generated LLM docs

Do NOT edit `CLAUDE.md` — it's auto-generated from `AGENTS.md` by the post-commit hook.

### Definition of Done
- [x] `resourcecache.mdx` no longer mentions `createKeyGenerator` in the `## API` table or as a subsection
- [x] `resource-comparison.md` no longer lists `createKeyGenerator` in the Feature comparison
- [x] `AGENTS.md` no longer describes `createKeyGenerator` in the `resourceCache` methods section
- [x] `CLAUDE.md` is NOT edited directly; `bun sync` regenerates it from `AGENTS.md` after commit
- [x] `docs/public/llms.txt` no longer mentions `createKeyGenerator`
- [x] All doc files parse correctly (`bun lint` passes — part of `bun coverage resource` exit 0)
