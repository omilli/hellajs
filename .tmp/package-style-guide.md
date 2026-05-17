# Package Style Guide

Cross-package style conventions observed from audited packages. Update as new packages are reviewed.

## JSDoc Style

- **All public exports** must have JSDoc with `@template`, `@param`, and `@returns` tags where applicable
- **Parameter descriptions** are terse: `@param effectFn The function to execute as a side effect.`
- **Template params** before regular params: `@template T`
- **Return descriptions** use `@returns` not `@return`: `@returns A cleanup function to stop the effect.`
- **Internal functions** also get JSDoc (seen in core internals and dom internals)
- **No `@example` tags** — examples live in the `/docs` reference files, not JSDoc

### Pattern (core)
```typescript
/**
 * Creates a reactive signal that can hold any value.
 * @template T
 * @param initialValue The initial value of the signal.
 * @returns A signal function that can be used to get or set the value.
 */
```

### Pattern (dom)
```typescript
/**
 * Mounts a HellaNode to a DOM element, replacing all existing content.
 * @param node The HellaNode or component function to mount
 * @param target CSS selector string or Element to mount into (defaults to "#app")
 */
```

## Type Definition Style

- **Interfaces** use short abbreviated property names for hot-path structs (core: `sbv`, `rs`, `rf`, etc.)
- **Public-facing types** use full descriptive names (`Signal<T>`, `ComputedState`, `EffectScope`)
- **Type files** use `.d.ts` extension in `lib/` directory
- **Generic parameters** default to `unknown` where applicable: `ComputedState<T = unknown>`

## Code Style

- **No comments on obvious code** — inline comments reserved for non-obvious behavior (bitwise tricks, subtle ordering, invariant explanations)
- **Conversational inline comments** for complex sections explaining WHY, not WHAT
- **Arrow functions** for utilities (`utils.ts`), **function declarations** for exports
- **Bitwise operators** for flag checks instead of function calls
- **Short-circuit `&&`** chains for conditional side effects (no ternaries for void returns)
- **Destructuring** at the top of functions for readability
- **No semicolons** in the codebase (confirmed from source)

## Test Style

- **Test framework**: `bun:test` (`import { describe, expect, test, mock } from 'bun:test'`)
- **Global availability**: Core reactive functions (`signal`, `computed`, `effect`, `batch`, `untracked`, `scope`) are available globally in tests (no import needed)
- **Test structure**: `describe` block per concept area, `test` for individual scenarios
- **Test naming**: Descriptive phrases ("signals store primitives and reference types", "prevents duplicate renders in diamond pattern")
- **Mock usage**: `mock()` from bun:test for tracking computation/execution counts
- **No AAA pattern**: Tests don't follow strict Arrange-Act-Assert — they flow naturally
- **Comment blocks**: ASCII dependency graph diagrams at the top of topology tests
- **Bundle imports**: DOM tests import from `@hellajs/dom/bundle` (not `@hellajs/dom`) to get the bundled version with core re-exports
- **Testing utilities**: Packages may export testing helpers for manual lifecycle processing (e.g., `flushMount`, `queueCleanup`, `triggerMutationCallbacks`)

## Documentation Style (Reference Docs)

- **Location**: `packages/{name}/docs/{export}.mdx`
- **Structure**: Title → API signature → Basic Usage → Key Concepts → Important Considerations
- **API section**: TypeScript signature with parameter descriptions as bullet list
- **Code blocks**: Always use `typescript` language tag, always show import from `@hellajs/{package}`
- **Cross-references**: Link to related functions using `[{name}](/reference/core/{name})` syntax
- **Emoji usage**: ❌ for bad patterns, ✅ for good patterns, ⚠️ for warnings (consistent across packages)
- **Dual syntax**: When a package supports multiple syntaxes (e.g., JSX and `html`` templates), show both in examples where practical

## Documentation Style (Concepts Docs)

- **Location**: `docs/src/pages/learn/concepts/`
- **Structure**: Primitives → Working with Complex Data → Advanced Patterns → Optimization → Internal Mechanics
- **Code examples**: Self-contained, runnable snippets with imports
- **Alert boxes**: Use Astro `<div role="alert" class="alert alert-info alert-soft">` for callouts

## CLAUDE.md Style

- **XML tag format** for structured sections
- **Sections**: overview, mental-model, architecture, performance, usage-patterns, non-obvious-behaviors, testing-approach
- **Architecture**: Lists every data structure with field descriptions, every algorithm with steps
- **Non-obvious behaviors**: Bullet list of subtle invariants, each one sentence
- **Performance**: Lists optimization techniques by name
- **Testing approach**: Bullet list of principles (not test names)

## Package.json Style

- **Name**: `@hellajs/{name}`
- **Exports map**: `"."` for main entry, `"./*"` for deep imports
- **Files**: `["dist", "README.md", "LICENSE"]`
- **Repository**: Points to GitHub monorepo with `directory` field

## Import Style

- **Test imports**: Always use package imports (`from "@hellajs/dom"`) not relative paths (`from "../lib"`)
- **Type-only imports**: Use `import type { ... }` for types, separate from value imports
- **Re-exports**: Core re-exports go in `lib/internal/core.ts` as a single barrel

## File Organization

```
packages/{name}/
  lib/           # Source code
    internal/    # Private implementation modules
    types/       # Type definitions (can be folder or single .d.ts)
    index.ts     # Public exports
  tests/         # Test files
  docs/          # Reference documentation (.mdx)
  CLAUDE.md      # Package instructions for AI
  package.json
  tsconfig.json
  README.md
```

### Type File Location

- **Small packages**: Single `lib/types.d.ts` file (core, store, resource)
- **Large packages**: `lib/types/` folder with multiple `.d.ts` files (dom: `nodes.d.ts`, `attributes.d.ts`)

### Internal Module Organization

- **Large packages**: `lib/internal/` folder for private modules (core, dom)
- **Small packages**: Private modules at `lib/` root without `internal/` folder (store: `utils.ts`, `draft.ts`; resource: `cache.ts`)
- **Re-exports**: Only re-export what's actually used from `internal/core.ts` — audit for dead re-exports

### URL Encoding Consistency

- **`:param` segments** are URL-encoded via `encodeURIComponent` on substitution
- **Wildcard `*` segments** are NOT encoded — they contain raw path segments with `/` that must be preserved as-is
- **Decode on parse, encode on emit** — `decode()` on incoming params, `encode()` on outgoing `:param` construction

### Type Safety in Handler Types

- **Avoid `any` in handler/function types** — prefer `unknown[]` or specific tuple types even for internal callback signatures
- **Type casts (`as any`)** should be avoided; if necessary, add inline comments explaining why the cast is safe

### Dead Type Machinery

- **Avoid conditional types that always resolve the same way** — if a type like `K & keyof SomeMap extends never ? K : ...` always hits the `K` branch because `SomeMap` is `{}`, simplify to just `K`
- **Unused generic helpers** (`CacheKeyMap`, `ValueFromKey`) that are never populated should be removed or documented with their intended extension pattern

### Repository Directory Field

- **Monorepo packages** must use `"directory": "packages/{name}"` in package.json, not `"./"` — ensures npm/GitHub correctly link to the package source

### Test Helper Naming

- **Async delay helper** is consistently named `delay` across packages: `const delay = <T>(val: T, ms: number = 10): Promise<T> => ...`
- **Some test files** use `wait` for the same concept (polling tests) — prefer `delay` for consistency
- **Poll-until helper** uses `wait` with a function parameter: `const wait = (fn: () => boolean, ms = 500) => ...` — acceptable distinction from `delay`
