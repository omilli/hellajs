# Code Style Guide

## Core Philosophy

Performance-critical runtime library. Every abstraction must earn its cost against the hot path.

## Canonical paths

Every `index.ts` / `lib/` reference resolves against these locations. The public barrel is `lib/index.ts` — not `packages/[pkg]/index.ts`, which does not exist.

| Artifact | Path | Notes |
|---|---|---|
| Public barrel | `lib/index.ts` | Arbiter of the public surface — read it to decide "is this symbol public?" |
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
| Internal modules named by single-noun concern | `packages/core/lib/internal/{tracking,scheduler,...}.ts` |
| `WeakMap` for element-associated data | `packages/dom/lib/internal/*` |

## Decision Precedence

1. **Correctness** — glitch-free updates, no memory leaks, no stale state
2. **Performance** — fast paths, minimal allocations, cached loops
3. **Backward compatibility** — public API stability, no silent breakage
4. **Clarity** — readable by a human unfamiliar with the codebase
5. **Brevity** — less code, fewer files, fewer abstractions

Performance beats DRY when extracting a helper adds hot-path overhead. Correctness beats performance when a fast path would produce stale state.

## Code Rules

### Functions & Modules

- Export functions in place — never define then export separately
- Never re-export imports — each module exports only its own code. Exception: `internal/core.ts` barrels re-export from `@hellajs/core` for dependency isolation and bundle optimization. No transitional deprecation aliases — a breaking rename breaks cleanly: delete the old name, never shim it
- Never create wrapper functions that only call through. Exception: TypeScript overload implementations — public overload signatures on one function forwarding to an internal factory; the forwarding body adds no logic beyond argument forwarding
- Never add a parameter just to pass it through unchanged
- Never extract a function called from exactly one callsite unless it exceeds 30 lines
- **Extracted-helper placement** — co-locate a single-caller helper with its caller; place a helper in `lib/internal/` only when it meets one of: (a) **shared** — ≥2 callers; (b) **reusable concept** — a cohesive noun/gerund concern earning its own module (`stringify`, `hash`, `objectLoop`); (c) **state-owner** — gates shared module state (e.g. `scheduleEffect` on the effect queue); (d) **cross-package foundation** — re-exported via an `internal/core.ts` barrel. A pure, non-state, single-package, single-caller helper in `internal/` is a placement violation: `@internal` is a comment, not an access boundary — promoting a private helper widens the internal API surface for no reuse benefit. The discriminator is caller-count and reusability, not "is it exported"
- Arrow functions for inline callbacks and closures; function declarations for top-level named functions
- Function expressions only when the body needs its own `this`/`arguments` binding (method assignments via `obj.method()`, arity disambiguation via `arguments.length`); arrows everywhere else
- Parenthesize single-parameter arrows in multi-line bodies and top-level declarations (`(x) => fn(x)`); bare single-param inline callbacks (`cleanup => cleanup()`) permitted
- Destructure at the top of function scope when accessing 2+ properties
- JSDoc on every function and type. `@internal` for symbols `export`ed from their module but not re-exported by the package's `index.ts`. Non-exported symbols are local — JSDoc only. Exception: `@hellajs/core`'s `lib/internal/` modules are the shared kernel — symbols exported for sibling reuse (`internal/utils.ts` type guards, `internal/flags.ts` bitflags) are exempt (the `internal/` path already signals non-public; the `./*` exports map intentionally exposes them). The tag remains required on top-level `lib/*.ts` exports the barrel omits
- Exported `let`/`const` follow the same JSDoc rule. Mutable exported state (`export let`) documents why mutation is the chosen shape
- Inline comments only for logic requiring 2+ concepts not visible in scope — never restate the code. Expanding a deliberately-abbreviated field name is "decoding," not "restating," when the abbreviation is mandated by the performance rule

### Imports

```typescript
import type { SomeType } from "./types";
import { value } from "./internal/module";
```

- All `import` statements precede every other top-level statement (side-effect imports included)
- Double quotes for all imports and string literals; semicolons always — enforced by `@stylistic/quotes` in `eslint.config.mjs` (`packages/dom/**`, `plugins/**`)
- Separate `import type` for all type-only imports — never inline `type` in a value import
- Import only what each file uses
- No external runtime dependencies. Exception: type-only imports from `.d.ts`-only packages declared as an intentional `dependency` (types erase at compile time, zero bundle weight — `import type * as CSS from "csstype"` in `packages/css/lib/types.d.ts` is canonical)

### Types

- `interface` for object shapes; `type` for unions, intersections, mapped, conditional, utility types
- Never `any` — `unknown` if truly unknown
- Never guard with a type check the type system already excludes
- `readonly` on config properties that must not mutate after creation
- Arrow function type guards with explicit `value is Type` return type
- `<T>` data type, `<K>` key type, `<R>` return type; `extends` constraints only when required
- Overload signatures before the implementation; the implementation signature covers all overloads with union/optional types. Internal functions use a single signature — overloads are a public API concern
- JSDoc on every overload signature. When the implementation signature is the exported function itself (single `export function` body after the overloads), no separate implementation JSDoc — the overloads carry the public documentation; a separate non-exported implementation gets `@internal`
- `Object.hasOwn(obj, key)` for own-property checks — never `in` (prototype chain) or `.hasOwnProperty` (shadowable)
- A named type is the source of truth for its shape: reference it by name at every signature, never re-inline — inlined duplicates drift
- **Type visibility is enforced by file location, not annotation.** `export type * from "./types"` promotes every type in the file to the public API with no per-type opt-out. Public types live in the `lib/types/*.d.ts` files the barrel reaches via `export type *`; internal types are co-located with the code that owns them — exported `@internal` if a sibling module needs them, unexported if local. There is no catch-all `lib/internal/types.ts`: a type lives next to the implementation that introduces it (owning module exports it `@internal`; others import from there). `@internal` on a type *inside* a wholesale-re-exported `.d.ts` is contradictory and decorative — TypeScript strips `@internal` only when emitting `.d.ts` from `.ts`, and these hand-written declarations are the source of truth, so the annotated type ships public regardless: move the type to its owning internal module instead. `scripts/type-visibility.ts` (`bun visibility`) mechanically flags the violation

### Loops

Cached `while` loops are the canonical form in `lib/` and `scripts/`. `for...of` and `for...in` are banned **unconditionally** — both allocate an iterator object per iteration (GC pressure); the ban is not hot-path-only. Classic index `for` allocates no iterator and is permitted in benchmarks and test harnesses. Cold-path iteration uses iterator-free forms (`.forEach` allocates no per-iteration iterator; permitted on cold paths like disposal). `for await…of` is permitted to consume async iterables/generators — no iterator-free form exists, and the manual `while`/`await gen.next()` loses `return()`/`throw()` correctness.

```typescript
let i = 0
const len = arr.length
while (i < len) {
  i++
}
```

`Map` iteration: a single `Array.from(map.entries())` amortizes the iterator cost; plain objects: materialize own keys once with `Object.keys()` (never `for...in` — traverses the prototype chain):

```typescript
const entries = Array.from(map.entries())
let i = 0
const len = entries.length
while (i < len) {
  const [key, value] = entries[i]
  i++
}
```

`Object.entries()` over `Object.keys()` only when both key and value are needed — the `[key, value]` destructure replaces the indexed lookup.

### Memory

- Never allocate new collections in hot paths when `.clear()` or reference swapping works; swap references instead of reallocating
- `.clear()` / `.length = 0` on long-lived references; `WeakMap`/`WeakSet` have no `.clear()` — on full reset, reassign a new instance to a `let` binding (the documented exception to the swap rule)
- `WeakMap`/`WeakSet` for element-associated data — auto-GC with the element
- Lazy-allocate Sets/Maps on first use; frozen empty objects and shared no-ops for initial states
- Store cleanup functions, call in bulk on disposal

**Batched writes** — coalesce multiple mutations to a single sink (style element, queue) behind a dirty flag flushed via `queueMicrotask` (within a tick, before paint; reset the flag at flush start so later ticks re-arm). Drop the pattern when the sink supports surgical allocation-free updates (CSSOM `insertRule`/`deleteRule`) — batching amortizes O(n) rewrites, never wraps O(1) ops.

### Conditions

- Early returns — flat code
- Never nest ternaries; never ternary for branches with side effects; single-expression branches only

### Type guards

- In `packages/*/lib`, discrimination uses core's guards — `isString`, `isNumber`, `isBoolean`, `isFunction`, `isObject`, `isPlainObject`, `isNull`, `isFalsy` — via the package's `lib/internal/core.ts` shim (grows only what the package uses). No raw `typeof`-vs-literal comparisons
- Guards narrow by assignability, not typeof-kind: on typed unions whose function arm has specific params (`T | ((old: T | undefined) => T)`), `isFunction` cannot filter — cast the narrowed arm to its signature. To discriminate a function-vs-spec-object union by shape, use `"handler" in x` (`EventListener` is assignable to `object` and survives `isFunction`'s false branch)

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

Stays raw (each with its reason):

- `x === undefined` / `!== undefined` — preferred form; `isUndefined` deliberately unexported
- loose `== null` / `!= null` — null-or-undefined semantics; no guard equivalent
- regex-exec loops (`while ((match = R.exec(s)) !== null)`) — idiom, not a guard
- `typeof` in error-message interpolation — the message, not a guard
- `switch (typeof x)` discriminants and factored discriminant locals (`const t = typeof x; t === "string"`) — one typeof read, many comparisons
- type positions (`ReturnType<typeof setTimeout>`) — not runtime code

Exemptions (architecturally forced):

- **ssr** — zero runtime imports by design (only `import type` from `@hellajs/dom`); raw typeof stays
- **build-time plugins** (`plugins/**`) and `scripts/` — no `@hellajs/core` dep; typeof discriminates AST nodes / build metrics
- **core's own `lib/internal/utils.ts` + `env.ts`** — they are the guards/probes

Enforcement: eslint `no-restricted-syntax` bans the typeof forms in `packages/*/lib`; `isNull`/`isFalsy` conversions are prose-enforced (audited via the checklist).

### Error Handling

- Public API functions validate inputs — they do not trust callers. On invalid input throw `Error` with `[package] fn: <constraint>, received <value>` (e.g. `[dom] ForEach: each is required`); never silently coerce
- Document every thrown error with `@throws {Error} When <condition>.` on the signature the consumer calls (function declaration; each public overload; interface method for object singletons — `resourceCache`'s methods, `Resource.setData`). The condition is the useful part; don't duplicate the full message
- Internal functions do not guard — they trust their callers; guards on internal functions are dead branches. Exceptions: (a) platform-invoked functions (MutationObserver callbacks, event listeners, Promise continuations, `setTimeout`) receive untrusted input from the runtime, not a trusted caller; (b) state an external actor can mutate out-of-band (a store's function-writable slots) reaches internal functions unvalidated — a guard over it is a live branch: throw when it surfaces a public contract (`[store] update: settable key … must hold a signal`, the readonly guard's `[store] readonly key`) and document on the public `@throws`
- Platform APIs that throw recoverably on known-benign conditions (an invalidated CSSOM rule) may catch narrowly: name the specific condition in a comment; never a broad untyped `catch {}` hiding unrelated failures; prefer logging in development over a bare `/* ignore */`. Broad catches swallowing unknown errors remain prohibited
- `try...catch` only when the operation can genuinely fail at runtime
- Throw specific messages naming the invalid value and the violated constraint; never silently swallow — handle, rethrow, or log

### Mutation vs Immutable

- Hot-path internal state: direct mutation (allocation-free)
- Public API surface: new references where semantically appropriate

## Naming Conventions

### Variables

- **camelCase** variables; **UPPER_SNAKE_CASE** immutable configuration constants — primitives, frozen objects, regex patterns, bitmasks (`DEFAULT_TIMEOUT`, `TOKEN_REGEX`, `NOOP`)
- **camelCase** mutable module-level state (`templateCache`, `globalListeners`, `effectQueue`)
- **`is`/`has`** booleans (`isLoading`, `hasChildren`)
- Abbreviations only when widely understood: `ctx`, `fn`, `cb`, `len` (cached loop length), `el` (local element), `idx` (when `i` taken), `prev`/`curr`/`next` (linked-structure pointers). Never bare `l` for cached length — indistinct from `1`/`I`; always `len` or `<prefix>Len` (`kLen`, `fLen`)
- Nested-loop indices: single-letter prefix matching the collection + `i` (`ki` key index, `fi` field index, `ci` child index), cached length same prefix + `Len` (`kLen`, `cLen`). Only when `i` is already in scope from an outer loop; a single loop always uses `i`/`len`
- Internal state fields 2-3 chars for V8 hidden-class density — an intentional performance trade-off, not a general pattern
- **No `__` prefixes** on internal marker properties — bare words: `raw`, not `__raw`. When a bare word collides with a real HTML attribute on the same object (`scope` vs `<th scope>`), rename to a non-colliding word instead of re-adding `__`

### Functions

- **Single word** for public API functions (they appear in user code)
- **PascalCase** multi-word JSX/html component exports (`ForEach`, `Lazy`) — they appear as JSX tags
- **`$`-prefixed** DOM reference APIs (`$ref`, `$collection`)
- **Verb-first** internal names:

  | Verb | Purpose |
  |------|---------|
  | `create` | Construction |
  | `get`/`peek` | Access |
  | `set`/`update` | Mutation |
  | `use` | Consumption |
  | `add` / `remove` | Registration / deletion |
  | `resolve` | Resolution |
  | `dispose` | Teardown |
  | `reset`/`clear` | Reset |
  | `mount` / `append` | DOM attachment / child insertion |
  | `find` | Tree search |
  | `dispatch` | Event/error routing |
  | `ensure` | Lazy initialization |
  | `check` | Validation |
  | `register`/`unregister` | Lifecycle subscription |
  | `schedule` | Deferred execution |
  | `process` | Queue handling |
  | `parse` / `normalize` | String→AST / value standardization |
  | `build` / `sync` / `apply` | Construct output / mirror representations / apply accumulated state |

  Non-exhaustive — common codebase patterns.

### Types

- **`Fn` suffix** for function-valued types, one suffix per package — never mix `Fn`/`Handler`/`Callback`/`Listener` for the same concept
- **`Options`** for a creation-parameter bag passed once to a factory; **`Config`** for fields shaping runtime behavior over a lifetime — decide by what the fields do
- **`Props`** reserved for component/element prop bags
- On scoped packages (`@hellajs/dom`), the scope already namespaces — don't brand-prefix every type; qualify/prefix only DOM/JS-builtin collisions (`Node`, `Element`, `Event`)

### Files

- (Pascal|Camel)case, no hyphens: `signal.ts`, `removeCss.ts`, `ForEach.ts`
- One public API function per file, filename = export verbatim (`css`/`removeCss`/`resetCss` = three files; `vars`/`removeVars`/`resetVars` = three more). No "related pair" carve-outs — one export per file keeps the public surface scannable and mechanically auditable
- `lib/internal/` files are organized by cohesive concern — one-export rules apply only to top-level `lib/*.ts`. Name an internal file after its concern as a single noun/gerund (`core`, `dedupe`, `errors`, `lifecycle`, `polling`, `retry`) — never a camelCase compound of its export (a file exporting `structuralShare` is `structural.ts`). The concern is one word; if it seems to need two, the file is two concerns (split it) or a concept not yet named
- PascalCase component filenames matching exports (`ForEach.ts`) — required for JSX resolution; `$`-prefixed reference APIs (`$ref.ts`)

## File and Function Size

- Functions: soft limit 80 lines — split at natural points without violating the single-callsite rule
- Files: soft limit 300 lines — split internal helpers into sub-modules; judge per-file, not a blanket allowance
- `.d.ts` files exempt from the 300-line limit when holding cohesive type definitions (attribute/event maps, mapped-type derivations) — splitting would harm discoverability or inference quality. Hand-expansion of mapped types is prohibited
- Files dominated by cohesive per-feature registries may slightly exceed 300 when splitting forces artificial seams
- Soft limits — exceed when splitting would harm clarity

## JSDoc

Every type and function gets a JSDoc block.

```typescript
/**
 * @internal — mark symbols exported from this module but not re-exported by index.ts. Omit for local (non-exported) functions.
 * One-line description, present tense.
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
  types/             # Global type declarations (always .d.ts)
  [file].ts          # Public API — one function per file, filename matches export
  index.ts           # Pure re-export barrel only
```

Top-level `lib/*.ts` is **public API only**. A file whose exports are all `@internal`, or not re-exported by `index.ts`, belongs under `lib/internal/` — an internal helper at top level looks public but isn't, hiding the real API and defeating the one-export-per-file rule.

**Exception — callable-namespace member impls.** A member implementation attached to a callable-namespace export (`ssr` → `ssr.async`/`ssr.stream`) lives at top level as `lib/{implName}.ts` (e.g. `ssrAsync.ts`), exported `@internal`, attached via `Object.assign` in the namespace's own file. The file maps one-to-one onto a documented public member; relocating it orphans the per-file coverage mapping and parity comments. One-export-per-file still applies.

### `index.ts` Rules

Named re-exports, `export type *`, global augmentations. No logic, no conditional exports, no transformations.

### Benchmark Files

`packages/*/benchmarks/*.bench.ts` are Code: every rule here applies. One relaxation: may import a benchmark runner (e.g. `mitata`) as a devDependency.

## Verification Checklist

Run this when holding a Code file (`.ts`/`.tsx`/`.mjs` under `lib/`, `scripts/`, `plugins/`). Each item is a yes/no or a command — the audit floor stated where the rules live.

**Structure**
- [ ] File sits at the right path per the File-placement decision tree
- [ ] One public export per `lib/*.ts`; filename matches the export verbatim
- [ ] Internal-only files under `lib/internal/` (exception: callable-namespace member impls at `lib/{implName}.ts`)
- [ ] Internal module named by a single noun/gerund concern
- [ ] Public types in `lib/types/*.d.ts`; internal types co-located with their owning module

**Imports**
- [ ] All imports precede every other top-level statement
- [ ] `import type` separated; never inline
- [ ] Double quotes; semicolons always
- [ ] No external runtime dependency (type-only from `.d.ts`-only packages excepted)

**Types**
- [ ] `interface` for object shapes; `type` for unions/mapped/conditional
- [ ] No `any` (`unknown` only)
- [ ] No `@internal` on a type inside a wholesale-exported `.d.ts` — move the type
- [ ] Named shape referenced by name at every signature, never re-inline
- [ ] Type checks use core's guards via the shim — no raw `typeof`-literal comparisons in `lib/` (exempt: ssr, plugins/scripts, core's `utils.ts`/`env.ts`; `=== undefined`, loose `== null`, regex-exec loops stay raw)

**Naming**
- [ ] Public functions single-word; components PascalCase; `$`-ref APIs `$`-prefixed
- [ ] camelCase variables; UPPER_SNAKE_CASE immutable config; `is`/`has` booleans
- [ ] Verb-first internal names; `Fn` suffix consistent per package
- [ ] `Options` vs `Config` vs `Props` chosen by what the fields do

**Functions & JSDoc**
- [ ] JSDoc on every function and type; `@internal` where exported but not barrel-re-exported (core `lib/internal/` shared-kernel exports exempt)
- [ ] No wrapper functions that only forward (exception: overload implementations)
- [ ] No single-callsite helper under 30 lines
- [ ] Extracted helpers in `lib/internal/` meet one of the four placement criteria; pure single-caller helpers co-located
- [ ] No parameter added just to pass it through unchanged

**Loops & memory**
- [ ] Cached `while` loops; no `for…of`/`for…in` anywhere (`.forEach` cold paths only; `for await…of` for async iterables)
- [ ] No collection reallocation where `.clear()` or swap works
- [ ] No bare `l` for cached length (`len` / `<prefix>Len`)

**Errors**
- [ ] Public functions validate with `[package] fn: <constraint>, received <value>`
- [ ] Internal functions do not guard (exceptions: platform-invoked callbacks; out-of-band mutable state surfacing a public contract)
- [ ] No broad `catch {}` swallowing unknown errors

**Toolchain**
- [ ] `bun coverage <package>` exits 0
- [ ] `bun lint` exits 0

## Config Verification Checklist

Run this when holding a Config file (`tsconfig*.json`, `eslint.config.*`, `package.json`, `bunfig.toml`, `.npmrc`, `.nvmrc`, `*.config.{ts,mjs,js}`, `plugins/**/{babel,rollup,vite}/` files). Config answers to different rules than the code beside it.

**TypeScript configs**
- [ ] `strict: true` or stronger; nothing weakened
- [ ] `paths` matches the actual layout (`@hellajs/{pkg}` → `packages/{pkg}/lib/index.ts`)
- [ ] `include` covers everything lint should see; `exclude` drops `dist/` + `node_modules/`
- [ ] No `any`-enabling flags

**ESLint config**
- [ ] No rule contradicts this guide
- [ ] `@stylistic/quotes` enforces double quotes
- [ ] Plugin refs resolve (no orphaned plugins)

**package.json**
- [ ] Every `scripts` entry referenced by a workflow or another script exists and does what callers expect
- [ ] No new runtime dependency without justification (type-only `.d.ts` packages excepted)
- [ ] `exports` map matches actual `dist/` output
- [ ] `workspaces` covers `packages/*` and `plugins/*`

**Build plugin configs** (`plugins/{babel,rollup,vite}/`)
- [ ] Exported hook shape matches stated purpose and runtime
- [ ] Wrapper thinness: rollup/vite forward to the babel plugin, never re-implement

**Toolchain**
- [ ] `bun coverage` exits 0 for every touched package
- [ ] `bun lint` exits 0
- [ ] `bun bundle <package>` succeeds if build tooling changed
