# Code Style Guide

## Core Philosophy

Performance-critical runtime library. Optimized for execution speed and minimal memory overhead. Every abstraction must earn its cost against the hot path.

## Decision Precedence

When rules conflict, resolve in this order:

1. **Correctness** — glitch-free updates, no memory leaks, no stale state
2. **Performance** — fast paths, minimal allocations, cached loops
3. **Backward compatibility** — public API stability, no silent breakage
4. **Clarity** — readable by a human unfamiliar with the codebase
5. **Brevity** — less code, fewer files, fewer abstractions

Performance beats DRY when extracting a helper adds hot-path overhead. Correctness beats performance when a fast path would produce stale state.

## Code Rules

### Functions & Modules

- Export functions in place — never define then export separately
- Never re-export imports — each module exports only its own code. Exception: `internal/core.ts` barrel re-exports from `@hellajs/core` for dependency isolation and bundle optimization
- Never create wrapper functions that only call through to another function. Exception: TypeScript overload implementations — when public overload signatures live on one function and the implementation forwards to an internal factory, the thin forwarding body is structural (required by overload semantics and the public-vs-internal split). The wrapper must add no logic beyond argument forwarding; real work belongs in the factory
- Never add a parameter just to pass it through unchanged
- Never extract a function called from exactly one callsite unless it exceeds 30 lines
- Arrow functions for inline callbacks and closures; function declarations for top-level named functions
- Function expressions only when the body needs its own `this` or `arguments` binding (method assignments dispatched via `obj.method()`, getter/setter disambiguation via `arguments.length`). Arrows in every other closure case
- Parenthesize single-parameter arrow functions: `(x) => fn(x)` — consistency with multi-param form
- Destructure at the top of function scope when accessing 2+ properties: `const { a, b } = obj`
- JSDoc on every function and type. `@internal` for symbols `export`ed from their module but not re-exported by the package's `index.ts` barrel. Non-exported symbols are local — JSDoc only, no `@internal`
- Exported `let` / `const` value bindings follow the same JSDoc rule. Mutable exported state (`export let`) documents why mutation is the chosen shape (e.g., "incremented on entry to track nesting depth") so the mutable-export alarm is justified at the declaration site
- Inline comments only for logic requiring 2+ concepts not visible in the current scope — never restate the code. Comments that expand a deliberately-abbreviated internal field name to its meaning are "decoding," not "restating," when the abbreviation is mandated by the performance rule above. Comments restating already-readable code remain prohibited.

### Imports

```typescript
import type { SomeType } from "./types";
import { value } from "./internal/module";
```

- All `import` statements precede every other top-level statement — no `const`, `let`, type alias, or any declaration above the last import. Side-effect imports and bare `import "..."` follow the same rule
- Double quotes for all imports and string literals; semicolons always required
- Enforced by `@stylistic/quotes` in `eslint.config.mjs` — lint fails on single-quoted string literals
- Separate `import type` for all type-only imports — never inline `type` in a value import
- Import only what each file uses
- No external dependencies. Exception: type-only imports (`import type`) from external packages are permitted when the package ships only type declarations (`.d.ts` / `.js.flow`, no runtime JS entry) and is declared as an intentional `dependency`. Type-only imports erase at compile time and add zero bundle weight, so the lean-runtime concern driving this rule does not apply. `import type * as CSS from "csstype"` in `packages/css/lib/types.d.ts` is the canonical case.

### Types

- `interface` for object shapes (declaration merging, cleaner errors)
- `type` for unions, intersections, mapped, conditional, utility types
- Never use `any` — `unknown` if the type is truly unknown
- Never guard with a type check the type system already excludes
- `readonly` on config properties that must not mutate after creation
- Arrow function type guards with explicit `value is Type` return type
- `<T>` data type, `<K>` key type, `<R>` return type
- Constrain with `extends` only when the function requires it
- Overload signatures before the implementation; implementation signature covers all overloads with union/optional types. Internal functions use a single signature — overloads are a public API concern
- JSDoc on every overload signature. When the implementation signature is itself the exported function (a single `export function` body following multiple overload signatures), no separate JSDoc on the implementation — the overload signatures carry the public documentation. Implementation gets `@internal` only when it is a separate non-exported function
- Use `Object.hasOwn(obj, key)` for own-property checks — never `in` (traverses prototype chain) or `.hasOwnProperty` (can be shadowed)
- A named type is the source of truth for its shape: reference it by name at every signature that returns or accepts it, never re-inline the shape. Inlining a duplicate lets the two drift
- `export type * from "./types"` promotes every type in the file to the public API with no per-type opt-out. Keep only consumer-facing types in a wholesale-re-exported file; internal implementation types live in the module that uses them (exported with `@internal`, or not exported at all)

### Loops

Cached `while` loops only. `for...of` and `for...in` create iterator objects per iteration, adding GC pressure.

```typescript
let i = 0
const len = arr.length
while (i < len) {
  i++
}
```

`Map` iteration follows the same pattern. A single `Array.from` allocation amortizes the iterator-object cost — preferred over per-iteration `for...of` for hot traversals:

```typescript
const entries = Array.from(map.entries())
let i = 0
const len = entries.length
while (i < len) {
  const [key, value] = entries[i]
  i++
}
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

`.forEach` does not allocate a per-iteration iterator object and is permitted on cold paths (e.g. disposal); the prohibition targets `for…of`/`for…in`'s iterator-object cost on hot traversals.

Use `Object.entries()` in place of `Object.keys()` only when both key and value are needed and the per-iteration lookup would be redundant; the `[key, value]` destructuring at the top of the loop body replaces the indexed value lookup.

### Memory

- Never allocate new collections in hot paths when `.clear()` or reference swapping works
- Swap collection references instead of reallocating — avoids GC pressure from discarded collections
- `.clear()` and `.length = 0` instead of `new Map()` / `new Array()` on long-lived references
- `WeakMap`/`WeakSet` have no `.clear()` — on full reset, reassign a new instance to a `let` binding rather than iterating; this is the documented exception to the swap-vs-reallocate rule
- `WeakMap`/`WeakSet` for element-associated data — auto-GC when elements are removed
- Lazy-allocate Sets and Maps on first use — avoid allocating empty collections that may never be populated
- Store cleanup functions, call in bulk on disposal — avoids cleanup-per-item overhead
- Frozen empty objects and shared no-op functions for empty/initial states — single allocation, zero per-instance cost

**Batched writes** — coalesce multiple mutations to a single sink (a style element, a queue) behind a dirty flag flushed via `queueMicrotask`. Batches work within a synchronous tick and runs before paint. Reset the flag at the start of the flush so subsequent ticks can re-arm it. Drop the pattern entirely when the sink supports surgical, allocation-free updates (e.g., CSSOM `insertRule`/`deleteRule`) — batching exists to amortize O(n) rewrites, not to wrap O(1) ops.

### Conditions

- Early returns to avoid deep nesting — flat code is easier to reason about
- Never nest ternary expressions
- Never use ternary for branches with side effects
- Ternary for single-expression branches only

### Error Handling

- Public API functions validate inputs — they do not trust their callers. On invalid input, throw an `Error` with a `[package] fn: <constraint>, received <value>` message (e.g., `[dom] ForEach: each is required`); never silently coerce
- Internal functions do not guard — they trust their callers. Guards on internal functions are dead branches
- Exception: functions invoked by the platform (MutationObserver callbacks, event listeners, Promise `.then`/`.catch` continuations, `setTimeout` callbacks) receive untrusted inputs and may guard. The runtime — not a trusted internal caller — invokes them with whatever the DOM or Promise machinery provides
- Platform APIs that throw recoverably on known-benign conditions (e.g., an invalidated CSSOM rule) may catch narrowly. The catch block must:
  - Name the specific condition in a comment
  - Never catch broadly with an untyped `catch {}` that hides unrelated failures
  - Prefer logging in development over a bare `/* ignore */`

  Broad catches that swallow unknown errors remain prohibited.
- Use `try...catch` only when the operation can genuinely fail at runtime
- Throw specific error messages including the invalid value and the constraint it violated
- Never silently swallow errors — either handle, rethrow, or log

### Mutation vs Immutable

- Hot-path internal state: direct mutation — allocation-free updates
- Public API surface: return new references where semantically appropriate

## Naming Conventions

### Variables

- **camelCase** for variables (`activeContext`, `defaultContext`)
- **UPPER_SNAKE_CASE** for immutable configuration constants — primitives, frozen objects, regex patterns, bitmask flags (`DEFAULT_TIMEOUT`, `MAX_RETRIES`, `TOKEN_REGEX`, `EMPTY_OBJECT`, `NOOP`)
- **camelCase** for mutable module-level state — Maps, Sets, WeakMaps, arrays, `let`-declared variables (`templateCache`, `handlerCounts`, `globalListeners`, `effectQueue`)
- **`is`/`has` prefix** for booleans (`isLoading`, `hasChildren`)
- Abbreviations only when widely understood — shortened names must still communicate intent at a glance:

  `ctx` (context), `fn` (function param), `cb` (callback), `len` (cached loop length), `el` (element in local scope), `idx` (index when `i` taken), `prev`/`curr`/`next` (linked structure pointers)

  Never use bare `l` for cached length — visually indistinct from `1` and `I`. Always `len` (single loop) or the `<prefix>Len` form (`kLen`, `fLen`) for nested loops.

- Nested-loop index variables use a single-letter prefix matching the iterated collection, followed by `i`: `ki` (key index), `fi` (field index), `ci` (child index). The cached length uses the same prefix with `Len`: `kLen`, `fLen`, `cLen`. Applies only when `i` is already in scope from an outer loop; a single loop in a function always uses plain `i` and `len`.
- Internal state fields use shorter names (2-3 chars) for V8 hidden class density — an intentional performance trade-off, not a general pattern.

### Functions

- **Single word** for public API functions — they appear in user code and must be memorable
- **PascalCase** multi-word names for JSX/html component exports (e.g., `ForEach`, `Lazy`). These appear as JSX tags and must be PascalCase
- **`$`-prefixed** names for DOM reference APIs (`$ref`, `$collection`). The `$` prefix distinguishes reference utilities from regular functions
- **Verb-first** for non-public functions — internal names describe the action:

  | Verb | Purpose |
  |------|---------|
  | `create` | Construction |
  | `get`/`peek` | Access |
  | `set`/`update` | Mutation |
  | `use` | Consumption |
  | `add` | Registration |
  | `remove` | Deletion |
  | `resolve` | Resolution |
  | `dispose` | Teardown |
  | `reset`/`clear` | Reset |
  | `mount` | DOM attachment |
  | `append` | Child insertion |
  | `find` | Tree search |
  | `dispatch` | Event/error routing |
  | `ensure` | Lazy initialization |
  | `check` | Validation/verification |
  | `register`/`unregister` | Lifecycle subscription |
  | `schedule` | Deferred execution |
  | `process` | Queue handling |
  | `parse` | String-to-AST conversion |
  | `normalize` | Value standardization |
  | `build` | Construct an output value from inputs |
  | `sync` | Mirror one representation to another |
  | `apply` | Apply accumulated state to a target |

  Non-exhaustive — lists common patterns across the codebase.

### Types

- **`Fn` suffix** for function-valued types, applied consistently within a package. Never mix `Fn` / `Handler` / `Callback` / `Listener` for the same concept — a package picks one suffix and uses it everywhere
- **`Options`** for a creation-parameter bag passed once to a factory or constructor; **`Config`** for an object whose fields shape runtime behavior over a lifetime. Decide by what the fields do, not by familiarity
- **`Props`** reserved for component and element prop bags — never reused for generic options or config
- **Prefix policy** on scoped packages (`@hellajs/dom`): the scope already namespaces, so do not brand-prefix every type. Reserve a prefix for names that collide with a DOM/JS builtin (`Node`, `Element`, `Event`) — qualify or prefix those always

### Files

- (Pascal|Camel)case, no hyphens: `signal.ts`, `cssRemove.ts`, `ForEach.ts` — not `app-context.ts`
- One public API function per file. The filename is the verbatim export name: `signal.ts` exports `signal`, `cssRemove.ts` exports `cssRemove`, `cssVars.ts` exports `cssVars`. No "related pair" or "multi-word noun shortcut" carve-outs — `css`/`cssRemove`/`cssReset` are three files, and `cssVars`/`cssVarsRemove`/`cssVarsReset` are three more. One export per file is what makes the public surface scannable and lets the audit be checked mechanically
- Files under `lib/internal/` are organized by cohesive concern rather than a single public API, so the one-export-per-file and filename-matches-export rules apply only to top-level `lib/*.ts`, not to `internal/`
- PascalCase for JSX/html component filenames that match their export: `ForEach.ts` exports `ForEach`, `Portal.ts` exports `Portal`. Required for JSX component resolution
- `$`-prefixed names for special reference APIs: `$ref.ts` exports `$ref`, `$collection.ts` exports `$collection`. The `$` prefix signals a DOM reference utility

## File and Function Size

- **Functions**: soft limit under 80 lines. If a function exceeds 80 lines, look for natural split points without violating the No Single Use Functions rule
- **Files**: soft limit under 300 lines. If a file exceeds 300 lines, split internal helpers into sub-modules without violating the No Single Use Functions rule. Judge per-file, not as a blanket allowance
- `.d.ts` type declaration files are exempt from the 300-line limit when they contain cohesive type definitions — element attribute maps, event maps, mapped types, computed type derivations (e.g., `bind:*` variants derived from core attributes via mapped types) — where splitting across files would harm discoverability, usability, or type inference quality. Hand-expansion of mapped types is prohibited
- Files dominated by cohesive per-feature registries or state maps may slightly exceed 300 lines when splitting would force artificial seams across tightly coupled state; judge per-file, not as a blanket allowance
- Soft limits — exceed them when the alternative (splitting) would harm clarity

## JSDoc

Every type and function gets a JSDoc block.

```typescript
/**
 * @internal — mark symbols that are exported from this module but not re-exported by the package's index.ts barrel. Omit for purely local (non-exported) functions.
 * One-line description in present tense.
 * @template T — with constraint if applicable
 * @param paramName — omit if self-documenting from name + type
 * @returns — omit if obvious from return type
 */
```

Describe what callbacks receive and when they are called:

```typescript
/**
 * @param fn Compute function. Called with previous value. May return undefined to skip update.
 */
```

## Package File Structure

```
lib/
  internal/          # Internal helpers — not re-exported by index.ts
  types/             # Global type declarations (always use .d.ts)
  [file].ts          # Public API — one function per file, filename matches export name
  index.ts           # Pure re-export barrel only
```

Top-level `lib/*.ts` is **public API only**. A file whose exports are all `@internal`, or whose symbols are not re-exported by `index.ts`, is internal code and belongs under `lib/internal/` — never at the top level. The top-level folder is the package's public surface; an internal helper sitting there looks public but isn't, which hides the real API and defeats the one-export-per-file rule (an auditor cannot tell a misplaced internal file from a genuine public one).

### `index.ts` Rules

Named re-exports, `export type *`, global augmentations. No logic, no conditional exports, no transformations.

### Benchmark Files

Benchmark files under `packages/*/benchmarks/*.bench.ts` are Code: they follow every rule in this guide (double quotes, semicolons, 2-space indentation, no external dependencies without justification). The only relaxation: benchmark files MAY import a benchmark runner (e.g., `mitata`) as a devDependency — the one justified external import for `.bench.ts` files.
