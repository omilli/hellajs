## [ ] Guide — object-property iteration pattern
**Type:** Docs

### Depends On
- None

### Objective
`./guides/code.md` § Loops shows the canonical cached `while` for arrays and the `Array.from(map.entries())` amortization for `Map`, but is silent on plain-object property iteration, which the codebase falls back to `for...in` for in three separate files.

### Solution
The guide bans `for...in` on iterator-allocation and prototype-chain-traversal grounds, and mandates cached `while` loops. It shows the `Map` pattern (`Array.from(map.entries())` then indexed `while`) but never names the plain-object equivalent. Without the canonical alternative, the code reverts to `for...in` everywhere it walks an object's keys — `deepClone`, `extractChanges`, `deepCleanup`, and the snapshot computed all use it. The mechanical fix is clear (use `Object.keys()` then cached `while`), but reviewers need the guide to back them.

Edit `./guides/code.md`, `### Loops` section. After the existing `Map` iteration example block, add a new paragraph and code block:
```
Plain-object property iteration follows the same shape — materialize own keys once with `Object.keys()`, then iterate by index. Never `for...in`, which traverses the prototype chain and silently includes inherited enumerable properties:

```typescript
const keys = Object.keys(obj)
let i = 0
const len = keys.length
while (i < len) {
  const key = keys[i]
  const value = obj[key]
  i++
}
```

Use `Object.entries()` in place of `Object.keys()` only when both key and value are needed and the per-iteration lookup would be redundant; the `[key, value]` destructuring at the top of the loop body replaces the indexed value lookup.
```

This makes three things explicit: (1) `Object.keys()` materializes own enumerable keys, sidestepping the prototype chain entirely, (2) the cached `while` is the canonical form, (3) `Object.entries()` is the variant for when the value lookup would be redundant. No other section is touched.

Trade-offs: the example adds one more loop idiom to the guide, but it closes the gap that produced three independent `for...in` violations in one small package. The `in-place-style-fixes` task already converts the affected loops; this guide edit documents why the conversion is the canonical form rather than a stylistic preference. Reference general iteration principles only — no explicit package code.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun lint` exits 0
- [ ] The `### Loops` section of `./guides/code.md` contains a paragraph and code block showing plain-object property iteration with `Object.keys()` and cached `while`
- [ ] The paragraph states that `for...in` traverses the prototype chain and includes inherited enumerable properties
- [ ] The paragraph names `Object.entries()` as the variant for key+value iteration
- [ ] Does `rg "Plain-object property iteration" guides/code.md` find the new paragraph?
- [ ] Does the edit leave the existing `while` example and the `Map` iteration example intact?
