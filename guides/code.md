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

Performance wins over DRY when extracting a helper adds overhead to a hot path. Correctness wins over performance when a fast path would produce stale state.

## Code Rules

Hard rules. Never deviate from these.

### Functions & Modules

- Export functions in place — never define then export separately
- Never re-export imports — each module exports only its own code. Exception: `internal/core.ts` barrel re-exports from `@hellajs/core` for dependency isolation and bundle optimization
- Never create wrapper functions that only call through to another function
- Never add a parameter just to pass it through unchanged
- Never extract a function called from exactly one callsite unless it exceeds 30 lines
- Arrow functions for inline callbacks and closures. Function declarations for top-level named functions
- Parenthesize single-parameter arrow functions: `(x) => fn(x)` — consistency with multi-param form
- Destructure at the top of function scope when accessing 2+ properties. Always `const { a, b } = obj`
- JSDoc on every function and type. `@internal` for symbols that are `export`ed from their module but not re-exported by the package's `index.ts` barrel. Symbols declared without `export` are purely local — they need JSDoc but not `@internal`.
- Inline comments only for logic requiring 2+ concepts not visible in the current scope — never restate the code

### Imports

```typescript
import type { SomeType } from "./types"
import { value } from "./internal/module"
```

- Separate `import type` for all type-only imports — never inline `type` in a value import
- Import only what each file uses
- No external dependencies

### Types

- `interface` for object shapes (declaration merging, cleaner errors)
- `type` for unions, intersections, mapped, conditional, utility types
- Never use `any` — use `unknown` if the type is truly unknown
- Never guard with a type check the type system already excludes
- `readonly` on config properties that must not mutate after creation
- Arrow function type guards with explicit `value is Type` return type
- `<T>` data type, `<K>` key type, `<R>` return type
- Constrain with `extends` only when the function requires it
- Overload signatures before the implementation; implementation signature covers all overloads with union/optional types. Internal functions use a single signature — overloads are a public API concern
- JSDoc repeated on every overload signature; implementation gets `@internal` if not exported
- Use `Object.hasOwn(obj, key)` for own-property checks — never `in` (traverses prototype chain) or `.hasOwnProperty` (can be shadowed). `Object.hasOwn` is the safe, performant, and consistent choice.

### Loops

Cached `while` loops only. `for...of` and `for...in` create iterator objects per iteration, adding GC pressure.

```typescript
let i = 0
const len = arr.length
while (i < len) {
  i++
}
```

`Map` iteration follows the same pattern. A single `Array.from` allocation amortizes the iterator-object cost and is preferred over per-iteration `for...of` for long-lived or hot traversals:

```typescript
const entries = Array.from(map.entries())
let i = 0
const len = entries.length
while (i < len) {
  const [key, value] = entries[i]
  i++
}
```

### Memory

- Never allocate new collections in hot paths when `.clear()` or reference swapping works
- Swap collection references instead of reallocating — avoids GC pressure from discarded collections
- `.clear()` and `.length = 0` instead of `new Map()` / `new Array()` on long-lived references
- `WeakMap`/`WeakSet` for element-associated data — auto-GC when elements are removed
- Lazy-allocate Sets and Maps on first use — avoid allocating empty collections that may never be populated
- Store cleanup functions, call in bulk on disposal — avoids cleanup-per-item overhead
- Frozen empty objects and shared no-op functions for empty/initial states — single allocation, zero per-instance cost

**Batched writes** — coalesce multiple mutations to a single sink (a style element, a queue) behind a dirty flag flushed via `queueMicrotask`. This batches work within a synchronous tick and runs before paint. Reset the flag at the start of the flush so subsequent ticks can re-arm it. Drop the pattern entirely when the sink supports surgical, allocation-free updates (e.g. CSSOM `insertRule`/`deleteRule`) — batching exists to amortize O(n) rewrites, not to wrap O(1) ops.

### Conditions

- Early returns to avoid deep nesting — flat code is easier to reason about
- Never nest ternary expressions
- Never use ternary for branches with side effects
- Ternary for single-expression branches only
- Prefer early returns over nested ternaries for multi-branch logic with side effects:

### Error Handling

- Public API functions validate inputs — they do not trust their callers
- Internal functions do not guard — they trust their callers. Guards on internal functions are dead branches
- Exception: functions invoked by the platform (MutationObserver callbacks, event listeners, Promise `.then`/`.catch` continuations, `setTimeout` callbacks) receive untrusted inputs and may guard. These callbacks are not called by trusted internal callers — they are invoked by the runtime with whatever the DOM or Promise machinery provides.
- Platform APIs that throw recoverably on known-benign conditions (e.g. an invalidated CSSOM rule) may catch narrowly, but the catch block must (a) name the specific condition in a comment, (b) never catch broadly with an untyped `catch {}` that hides unrelated failures, and (c) prefer logging in development over a bare `/* ignore */`. Broad catches that swallow unknown errors are still prohibited.
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

  Never use bare `l` for cached length — it is visually indistinct from `1` and `I`. Always `len` (single loop) or the `<prefix>Len` form (`kLen`, `fLen`) for nested loops.

- Nested-loop index variables use a single-letter prefix matching the collection being iterated, followed by `i`: `ki` (key index), `fi` (field index), `ci` (child index), etc. The corresponding cached length uses the same prefix with `Len`: `kLen`, `fLen`, `cLen`. This convention applies only when `i` is already in scope from an outer loop; a single loop in a function always uses plain `i` and `len`.

  Internal state fields may use shorter names (2-3 chars) for V8 hidden class density — an intentional performance trade-off, not a general pattern.

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

### Files

- Single word, lowercase: `context.ts`, `core.ts`
- Avoid hyphens: not `app-context.ts`, `direct-events.ts`
- Public API file name matches the export name: `signal.ts` exports `signal`
- Closely related function pairs sharing a single API surface (e.g., `css`/`cssRemove`, `registerMultiOp`/`unregisterMultiOp`, `startTracking`/`endTracking`) may share a file when splitting would harm usability. The file name should match the primary function
- PascalCase for JSX/html component filenames that match their export: `ForEach.ts` exports `ForEach`, `Portal.ts` exports `Portal`. Required for JSX component resolution
- `$`-prefixed names for special reference APIs: `$ref.ts` exports `$ref`, `$collection.ts` exports `$collection`. The `$` prefix signals a DOM reference utility

## File and Function Size

- **Functions**: Under 80 lines. If a function exceeds 80 lines, look for natural split points (don't violate the No Single Use Functions rule)
- **Files**: Under 300 lines. If a file exceeds 300 lines, split internal helpers into sub-modules
- `.d.ts` type declaration files are exempt from the 300-line limit when they contain cohesive type definitions — including element attribute maps, event maps, mapped types, and computed type derivations (e.g., `bind:*` variants derived from core attributes via mapped types) — where splitting across files would harm discoverability, usability, or type inference quality. Hand-expansion of mapped types is prohibited.
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
  internal/          # Not exposed to users
  types/             # Global type declarations (always use .d.ts)
  [file].ts          # Public API — one function per file, filename matches export name
  index.ts           # Pure re-export barrel only
```

### `index.ts` Rules

Named re-exports, `export type *`, global augmentations. No logic, no conditional exports, no transformations.