# Package Code Style Guide

Cross-package source code conventions. New code must follow these rules.

## File Organization

- `lib/index.ts` — Pure re-export barrel. Named re-exports, `export type *`, global augmentations, testing utilities. No logic.
- `lib/types.d.ts` — All interfaces, type aliases, and utility types. Separate `.d.ts` so types are importable without side effects.
- `lib/{feature}.ts` — One primary export per file. Private helpers co-located. File named to match the export.
- `lib/internal/` — Implementation details not exported from index. Public modules import from here; internal modules import from other internals. Never the reverse.
- `tests/` — Test files. `utils/` for test helpers.

Cross-package dependencies go through the package's own `internal/core.ts` barrel, never directly from the external package.

## Imports

Order: external packages → internal modules → type-only imports. Always `import type { ... }` for types. Relative paths only within a package. Break circular dependencies with lazy callbacks.

## Exports

Named exports only. No default exports. Overloaded signatures use TypeScript declaration merging in the same file.

## Naming

- **Functions**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants (flags, regex, sentinels)**: `UPPER_SNAKE`
- **All other module-level values**: `camelCase`
- **Boolean variables/signals**: `is`/`has` prefix
- **Private helpers**: `camelCase`, no underscore prefix

### Abbreviations

Only these: 
- `fn` (function param),
- `cb` (callback),
- `len` (cached loop length),
- `el` (element in tests/local scope),
- `idx` (index when `i` taken),
- `prev`/`curr`/`next` (linked structure pointers). No others.

### Verb Prefixes

- Registration: `add` (`addEffect`, `addHook`, `addEvent`)
- Removal: `remove` (`removeLink`, `removeDirectHandlers`)
- Resolution: `resolve` (`resolveNode`, `resolveValue`)
- Disposal: `dispose` (`disposeEffect`)
- Reset/clear: `reset`/`clear` (`resetQueue`, `cleanupVarsEffects`)

## TypeScript

- `interface` for all object shapes. `type` for unions, intersections, mapped types, conditional types, utility types.
- Generic parameters: `<T>` data type, `<K>` key type, `<R>` return type. Constrain with `extends` when the function requires it.
- Overload signatures before the implementation. Implementation signature covers all overloads with union/optional types. Internal functions use a single signature.
- Ambient declarations (`declare global`) in `index.ts` only.
- `readonly` on config properties that must not mutate after creation.
- Arrow function type guards with explicit `value is Type` return type.

## Code Style

- No semicolons. No trailing commas. Single quotes.
- Arrow functions for inline callbacks and closures. Function declarations for top-level named functions.
- Parenthesize single-parameter arrow functions: `(x) => ...`
- Guard clauses at top of functions. Early return for edge cases.
- Ternary for conditional values. Short-circuit `&&` for conditional side effects.
- `try/finally` for cleanup. `try/catch` for user-provided callbacks.
- Labeled loops only for nested break/continue.
- Destructure at the top of function scope when accessing 2+ properties. Always `const { a, b } = obj`, never separate declarations.

## Loops

`while` with cached length everywhere:

```typescript
let i = 0
const len = arr.length
while (i < len) {
  // ...
  i++
}
```

No `for...of`, no `.forEach()`, no `Object.entries()` in source code. Use `Object.keys()` + `while` for object iteration. Use early `continue`/`break` to skip iterations.

## State Machines

Numeric bitmask constants (`UPPER_SNAKE`). Bitwise ops: `&` to check, `|` to set, `& ~` to clear. Group flags in a single module.

## Context Management

Module-level mutable variable for current context. `set`/`get` functions — never export the variable directly. Save and restore in `try/finally`.

## Queues

Array-based with index tracking. Clear slots after processing. Reset indices in bulk. Guard re-entrant processing with a boolean flag.

## Caching

- Object keys → `WeakMap`. String/number keys → `Map`.
- Deterministic stringify (sorted keys) for hash-based memoization.
- Reference counting with eviction at zero.
- Cache entries store all TTL and LRU metadata.

## Error Handling

- `try/catch` around all user-provided callbacks.
- Log errors. Never swallow silently.
- Transform raw errors into structured objects with `message`, `category`, and optional metadata.
- Cleanup in `finally` blocks.

## Memory

- Swap collection references instead of reallocating.
- `.clear()` and `.length = 0` instead of new instances on long-lived references.
- `WeakMap`/`WeakSet` for element-associated data.
- Lazy-allocate Sets and Maps on first use.
- Store cleanup functions, call in bulk on disposal.
- Frozen empty objects and shared no-op functions for empty/initial states.

## Fast Paths

Common case first, early return. Separate "first render" from "update" when update has overhead. Skip on empty/unchanged with cheap checks (length, `===`).

## Deferral

- `queueMicrotask` — defer to end of current microtask queue (e.g., initial route resolution).
- `setTimeout(fn, 0)` — defer to next macrotask (e.g., non-blocking cleanup, mount queue).
- Guard redundant scheduling with a boolean flag.

## DOM

- `DocumentFragment` for batch insertions.
- Comment nodes as boundary markers for reactive zones.
- `isConnected` + `parentNode` checks before cleanup.
- Iterative stack-based traversal for deep trees, never recursion.
- Cache DOM queries when the result is stable.

## Reactive Wrappers

Return an object with chainable methods (`bind`, `on`, `hooks`). Each method returns `this`. Queue operations when target doesn't exist; flush on appearance. Tie effect disposal to element lifecycle via the registry.

## Passthrough Components

Return a function that accepts a parent element. Attach `isDynamic = true`. The mount system checks this flag. Never wrap with component scope — these manage their own lifecycle.

## Dual-Path APIs

Detect reactivity eagerly (check for function values). Static path: hash cache, return immediately. Reactive path: run synchronously first, then create effect. Both paths produce identical output shape.

## JSDoc

Every exported function gets a JSDoc block. No JSDoc on internal helpers (type guards, simple getters/setters).

```typescript
/**
 * One-line description in present tense.
 * @template T
 * @param paramName Description (omit if self-documenting)
 * @returns Description (omit if obvious from return type)
 */
```

Never repeat the function name. Never use past tense.

## Truthiness

- Null/undefined check: `== null`
- Specific null or undefined: `!== undefined` or `!== null`
- Render-as-empty (false, null, undefined): `isFalsy`
- Boolean coercion: never `!!`. Use explicit comparison
- Property existence: `Object.hasOwn()`
- Interface duck-typing: `in` operator
- Property storage: `Object.defineProperty`
- Property cleanup: `delete`