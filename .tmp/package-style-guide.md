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

## Documentation Style (Reference Docs)

- **Location**: `packages/{name}/docs/{export}.mdx`
- **Structure**: Title → API signature → Basic Usage → Key Concepts → Important Considerations
- **API section**: TypeScript signature with parameter descriptions as bullet list
- **Code blocks**: Always use `typescript` language tag, always show import from `@hellajs/{package}`
- **Cross-references**: Link to related functions using `[{name}](/reference/core/{name})` syntax
- **Emoji usage**: ❌ for bad patterns, ✅ for good patterns, ⚠️ for warnings (consistent across packages)

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

## File Organization

```
packages/{name}/
  lib/           # Source code
    internal/    # Private implementation modules
    types.d.ts   # Type definitions
    index.ts     # Public exports
  tests/         # Test files
  docs/          # Reference documentation (.mdx)
  CLAUDE.md      # Package instructions for AI
  package.json
  tsconfig.json
  README.md
```
