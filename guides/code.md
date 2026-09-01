# Code Style Guide

## Core Philosophy

Performance-critical runtime library. Optimized for execution speed and minimal memory overhead. Every abstraction must earn its cost against the hot path.

## Canonical paths

Every `index.ts` / `lib/` reference in this guide resolves against these locations. Pin them once; do not re-derive per file. The public barrel is `lib/index.ts` — not `packages/[pkg]/index.ts`, which does not exist.

| Artifact | Path | Notes |
|---|---|---|
| Public barrel | `lib/index.ts` | The arbiter of the public surface; read it to decide "is this symbol public?" |
| Public function | `lib/{name}.ts` | filename = export name verbatim |
| JSX/html component | `lib/{Name}.ts` | PascalCase |
| $-ref API | `lib/${name}.ts` | $-prefix |
| Internal helper | `lib/internal/{concern}.ts` | single noun/gerund (`dedupe`, `polling`, `retry`) |
| Public type | `lib/types/*.d.ts` (or `lib/types.d.ts` for single-file packages like core) | wholesale-re-exported via `export type *` |
| Internal type | co-located with owning module | `@internal` if a sibling needs it |
| Tests | `tests/{surface}.test.ts` | surface-named; `.test.ts` is load-bearing |
| Docs | `docs/api/{export}.mdx`, `docs/concepts/{topic}.mdx`, `docs/patterns/{topic}.mdx` | see `docs.md` |
| Build scripts | `scripts/[name].ts`, `scripts/utils/[concern].ts` | see `scripts.md` (build tooling, not runtime) |

## File-placement decision tree

Traverse when deciding where a new symbol lives. Derived from §Package File Structure, §Files, §index.ts Rules.

```
New symbol?
├─ Re-exported by lib/index.ts (public)
│   ├─ Function → lib/{name}.ts (filename = export verbatim)
│   │   ├─ JSX/html component → PascalCase (ForEach.ts)
│   │   └─ $-ref API → $-prefix ($ref.ts)
│   ├─ Type consumers import → lib/types/*.d.ts
│   └─ Barrel re-export from internal/ (utils, env) → stays in lib/internal/, re-exported by index.ts
├─ Not re-exported (internal)
│   ├─ Callable-namespace member impl (@internal, attached via Object.assign in the namespace's file) → lib/{implName}.ts
│   ├─ Helper function / logic → lib/internal/{concern}.ts (single noun/gerund)
│   └─ Internal type → co-located with owning module
└─ A file that seems to need two concerns → split it; the concern is one word
```

## Signature-shape decision tree

Traverse when deciding the shape of a new or changed signature. Derived from §Types, §Naming Conventions.

```
New/changed signature?
├─ Object shape → interface (declaration merging, cleaner errors)
├─ Union / intersection / mapped / conditional → type
├─ Options bag (passed once to a factory) → {Name}Options
├─ Runtime-config bag (shaped over a lifetime) → {Name}Config
├─ Component/element prop bag → {Name}Props (reserved)
├─ Function-valued type → {Name}Fn (pick one suffix per package; never mix Fn/Handler/Callback)
├─ Public overloads → overload signatures before implementation; JSDoc on each overload
└─ Returns or accepts a named shape → reference the type by name, never re-inline
```

## Canonical examples

Pattern-match against these rather than re-deriving from prose. The codebase is the spec; this guide is the index into it.

| Pattern | Reference file |
|---|---|
| Public function with overloads + JSDoc on each | `packages/core/lib/signal.ts` |
| Public function with no value validation (signal takes a value, not a fn) | `packages/core/lib/signal.ts` |
| Public function with input validation (`[core] fn:` throw) | `packages/core/lib/computed.ts`, `effect.ts` |
| Cached `while` loop in a real module | `packages/core/lib/internal/utils.ts` (`objectLoop`) |
| Short internal field names for hidden-class density | `packages/core/lib/signal.ts` (`sbc`, `sbv`, `rs`, `rf`) |
| Public barrel shape (re-exports, `export type *`) | `packages/core/lib/index.ts` |
| Internal modules named by single-noun concern | `packages/core/lib/internal/{propagation,tracking,scheduler,...}.ts` |
| `WeakMap` for element-associated data | `packages/dom/lib/internal/*` |

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
- When extraction is justified, where the extracted helper lives is governed by a placement rule, not familiarity. **Co-locate** a single-caller helper with its caller; place a helper in `lib/internal/` only when it meets one of four criteria: (a) **shared** — ≥2 callers; (b) **reusable concept** — a cohesive noun/gerund concern that earns its own module (`stringify`, `hash`, `objectLoop`); (c) **state-owner** — it gates shared module state (the accessors of a state map, e.g. `scheduleEffect` on the effect queue); (d) **cross-package foundation** — re-exported via an `internal/core.ts` barrel to other packages. A pure, non-state, single-package, single-caller helper parked in `internal/` is a placement violation: `@internal` is a comment, not an access boundary, so promoting a private helper to an `internal/` export widens the package's internal API surface for no reuse benefit and invites cross-module coupling. The discriminator is caller-count and reusability — not "is it exported."
- Arrow functions for inline callbacks and closures; function declarations for top-level named functions
- Function expressions only when the body needs its own `this` or `arguments` binding (method assignments dispatched via `obj.method()`, getter/setter disambiguation via `arguments.length`). Arrows in every other closure case
- Parenthesize single-parameter arrow functions in multi-line bodies and top-level declarations: `(x) => fn(x)` — consistency with multi-param form; bare single-parameter inline callbacks (`cleanup => cleanup()`) are permitted
- Destructure at the top of function scope when accessing 2+ properties: `const { a, b } = obj`
- JSDoc on every function and type. `@internal` for symbols `export`ed from their module but not re-exported by the package's `index.ts` barrel. Non-exported symbols are local — JSDoc only, no `@internal`. Exception: `@hellajs/core`'s `lib/internal/` modules are the shared kernel — symbols exported from them for reuse beyond their own module (e.g. `internal/utils.ts` type guards, `internal/flags.ts` bitflags) are exempt from the `@internal` requirement: the `internal/` path already signals non-public status, and the package's `./*` exports map intentionally exposes them for sibling use. The tag remains required on top-level `lib/*.ts` exports the barrel omits
- Exported `let` / `const` value bindings follow the same JSDoc rule. Mutable exported state (`export let`) documents why mutation is the chosen shape (e.g., "incremented on entry to track nesting depth") so the mutable-export alarm is justified at the declaration site
- Inline comments only for logic requiring 2+ concepts not visible in the current scope — never restate the code. Comments that expand a deliberately-abbreviated internal field name to its meaning are "decoding," not "restating," when the abbreviation is mandated by the performance rule above. Comments restating already-readable code remain prohibited.

### Imports

```typescript
import type { SomeType } from "./types";
import { value } from "./internal/module";
```

- All `import` statements precede every other top-level statement — no `const`, `let`, type alias, or any declaration above the last import. Side-effect imports and bare `import "..."` follow the same rule
- Double quotes for all imports and string literals; semicolons always required
- Enforced by `@stylistic/quotes` in `eslint.config.mjs` (`packages/dom/**`, `plugins/**`) — lint fails on single-quoted string literals
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
- `export type * from "./types"` promotes every type in the file to the public API with no per-type opt-out, so **type visibility is enforced by file location, not annotation**. Types split into two buckets by where the file sits: **global/public types are grouped in the `lib/types/*.d.ts` declaration file(s)** a package's `index.ts` reaches via `export type *` (the wholesale-exported surface); **internal types are co-located with the code they relate to** in the `lib/internal/` module that owns them — exported with `@internal` if a sibling internal module needs them, or not exported at all if local. There is no catch-all `lib/internal/types.ts`: a type lives next to the implementation that introduces it, even when more than one internal module reads it (the owning module exports it `@internal`; the others import from there). `@internal` on a type *inside* a wholesale-re-exported `.d.ts` is contradictory and decorative: TypeScript only strips `@internal` when emitting `.d.ts` from `.ts`, and these type files are hand-written declarations (the source of truth), so the annotated type ships in the public surface regardless. Move the type to the internal module that owns it instead of annotating around the leak. `@internal` retains its meaning from Functions & Modules (a symbol exported from its module but not re-exported by `index.ts`) for value symbols, and for internal types once they sit in their owning module. The visibility audit script (`scripts/type-visibility.ts`, wired as `bun visibility`) mechanically flags any `@internal`-tagged type sitting in a wholesale-exported file

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

`.forEach` does not allocate a per-iteration iterator object (Array methods iterate via internal slots) and is permitted on cold paths (e.g. disposal). The `for…of`/`for…in` ban is unconditional — both allocate an iterator object per iteration — not a hot-path-only rule; cold-path iteration uses the iterator-free forms (`.forEach`, cached `while`), never `for…of`/`for…in`.

`for await…of` is permitted to consume async iterables/generators — async iteration has no iterator-free form, and the manual `while`/`await gen.next()` alternative loses `return()`/`throw()` correctness and stream-cancellation integration.

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

### Type guards

- In `packages/*/lib`, type discrimination uses core's guards — `isString`, `isNumber`, `isBoolean`, `isFunction`, `isObject`, `isPlainObject`, `isNull`, `isFalsy` — imported via the package's `lib/internal/core.ts` shim. No raw `typeof`-vs-literal comparisons. Shim grows only what the package uses.
- Guard predicates narrow by assignability, not typeof-kind: on typed unions whose function arm has specific params (`T | ((old: T | undefined) => T)`), `isFunction` cannot filter the union — cast the narrowed arm to its specific signature (`(updater as (old: T | undefined) => T)(oldData)`). To discriminate a function-vs-spec-object union by shape, use `"handler" in x` — no core guard narrows it (`EventListener` is assignable to `object` and survives `isFunction`'s false branch).

Guard choice by raw form:

| Raw form | Guard form |
|---|---|
| `typeof x === "string"` / `!==` | `isString(x)` / `!isString(x)` |
| `typeof x === "number"` | `isNumber(x)` |
| `typeof x === "boolean"` | `isBoolean(x)` |
| `typeof x === "function"` | `isFunction(x)` |
| `x !== null && typeof x === "object"` (either order) | `isObject(x)` |
| `typeof x !== "object" \|\| x === null` | `!isObject(x)` |
| guard-shaped `x === null` / `!== null` on identifiers/members | `isNull(x)` / `!isNull(x)` |
| `v === false \|\| v === null \|\| v === undefined` | `isFalsy(v)` (exactly `false\|null\|undefined` — only when the domain can't make `isFalsy`'s `false` arm differ) |
| `x === null \|\| x === undefined \|\| typeof x !== "string"` | `!isString(x)` — null/undefined disjuncts absorbed by guard negation |

Stays raw (each named with its reason):

- `x === undefined` / `x !== undefined` — the preferred form; `isUndefined` is deliberately unexported
- loose `== null` / `!= null` — null-or-undefined semantics; no guard equivalent
- regex-exec loops (`while ((match = R.exec(s)) !== null)`) — idiom, not a guard
- `typeof` in error-message interpolation (`received ${typeof x}`) — the message, not a guard
- `switch (typeof x)` discriminants and factored discriminant locals (`const t = typeof x` then `t === "string"`) — one typeof read, many comparisons
- type positions (`ReturnType<typeof setTimeout>`, `as typeof x.props`) — not runtime code

Exemptions (architecturally forced, not style calls):

- **ssr** — zero runtime imports by design (only `import type` from `@hellajs/dom`); its raw typeof sites stay
- **build-time plugins** (`plugins/**`) and `scripts/` — no `@hellajs/core` dependency; typeof discriminates Babel AST nodes / build metrics
- **core's own `lib/internal/utils.ts` + `lib/internal/env.ts`** — they are the guards/probes

Enforcement: eslint `no-restricted-syntax` (eslint.config.mjs) bans the typeof forms in `packages/*/lib`; `isNull`/`isFalsy` conversions are prose-enforced (audited via the checklist).

### Error Handling

- Public API functions validate inputs — they do not trust their callers. On invalid input, throw an `Error` with a `[package] fn: <constraint>, received <value>` message (e.g., `[dom] ForEach: each is required`); never silently coerce
- Document every thrown error with a `@throws {Error} When <condition>.` JSDoc tag. The condition is the useful part; the message shape stays governed by the bullet above (do not duplicate the full message in the tag). Place the tag on the signature the consumer calls: the function declaration for non-overloaded functions, each public overload signature for overloaded functions, or the interface method for object-typed singletons (e.g. `resourceCache`'s `ResourceCache` methods, `Resource.setData`)
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
- **No `__` (double-underscore) prefixes** on internal marker properties — use the bare word: `raw`, not `__raw`; `static`, not `__static`. The `__` reads as compiler-magic and obscures intent. When a bare word collides with a real HTML attribute on the same object (`scope` clashes with `<th scope>`), rename to a non-colliding word instead of re-adding `__`.

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

- (Pascal|Camel)case, no hyphens: `signal.ts`, `removeCss.ts`, `ForEach.ts` — not `app-context.ts`
- One public API function per file. The filename is the verbatim export name: `signal.ts` exports `signal`, `removeCss.ts` exports `removeCss`, `cssVars.ts` exports `cssVars`. No "related pair" or "multi-word noun shortcut" carve-outs — `css`/`removeCss`/`resetCss` are three files, and `cssVars`/`removeCssVars`/`resetCssVars` are three more. One export per file is what makes the public surface scannable and lets the audit be checked mechanically
- Files under `lib/internal/` are organized by cohesive concern rather than a single public API, so the one-export-per-file and filename-matches-export rules apply only to top-level `lib/*.ts`, not to `internal/`. Name an internal file after its concern as a single noun or gerund (`core`, `dedupe`, `errors`, `lifecycle`, `polling`, `retry`) — never a camelCase compound derived from the export it hosts. The concern is one word; if it seems to need two, the file is either two concerns (split it) or a single concept not yet named. A file exporting `structuralShare` is `structural.ts`, not `structuralShare.ts`
- PascalCase for JSX/html component filenames that match their export: `ForEach.ts` exports `ForEach`, `Portal.ts` exports `Portal`. Required for JSX component resolution
- `$`-prefixed names for special reference APIs: `$ref.ts` exports `$ref`, `$collection.ts` exports `$collection`. The `$` prefix signals a DOM reference utility

## File and Function Size

- **Functions**: soft limit under 80 lines. If a function exceeds 80 lines, look for natural split points without violating the No Single Use Functions rule
- **Files**: soft limit under 300 lines. If a file exceeds 300 lines, split internal helpers into sub-modules without violating the No Single Use Functions rule. Judge per-file, not as a blanket allowance
- `.d.ts` type declaration files are exempt from the 300-line limit when they contain cohesive type definitions — element attribute maps, event maps, mapped types, computed type derivations (e.g., prefix-variant types derived from core attributes via mapped types) — where splitting across files would harm discoverability, usability, or type inference quality. Hand-expansion of mapped types is prohibited
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

**Exception — callable-namespace member impls.** A member implementation attached to a callable-namespace export (`ssr` → `ssr.async`/`ssr.stream`) lives at top level as `lib/{implName}.ts` (filename = the impl function name, e.g. `ssrAsync.ts`), exported `@internal` and attached via `Object.assign` in the namespace's own file — not under `lib/internal/`. The file maps one-to-one onto a documented member of the public interface (the namespace's type declares it), and relocating it orphans the per-file coverage mapping and any parity comments co-located with the member. One-export-per-file and filename-matches-export still apply.

### `index.ts` Rules

Named re-exports, `export type *`, global augmentations. No logic, no conditional exports, no transformations.

### Benchmark Files

Benchmark files under `packages/*/benchmarks/*.bench.ts` are Code: they follow every rule in this guide (double quotes, semicolons, 2-space indentation, no external dependencies without justification). The only relaxation: benchmark files MAY import a benchmark runner (e.g., `mitata`) as a devDependency — the one justified external import for `.bench.ts` files.

## Verification Checklist

Run this when holding a Code file (`.ts` / `.tsx` / `.mjs` under `lib/`, `scripts/`, `plugins/`). Each item is a yes/no or a command. This is the audit floor stated where the rules live; the audit skill reads it instead of reconstructing it from prose.

**Structure**
- [ ] File sits at the right path per the File-placement decision tree
- [ ] One public export per `lib/*.ts` file; filename matches the export name verbatim
- [ ] Internal-only files live under `lib/internal/` (not at the top level — exception: callable-namespace member impls stay at `lib/{implName}.ts`)
- [ ] Internal module named by a single noun/gerund concern
- [ ] Public types live in `lib/types/*.d.ts`; internal types co-located with their owning module

**Imports**
- [ ] All `import` statements precede every other top-level statement
- [ ] `import type` separated; never inline `type` in a value import
- [ ] Double quotes; semicolons always
- [ ] No external runtime dependency (type-only from `.d.ts`-only packages is the exception)

**Types**
- [ ] `interface` for object shapes; `type` for unions/mapped/conditional
- [ ] No `any` (`unknown` only)
- [ ] No `@internal` on a type inside a wholesale-exported `.d.ts` (decorative — move the type instead)
- [ ] Named shape referenced by name at every signature, never re-inline
- [ ] Type checks use core's guards via the package shim — no raw `typeof`-literal comparisons in `lib/` (exempt: ssr, build-time plugins/scripts, core's own `utils.ts`/`env.ts`; `=== undefined`, loose `== null`, regex-exec loops stay raw)

**Naming**
- [ ] Public functions single-word; components PascalCase; `$`-ref APIs `$`-prefixed
- [ ] camelCase variables; UPPER_SNAKE_CASE immutable config constants; `is`/`has` booleans
- [ ] Verb-first internal names; `Fn` suffix consistent within a package
- [ ] `Options` vs `Config` vs `Props` chosen by what the fields do, not familiarity

**Functions & JSDoc**
- [ ] JSDoc on every function and type; `@internal` where exported but not re-exported by `lib/index.ts` (core `lib/internal/` shared-kernel exports exempt — §Functions & Modules)
- [ ] No wrapper functions that only forward (exception: overload implementations)
- [ ] No single-callsite helper under 30 lines
- [ ] Extracted helpers in `lib/internal/` meet one of the four placement criteria (shared ≥2 callers / reusable concept / state-owner accessor / cross-package foundation); pure single-caller helpers are co-located, not internalized
- [ ] No parameter added just to pass it through unchanged

**Loops & memory**
- [ ] Cached `while` loops; no `for…of` / `for…in` anywhere (iterator-allocating forms are banned unconditionally; `.forEach` only on cold paths; `for await…of` permitted for async iterables/generators)
- [ ] No collection reallocation where `.clear()` or reference swap works
- [ ] No `bare l` for cached length (always `len` or `<prefix>Len`)

**Errors**
- [ ] Public functions validate inputs with `[package] fn: <constraint>, received <value>` messages
- [ ] Internal functions do not guard
- [ ] No broad `catch {}` swallowing unknown errors

**Toolchain**
- [ ] `bun coverage <package>` exits 0
- [ ] `bun lint` exits 0

## Config Verification Checklist

Run this when holding a Config file (`tsconfig*.json`, `eslint.config.*`, `package.json`, `bunfig.toml`, `.npmrc`, `.nvmrc`, `*.config.{ts,mjs,js}`, files under `plugins/**/{babel,rollup,vite}/`). Config answers to different rules than the code beside it — these are the checks that catch drift the compiler cannot.

**TypeScript configs**
- [ ] `tsconfig*` keeps `strict: true` or stronger; nothing was weakened
- [ ] Path mappings (`paths`) match the actual package layout (`@hellajs/{pkg}` → `packages/{pkg}/lib/index.ts`)
- [ ] `include` covers every file type the lint should see; `exclude` drops `dist/` + `node_modules/`
- [ ] No `any`-enabling flags (`noImplicitAny: false`, `suppressImplicitAnyIndexErrors`)

**ESLint config**
- [ ] No rule contradicts this guide (banning double quotes, allowing missing semicolons, permitting `any`)
- [ ] `@stylistic/quotes` enforces double quotes
- [ ] Plugin refs resolve (no orphaned/deleted plugin still referenced)

**package.json**
- [ ] Every `scripts` entry referenced by a workflow (`.github/workflows/`) or another script still exists and still does what its callers expect
- [ ] No new runtime dependency without justification (type-only `.d.ts` packages are the exception, per §Imports)
- [ ] `exports` map matches the actual `dist/` output after bundling
- [ ] `workspaces` covers `packages/*` and `plugins/*`

**Build plugin configs** (`plugins/{babel,rollup,vite}/`)
- [ ] Exported hook shape matches its stated purpose and runtime
- [ ] Wrapper thinness: the rollup/vite plugins forward to the babel plugin, not re-implement it

**Toolchain**
- [ ] `bun coverage` exits 0 for every package the change touches
- [ ] `bun lint` exits 0
- [ ] `bun bundle <package>` succeeds if build tooling changed
