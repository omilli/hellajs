## [ ] Guide — numeric for-loop clarification
**Type:** Docs

### Depends On
- None

### Objective
`./guides/code.md` § Loops resolves the ambiguity between "Cached `while` loops only" (literal text) and the counter-based `for (let i = 0; i < len; i++)` form, which allocates no iterator and is functionally equivalent to the `while` form.

### Solution
The audit hit an ambiguity: the guide bans `for...of` / `for...in` on iterator-allocation grounds and mandates the `while` form, but never addresses counter-based `for(;;)`, which does not allocate an iterator. `match.ts:44` uses `for (let i = 0; i < baseLength; i++)`. The stated performance rationale (GC pressure from iterator objects) does not apply to a numeric counted loop, so the literal ban appears over-broad. Clarify intent.

Edit `./guides/code.md`, `### Loops` section. After the existing `while` example block, add a new paragraph:
```
Counter-based `for (let i = 0; i < len; i++)` allocates no iterator and is functionally equivalent to the `while` form above. The house style is the `while` form — convert `for(;;)` counters to `while` when touching the code for consistency. The hard ban applies only to `for...of` and `for...in`, which materialize iterator objects per iteration.
```

This makes three things explicit: (1) counter `for` is not an iterator allocation, (2) the `while` form is still the preferred house style, (3) the hard ban is scoped to `for...of` / `for...in`. No other section is touched. The `loop-and-owns-fixes` task already normalizes the router's loops to `while` opportunistically; this guide edit documents why counter `for` was not, on its own, a correctness or performance defect.

Trade-offs: keeping `while` as the house style preserves a single visual idiom across the codebase, while the clarification stops reviewers from flagging benign counter loops as guide violations. Reference general loop-allocation principles only — no explicit package code.

### Definition of Done
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] The `### Loops` section of `./guides/code.md` contains a paragraph addressing counter-based `for(;;)` loops
- [ ] The paragraph states that the hard ban applies only to `for...of` / `for...in`
- [ ] The paragraph states that the `while` form remains the house style
- [ ] Does `rg "Counter-based" guides/code.md` find the new paragraph?
- [ ] Does the edit leave the existing `while` example and the `for...of` / `for...in` ban intact?
