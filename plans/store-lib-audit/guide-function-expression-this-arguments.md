## [ ] Guide — function-expression carveout for `this` / `arguments`
**Type:** Docs

### Depends On
- None

### Objective
`./guides/code.md` § Functions & Modules names the arrow-vs-function-declaration split (arrows for closures, function declarations for top-level named functions) but is silent on function expressions that need their own `this` or `arguments` binding, which arrows cannot provide.

### Solution
The audit hit this gap three times in `packages/store/lib/`:
- `create.ts:57` `result.update = function (partial) { ... this.snapshot() ... this[key] ... }` — uses `this` (bound to the store at call time).
- `create.ts:81` `result.cleanup = function () { ... deepCleanup(this) ... }` — same.
- `utils.ts:65` `function wrapped(value?: unknown) { return arguments.length === 0 ? sig() : sig(middleware(value)); }` — uses `arguments` to distinguish getter-from-setter calls; arrows inherit `arguments` from the enclosing scope and cannot inspect their own call arity.

The current guide rule ("Arrow functions for inline callbacks and closures. Function declarations for top-level named functions") flags all three as candidates for arrow form, but converting them would silently change behavior: the method assignments would close over the lexical `result` (read-only, no dynamic dispatch) and the wrapped signal would read the outer function's `arguments` instead of its own. The code is correct as written; the guide is incomplete.

Edit `./guides/code.md`, `### Functions & Modules` section. After the existing "Arrow functions for inline callbacks and closures. Function declarations for top-level named functions" bullet, add a new bullet:
```
- Function expressions when the body needs its own `this` or `arguments` binding — arrows inherit both from the enclosing scope and cannot inspect call-site `this` or call arity. This covers method assignments dispatched via `obj.method()` and getter/setter disambiguation via `arguments.length`. Prefer arrows in every other closure case.
```

This makes three things explicit: (1) arrows are the default for closures, (2) `this`/`arguments` dependence is the sole carveout, (3) the carveout covers both method-style dispatch and arity inspection. No other section is touched.

Trade-offs: broadening the function-expression allowance risks authors reaching for `function` out of habit. The carveout is scoped narrowly to `this`/`arguments` dependence — any other closure stays an arrow. Documenting the rule beats leaving the gap implicit, since the existing code already follows the carveout without guide backing. Reference general JS binding rules only — no explicit package code.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun lint` exits 0
- [ ] The `### Functions & Modules` section of `./guides/code.md` contains a bullet addressing function expressions that need their own `this` or `arguments` binding
- [ ] The bullet names both `this` (method dispatch) and `arguments` (call-arity inspection) as the trigger conditions
- [ ] The bullet states that arrows remain the default in every other closure case
- [ ] Does `rg "Function expressions when the body needs its own" guides/code.md` find the new bullet?
- [ ] Does the edit leave the existing "Arrow functions for inline callbacks" bullet intact?
