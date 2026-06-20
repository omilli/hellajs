## [ ] Guide — arrow-const carve-out for one-line guards
**Type:** Docs

### Depends On
- None

### Objective
`./guides/code.md` § Functions & Modules reflects the established cross-package convention that single-expression top-level predicates and type guards are declared as arrow consts, so the guide no longer contradicts `@hellajs/core`'s own `isFunction` / `hasWindow` definitions.

### Solution
The audit found that the guide states *"Function declarations for top-level named functions"* while `@hellajs/core` — the foundational package — defines its canonical helpers as arrow consts: `export const isFunction = (value: unknown): value is (...) => ...` (`core/lib/internal/utils.ts`) and `export const hasWindow = () => typeof window !== "undefined"` (`core/lib/internal/env.ts`). The router follows this de-facto convention (`isRouteObject`, `hasChildren` in `utils.ts`). The guide is stale: the codebase treats a one-line arrow const as the signal for "this is a pure predicate / lazy accessor," and a function declaration as the signal for "this has a body."

Edit `./guides/code.md`, `### Functions & Modules` section, the existing bullet:
```
- Arrow functions for inline callbacks and closures. Function declarations for top-level named functions
```
Replace with:
```
- Arrow functions for inline callbacks and closures. Function declarations for top-level named functions. Exception: single-expression top-level predicates and type guards may be arrow consts (`export const isX = (v): v is T => ...`, `export const hasY = () => ...`) — the arrow form signals "one-liner that returns a value," matching `@hellajs/core`'s `isFunction` / `hasWindow`. Multi-statement top-level functions still use declarations.
```

No other section of the guide is touched. The `### Naming Conventions` and `### Files` sections already permit the resulting names; this edit only clarifies the declaration form.

Trade-offs: this normalizes a pattern the codebase already uses broadly, rather than forcing a refactor of `core`. The alternative (enforce declarations everywhere, rewrite core's guards) is higher-cost, lower-value, and would not improve clarity or performance. Reference general practice (predicate-as-expression) only — no explicit package code in the guide text beyond the illustrative `@hellajs/core` mention already used elsewhere in the guide.

### Definition of Done
- [ ] `bun check router` exits 0 (guide edit must not break anything that consumes the guide)
- [ ] `bun lint` exits 0
- [ ] The `### Functions & Modules` section of `./guides/code.md` contains a sentence permitting single-expression top-level predicates and type guards as arrow consts
- [ ] The added sentence references the signal semantics ("one-liner that returns a value") and the `@hellajs/core` precedent
- [ ] Does `rg "single-expression top-level predicates" guides/code.md` find the new sentence?
- [ ] Does the edit leave the existing "Function declarations for top-level named functions" rule otherwise intact for multi-statement functions?
