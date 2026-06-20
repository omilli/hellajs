## [ ] docs/api/store.mdx — fix type drift, heading level, and duplicated section
**Type:** Docs

### Depends On
- None

### Objective
`packages/store/docs/api/store.mdx` accurately reflects the source in `packages/store/lib/types.d.ts` and follows the page structure rules in `./guides/docs.md`.

### Solution
Four edits in `docs/api/store.mdx`. No new section, no removed section.

**StoreMiddleware type drift (lines 42-46).** The docs show a simplified signature that omits the function and array branches:
```typescript
type StoreMiddleware<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown>
    ? StoreMiddleware<T[K]>
    : (value: T[K]) => T[K];
};
```
The actual source (`packages/store/lib/types.d.ts:22-30`) is:
```typescript
export type StoreMiddleware<T> = {
  [K in keyof T]?: T[K] extends (...args: unknown[]) => unknown
  ? (value: T[K]) => T[K]
  : T[K] extends unknown[]
  ? (value: T[K]) => T[K]
  : T[K] extends Record<string, unknown>
  ? StoreMiddleware<T[K]>
  : (value: T[K]) => T[K];
};
```
The simplification changes semantics: under the simplified form, a function-valued or array-valued property would recurse into `StoreMiddleware<T[K]>`, which is not what the runtime does. Replace the docs block with the source block verbatim (drop only the `export` keyword).

**StoreOptions interface vs type (line 37).** Docs declare `interface StoreOptions<T>`; source declares `type StoreOptions<T>`. Per `./guides/code.md` ("`interface` for object shapes"), the source is the wrong side of the rule — but the docs should not drift from the source regardless. Two acceptable resolutions:
- Update docs to `type StoreOptions<T>` to match current source (preferred for accuracy, no source change), OR
- Convert the source to `interface` (covered by the router audit's analogous `types-interface-conversion.md` pattern; would need its own Code task for store).

Pick the docs-side fix here (match the source as it stands) and file the source conversion separately if desired.

**Mutable Update heading level (line 94).** The section uses `####` under `### update`:
```markdown
### `update`
...
#### Mutable Update
```
`./guides/docs.md` § Multi-Method Exports shows method sub-headings as `###` directly under `## API`. The rest of this doc uses `###` for peer sections. Demote to `### Mutable Update` (renamed to avoid collision with the `### update` method heading — e.g. `### Mutable Draft Updates`).

**Duplicated "Nested Stores Do Not Inherit Readonly" (lines 365-368).** The same content appears at lines 234 (under `## Key Concepts > ### Readonly Options`) and at lines 365-368 (under `## Important Considerations > ### Nested Stores Do Not Inherit Readonly`). Per `./guides/docs.md` § Duplicate Content: *"Cross-reference rather than duplicate."* Remove the `## Important Considerations > ### Nested Stores Do Not Inherit Readonly` block; the canonical location is under Key Concepts where the full explanation lives.

Trade-offs: none. Accuracy and structure only.

### Definition of Done
- [ ] Every code example in `packages/store/docs/api/store.mdx` compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (Function Doc)
- [ ] Package docs (`packages/store/docs/**/*.mdx`) have no frontmatter
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against `packages/store/lib/` and `packages/store/tests/`
- [ ] File name matches the export name (`store.mdx` → `store`)
- [ ] Does the `StoreMiddleware` block in `docs/api/store.mdx` match the body of `packages/store/lib/types.d.ts` `StoreMiddleware<T>` (four conditional branches)?
- [ ] Does the `StoreOptions` declaration in docs match the source declaration form (`type` or `interface`)?
- [ ] Does `docs/api/store.mdx` use `### Mutable Draft Updates` (or equivalent) instead of `#### Mutable Update`?
- [ ] Does `rg -c "Nested Stores Do Not Inherit Readonly" packages/store/docs/api/store.mdx` return exactly `1`?
