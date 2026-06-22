## [ ] Document PartialDeep and ReadonlyKeys helper types

### Depends On
None

### Objective
The `PartialDeep` and `ReadonlyKeys` exported helper types from `lib/types.d.ts` are documented in `docs/api/store.mdx` so users can reference them in their own code — closing the documentation gap on two pieces of currently-undocumented public type surface.

### Solution
Append a new "Helper Types" section to `packages/store/docs/api/store.mdx` after the existing `StoreMiddleware` documentation (file ends around line 377, after the Effects vs Middleware section). Cover:

- `PartialDeep<T>` — recursive optional mapping used by `update(partial)`. Show the conditional expansion that preserves arrays and functions as leaves (per `lib/types.d.ts:7-15`), so a partial update to `{ items: [...] }` is a full replacement, not a deep merge. Cross-reference the existing `update()` section.
- `ReadonlyKeys<T, O>` — extracts the readonly key set from a `StoreOptions` value. Show example: `type R = ReadonlyKeys<typeof options>` resolving to `'apiUrl'` when `options = { readonly: ['apiUrl'] }`, and resolving to `keyof T` when `options = { readonly: true }`. Cross-reference the existing Readonly Options section.

Use the Function template from `guides/docs.md` adapted for type-only declarations (signature block in a `ts` fence, bullet list of type parameters, then a usage example in a second `ts` fence). Verify every code example compiles against the current `lib/types.d.ts:7-15` (`PartialDeep`) and `lib/types.d.ts:45-50` (`ReadonlyKeys`).

No claim in the new section may contradict the implementation — cross-check each type expansion against the source.

Cited evidence: `file` `lib/index.ts:2` re-exports `export type * from "./types"`; `file` `lib/types.d.ts:7-15` (`PartialDeep`); `file` `lib/types.d.ts:45-50` (`ReadonlyKeys`) — both exported as public surface; `doc` missing — `docs/api/store.mdx` documents `Store`, `StoreOptions`, `StoreMiddleware` but neither helper.

**Definition of Done:**
- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (Function / Prefix / Concept / Pattern / Index)
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter
- [ ] Website wrapper pages (`docs/src/pages/**/*.mdx`) have `title`, `description`, and `layout`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] File name matches the export name (API docs) or is lowercase-hyphenated (concepts / patterns)
