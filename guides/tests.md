# Test Style Guide

## Core Philosophy

Tests are documentation. A reader should understand every behavior from tests alone. DRY above all — every repeated setup, assertion, or helper across files is a violation.

## Decision Precedence

1. **DRY** — shared helpers are mandatory. Two tests with the same setup means extract.
2. **Readability** — clear beats clever. Names describe behavior, not implementation.
3. **Coverage** — every public API path: happy, error, edge.
4. **Brevity** — short, never at DRY or clarity's expense.

## Anti-Patterns

- Never import reactive primitives, async helpers, or DOM helpers — they're globals.
- Never use `jest.fn()` / `jest.spyOn()` / `vi.fn()` — use `mock()` from `bun:test`.
- Never use `any` — `unknown` only.
- Never use `it()` or `test.skip()` — always `test()`.
- Never test two behaviors in one test (exception: sequential lifecycle tests — see Test Structure).
- Never use AAA pattern — tests flow naturally.
- Never leave placeholder tests.
- Never mock reactive primitives — use real ones.
- Never repeat a helper across files — extract.
- Never `await flush()` — synchronous, returns `void`. Use bare `flush()`.
- Never use the double-tick (`await tick(); await tick()`). Use `await tick(0)`.
- Always write `await tick(0)` explicitly, even for a single microtask — bare `await tick()` is inconsistent with codebase convention.
- Never track callback invocations with boolean flags (`let called = false`) or pure integer counters (`let runs = 0`) — use `mock()`. Renamed flags (`cleaned`, `handlerCalled`, `errorOccurred`, `asyncCompleted`) are the same pattern. The only exception: a counter incremented inside a callback that **also** performs observable side effects (`count++; flush()`, DOM writes, network calls). Signal reads or value returns (`return signal()`) don't qualify — use `mock()`.

### Replace pattern

Wrap the side effect in `mock()` — it tracks the call and runs the effect in one step:

```typescript
// Before
let called = false;
const callback = () => { called = true; doWork(); };
register(callback);
expect(called).toBe(true);

// After
const callback = mock(() => doWork());
register(callback);
expect(callback).toHaveBeenCalledTimes(1);
```

## Test Framework

- `bun:test` only. Double quotes, semicolons always.
- Import order: `bun:test` → package under test (with `/bundle` suffix) → cross-package deps → `import type` (bare path, last).
- Separate `import type` statement — never inline.

```typescript
import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mount, html } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";
```

## Files

- `{feature}.test.ts` — lowercase, hyphenated. The `.test`/`.spec` marker is load-bearing: omitting it makes the file invisible to `bun test` / `bun coverage`.
- File names identify the **specific** API surface or behavior area under test (e.g. `scroll`, `active`, `crumbs`, `hash-mode`, `navigate-options`). Categorical prefixes like `features-` add no information — every test file covers a feature. A file named with only a category, or with no surface at all, is a signal that it mixes concerns and should be split.
- Group by feature area, not internal module.
- 100–300 lines target. Soft cap 400 (trim duplication or split on a sub-feature seam). Minimum 2 tests per file.

## Test Structure

Max depth: two `describe` levels — outer (feature/package) + inner (sub-area). At most **one** inner `describe` per file — a second sibling inner `describe` must move to its own file. The file name is the grouping mechanism; co-locating sibling inner describes hides how many concerns a single file covers and lets files grow past the soft cap before a split is due. Deeper nesting disallowed.

```typescript
describe("feature", () => {
  describe("sub-area", () => {
    // shared setup
    test("describes specific behavior", () => {});
  });
});
```

### Naming

Present tense, no "should", one behavior per test, name reflects what is asserted.

| Good | Bad |
|------|-----|
| `"prevents duplicate renders in diamond pattern"` | `"test 1"` |
| `"fetches data successfully"` | `"works correctly"` |
| `"cache invalidation when boundary element is removed"` | `"handles edge case"` |

### Sequential Lifecycle Tests

A single scenario verified through sequential steps (render → update → reorder) is one test — each step depends on the prior step's DOM state. Independent behaviors must be separate tests.

## Shared State and Cleanup

### `beforeEach` with `resetTestState()`

Every file touching shared mutable state uses exactly:

```typescript
beforeEach(() => {
  resetTestState();
});
```

Skip it for files with zero shared mutable state (pure logic, no DOM/cache/error handlers).

A test that creates its own `signal`/`store`/`effect` inside the body does **not** touch shared state — its subscriptions are local. Reset is required only when a test reads/writes module-level reactive singletons (internal state maps, global error handlers, DOM observer registries). For packages whose only shared state is module-level signals that the public API reinitializes on each call (e.g. `router(config)` overwriting routes/hooks/redirects), per-test invocation satisfies the requirement. If a signal can persist across such a call (LRU cache, observer registry, connection pool), it needs an explicit reset path.

`resetTestState(html?)` may be called mid-test when a sequential lifecycle test needs a fresh DOM between sub-scenarios (e.g. multiple Portal insert types) — preferable to splitting tests when sub-scenarios share conceptual context.

Fresh containers per test? Create in `beforeEach` after `resetTestState()`, remove in `afterEach`.

### `afterEach`

Use only when `resetTestState()` doesn't cover all shared mutable state. `resetTestState()` clears DOM body, CSS styles, DOM package state (queues, mount/cleanup scheduling, MutationObserver registrations, selector registry, event listeners, delegated handler counts), error handlers. `afterEach` is for state **not** in that list.

```typescript
afterEach(() => {
  multiSelectors.clear();
});
```

Prefer extending `resetTestState()` over adding `afterEach` to individual files. Use `afterEach` only for cleanup specific to a subset of tests.

### Patched browser globals

Any test that reassigns a global (`window.scrollTo = ...`, `global.window = {...}`, `console.error = ...`) must capture the original in `beforeEach` and restore in `afterEach`, or wrap the body in `try { ... } finally { restore(); }`. A trailing restoration assignment is unacceptable — a failing assertion before it leaks the mock into later files.

## Globals Reference

Preloaded globally. **Never import. Never redefine.**

### Reactive Primitives

| Global | Type | Purpose |
|--------|------|---------|
| `signal` | `(val?) => Signal` | Writable state |
| `computed` | `(fn) => Computed` | Derived value |
| `effect` | `(fn) => Dispose` | Side effect on dependency change |
| `batch` | `(fn) => R` | Group writes into single update |
| `untracked` | `(fn) => R` | Read without creating dependency |
| `scope` | `(fn) => Dispose` | Collect/dispose effects together |
| `flush` | `() => void` | Force synchronous update |

### Async Helpers

| Global | Signature | When |
|--------|-----------|------|
| `tick()` | `() => Promise<void>` | One microtask (use `tick(0)` form instead) |
| `tick(ms)` | `(ms: number) => Promise<void>` | Wait real time |
| `delay(val, ms?)` | `(val: T, ms?) => Promise<T>` | Mock async value (default `ms` 10) |
| `wait(fn, ms?)` | `(fn: () => boolean, ms?) => Promise<void>` | Poll until true (default timeout 500) |

Decision tree:
- Need a value back → `delay(val, ms)`.
- Sync reactive update → `flush()` (no await).
- Deferred update (MutationObserver, microtask) → `await tick(0)`.
- Real time → `await tick(ms)`.
- Condition → `await wait(() => condition())`.

### Async Tests

- Mark `async` only when it `await`s.
- Structure: **act → await → assert**.
- Prefer `await wait(() => condition)` over hardcoded `await tick(N)` when timing isn't contractually fixed — robust against microtask jitter, self-documents the condition.
- For genuine fixed waits (e.g. transition leave timer `duration + 50`), use `await tick(N)` with an inline comment naming the constant: `await tick(160); // duration(100) + safety buffer(50) + frame slack`.
- Never double-tick — `await tick(0)` for a single microtask flush.

### DOM Helpers

| Global | Signature | Purpose |
|--------|-----------|---------|
| `resetTestState()` | `() => void` | Reset body, CSS, cache, error handlers |
| `resetTestState(html)` | `(html?: string) => void` | Reset `document.body.innerHTML` |
| `setupContainer` | `() => HTMLDivElement` | Create + append isolated container |
| `suppressConsole` | `() => { errors, restore }` | Capture `console.error`; remember `restore()` |

For simple call-count checks, mock `console.error` directly with save/restore in `beforeEach`/`afterEach`.

### Package-Exported Testing Utilities

Imported from `@hellajs/dom/bundle` (not globals). Use for deterministic lifecycle timing:

| Utility | Purpose |
|---------|---------|
| `flushMount(root?)` | Process mount queue for `root`'s children; runs `afterMount` synchronously |
| `queueCleanup(node)` | Queue a node for immediate cleanup; runs `beforeDestroy`/`afterDestroy`, disposes effects/handlers |

Prefer over waiting for the scoped MutationObserver.

## Mock Patterns

- `mock(() => {})` for call tracking; `mock(() => value)` for return values.
- `mockClear()` between assertion phases.
- Pure call-tracking uses `mock()`. Signal reads/value returns don't qualify for the side-effect counter exception (see Anti-Patterns).
- Global mocking: save in `beforeEach`, restore in `afterEach`, cast `as unknown as typeof X`.
- DOM API mocking: `Object.defineProperty` for readonly props; save/restore for prototype patching.
- Time mocking (`Date.now`, `performance.now`): declare the mock-time closure at describe scope, override in `beforeEach`, restore in `afterEach`. Tests advance the closure; they never own the save/restore pair, so a failing assertion can't leak a frozen clock.
- Error handler setup: extract the common `onError` pattern into a shared helper (e.g. `fallbackHandler(defaultNode)`) in `tests/helpers.ts`. Call the helper at the top of each test instead of repeating the full lambda.

## Assertion Patterns

| What | Assertion |
|------|-----------|
| Primitive equality | `expect(value).toBe(expected)` |
| Deep equality | `expect(obj).toEqual(expected)` |
| Boolean | `expect(value).toBe(true)` (prefer over `toBeTruthy`) |
| Mock call count | `expect(mockFn).toHaveBeenCalledTimes(n)` |
| Error thrown | `expect(() => fn()).toThrow("message")` |
| DOM text content | `expect(el?.textContent).toBe("expected")` |
| Element exists | `expect(document.getElementById("x")).not.toBeNull()` |
| Element absent | `expect(document.getElementById("x")).toBeNull()` |
| Not called | `expect(mockFn).not.toHaveBeenCalled()` |

## DOM Element Access

Query `document` directly via `getElementById`. Use `setupContainer()` only when a test needs an isolated root.

```typescript
const el = document.getElementById("test")!;
const btn = document.getElementById("btn") as HTMLButtonElement;
expect(document.getElementById("test")?.textContent).toBe("value");
```

## Variable Naming

| Category | Pattern | Examples |
|----------|---------|----------|
| Signals | Descriptive camelCase | `count`, `name`, `items` |
| Resources | Short | `r`, `r1`, `r2` |
| Stores | Semantic nouns | `data`, `user`, `cart` |
| DOM elements | Semantic + type hint | `container`, `el`, `btn` |
| Mock trackers | Purpose-suffix | `tracker`, `renderSpy`, `effectRuns` |
| Run counters | Purpose-suffix | `runs`, `fetchCount`, `clickCount` |
| Test data | `mock` prefix | `mockUser`, `mockPosts` |

## Comments

- No comments on obvious logic — names explain intent.
- Section comments to group assertions in long tests.
- ASCII dependency graphs for topology/complex reactive tests.
- Inline comments for non-obvious setup or ordering.
- Comments explain **why**, not **what**.

## Code Style

- Semicolons always; arrow functions for inline helpers.
- `unknown` only — never `any`.
- No AAA pattern — interleave setup, action, assertion.
- `test.each()` for parameterized tests; `@ts-expect-error` for intentionally invalid inputs.

## Test Coverage

- 100% of public API. Real-world integration patterns, not internals. Error and edge cases alongside happy paths. Each behavior tested exactly once in the most relevant file.
- **Barrel rule**: when `index.ts` re-exports a utility (type guard, predicate, env probe, iterator helper), the authoring package **must** cover it — even if consumers also exercise it. The barrel defines the public surface; coverage follows the barrel. Consumer coverage doesn't protect the author from silent contract drift (e.g. a predicate whose name suggests general semantics but whose implementation is narrow).
- Never import non-public APIs. Functions/types not exported from `index.ts` are internal. Exports from `index.ts` (including testing utilities from `internal/` modules) are fair game.
