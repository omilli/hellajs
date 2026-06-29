# [ ] Unit A: Codify and apply import-order convention

## Type tag

Tests + Docs (guide update).

## Surface fork

No. Guide update is docs; file reorders are test-internal.

## Files

### `guides/tests.md`
- Anchor: §Test Framework (import order example block, lines 76–85)
- Edit the canonical order from `bun:test → test helpers → package under test (/bundle) → cross-package deps → import type` to:
  1. `bun:test`
  2. `@hellajs/core` (reactive primitives, if needed)
  3. `@utils/test-helpers.js`
  4. `@hellajs/dom/bundle` (package under test)
  5. `import type` (bare path, last)
  6. local helpers (e.g. `./helpers`) — if present, after type imports
- Update the example block to show all three source types + type + local.

### `packages/dom/tests/error-reset.test.ts`
- Consolidate the two `@hellajs/dom/bundle` imports (L2 `onError`, L5 `mount, html`) into one: `import { mount, html, onError } from "@hellajs/dom/bundle";`
- Reorder to: `bun:test` → `@hellajs/core` → test-helpers → `@hellajs/dom/bundle` → `import type`

### `packages/dom/tests/error-boundary.test.ts`
- Consolidate L2 (`onError`) + L5 (`mount, html, peekState`) → `import { mount, html, onError, peekState } from "@hellajs/dom/bundle";`
- Reorder to: `bun:test` → `@hellajs/core` → test-helpers → `@hellajs/dom/bundle` → `import type` → `./helpers`

### `packages/dom/tests/error.test.ts`
- Same pattern as error-boundary.

### `packages/dom/tests/error-catching.test.ts`
- Same pattern as error-boundary.

### `packages/dom/tests/html.test.ts`
- Consolidate L2 (`onError`) + L5 (`mount, html`) → `import { mount, html, onError } from "@hellajs/dom/bundle";`
- Reorder to: `bun:test` → `@hellajs/core` → test-helpers → `@hellajs/dom/bundle` → `import type`

### `packages/dom/tests/reset-dom.test.ts`
- Consolidate L2 (`onError`) + L4 (`mount, html, resetDom`) → `import { mount, html, onError, resetDom } from "@hellajs/dom/bundle";`
- Reorder to: `bun:test` → test-helpers → `@hellajs/dom/bundle` (no @hellajs/core needed in this file)

### `packages/dom/tests/collection.test.ts`
- Swap L2 (test-helpers) and L3 (`@hellajs/core`) to match the new convention.

### `packages/dom/tests/element.test.ts`
- Swap L2 (test-helpers) and L3 (`@hellajs/core`) to match the new convention.

### `packages/dom/tests/transition.test.ts`
- Swap L2 (test-helpers) and L3 (`@hellajs/core`) to match the new convention.

## Definitions of Done

- [ ] `guides/tests.md` §Test Framework updated to the new canonical order
- [ ] `error-reset.test.ts` imports consolidated to one `@hellajs/dom/bundle` statement
- [ ] `error-reset.test.ts` import order matches the new convention
- [ ] `error-boundary.test.ts` imports consolidated to one `@hellajs/dom/bundle` statement
- [ ] `error-boundary.test.ts` import order matches the new convention
- [ ] `error.test.ts` imports consolidated to one `@hellajs/dom/bundle` statement
- [ ] `error.test.ts` import order matches the new convention
- [ ] `error-catching.test.ts` imports consolidated to one `@hellajs/dom/bundle` statement
- [ ] `error-catching.test.ts` import order matches the new convention
- [ ] `html.test.ts` imports consolidated to one `@hellajs/dom/bundle` statement
- [ ] `html.test.ts` import order matches the new convention
- [ ] `reset-dom.test.ts` imports consolidated to one `@hellajs/dom/bundle` statement
- [ ] `reset-dom.test.ts` import order matches the new convention
- [ ] `collection.test.ts` import order matches the new convention (@hellajs/core before test-helpers)
- [ ] `element.test.ts` import order matches the new convention
- [ ] `transition.test.ts` import order matches the new convention
- [ ] No behavior changes — `bun coverage dom` is green and unchanged from baseline

## Strategy

The guide is updated first (it defines what "correct" means). Then the 9 files are fixed. For the 6 duplicate-import files: merge the two `@hellajs/dom/bundle` statements into one sorted-alphabetically import. For the 3 reorder-only files: swap the `@hellajs/core` and `test-helpers` lines. Each file fix is a pure mechanical reorder — the same symbols, same order within each source group. Verify with `bun coverage dom`.

**Trade-offs:** Alphabetical sort within each import group (existing convention). Local-helper imports (`./helpers`) go after type imports — no stated rule exists for these, but all 3 files using them (error, error-boundary, error-catching) already place them last; codify that slot in the guide update.
