## [ ] docs/concepts/state.mdx — fix three inaccurate claims
**Type:** Docs

### Depends On
- None

### Objective
`packages/store/docs/concepts/state.mdx` makes no claim that contradicts the implementation in `packages/store/lib/` or the behavior of `@hellajs/core`.

### Solution
Three accuracy fixes. All in `packages/store/docs/concepts/state.mdx`.

**"app.newProp() would be undefined" (line 60).** Current:
```typescript
// This does nothing - 'newProp' doesn't exist in initial object
app.update({ newProp: 'value' });
// app.newProp() would be undefined
```
The comment is wrong. `app.newProp` itself is `undefined` (the property was never defined on the store), so calling `app.newProp()` throws `TypeError: app.newProp is not a function` — it does not return `undefined`. The accurate comment is:
```typescript
// app.newProp is undefined — accessing it returns undefined; calling it throws
```

**"Reference Management - Circular references are prevented" (line 174).** Current text inside the `<details>` block:
```
- **Reference Management** - Circular references are prevented through careful property definition
```
No such mechanism exists in `packages/store/lib/`. `createStore` recurses through `Object.entries(initial)` and `defineStoreProperty` does no cycle detection. A self-referential initial object would recurse until the stack overflows. Either delete the bullet (the docs should not claim a feature the code does not have) or replace it with an accurate note:
```
- **No Cycle Detection** - Self-referential initial objects will recurse until the stack overflows; store initial state must be a tree
```

**"Effects run immediately for properties they depend on" (line 168).** Current:
```
5. **Effect Execution** - Effects run immediately for properties they depend on
```
This contradicts `@hellajs/core`'s glitch-free, batched propagation model (effects are queued and flushed, not run inline on the setter). The accurate description is:
```
5. **Effect Execution** - Effects are queued and flushed in dependency order after the current write completes (glitch-free)
```

Trade-offs: none. These are correctness fixes; the inaccurate versions actively mislead readers.

### Definition of Done
- [ ] Every code example in `packages/store/docs/concepts/state.mdx` compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (Concept Doc)
- [ ] Package docs (`packages/store/docs/**/*.mdx`) have no frontmatter
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against `packages/store/lib/` and `@hellajs/core`
- [ ] File name is lowercase (`state.mdx`)
- [ ] Does `docs/concepts/state.mdx` no longer contain the phrase `would be undefined` for `app.newProp()`?
- [ ] Does `docs/concepts/state.mdx` no longer claim that circular references are prevented?
- [ ] Does `docs/concepts/state.mdx` no longer say effects run "immediately"?
