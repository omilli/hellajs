# Test Style Guide

## Core Philosophy

Tests are documentation. A new contributor should understand every behavior by reading tests alone. Tests are DRY above all else — every repeated setup, assertion pattern, or helper across files is a violation.

## Decision Precedence

1. **DRY** — shared helpers are mandatory, not optional. Two tests doing the same setup means extract.
2. **Readability** — clear beats clever. Test names explain behavior, not implementation.
3. **Coverage** — every public API path: happy, error, edge.
4. **Brevity** — short is good, never at DRY or clarity's expense.

## Anti-Patterns

- Never import reactive primitives, async helpers, or DOM helpers — they are globals
- Never use `jest.fn()`, `jest.spyOn()`, `vi.fn()` — use `mock()` from `bun:test`
- Never use `any` — `unknown` only
- Never use `it()` or `test.skip()` — always `test()`
- Never test two behaviors in one test (sequential lifecycle tests are an exception — see below)
- Never use AAA pattern — tests flow naturally
- Never leave placeholder tests
- Never mock reactive primitives — use real ones
- Never use boolean flag patterns (`let called = false`) or pure integer counters (`let runs = 0`) for call tracking — use `mock()` instead. The only exception is a counter incremented inside a callback that also performs observable side effects (e.g., `count++; flush()`, DOM writes, network calls). Pure signal reads or value returns (`return signal()`) do NOT qualify as side effects — use `mock()` instead. This exception is detailed under Mock Patterns.
- Never repeat a helper across files — extract to shared location
- Never use `await tick(); await tick()` — always `tick(0)`
- Always use `await tick(0)` explicitly, even for a single microtask wait. Bare `await tick()` is functionally equivalent but inconsistent with the codebase convention. The only exception is the double-tick anti-pattern, which is banned entirely.
- Never use `await flush()` — `flush()` is synchronous and returns `void`; awaiting is meaningless. Use bare `flush()`.

## Test Framework

- **Framework**: `bun:test` only
- **Imports**: double quotes
- **Import order**: `bun:test` first, then package under test (with `/bundle` suffix), then cross-package deps, then `import type` (bare path, last)
- **Types**: separate `import type` statement
- **Semicolons**: always

```typescript
import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mount, html } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";
```

## File Naming and Size

- `{feature}.test.ts` — lowercase, hyphenated
- Group by feature area, not internal module
- Target 100–300 lines. The soft cap is 400: a file over 400 lines can either trim duplication or split along a sub-feature seam. Minimum 2 tests per file.

## Test Structure

Maximum **depth**: two levels of `describe` — one outer (feature/package) plus one inner (sub-area). Multiple sibling inner describes at the same depth are encouraged for organizing distinct sub-areas. Deeper nesting is not permitted.

```typescript
describe("feature", () => {
  describe("sub-area", () => {
    // shared setup

    test("describes specific behavior", () => {});
  });
});
```

## Test Naming

Present tense, no "should", one behavior per test, name reflects what is asserted.

| Good | Bad |
|------|-----|
| `"prevents duplicate renders in diamond pattern"` | `"test 1"` |
| `"fetches data successfully"` | `"works correctly"` |
| `"cache invalidation when boundary element is removed"` | `"handles edge case"` |

## Setup and Teardown

**Every file that touches shared mutable state** uses exactly:

```typescript
beforeEach(() => {
  resetTestState();
});
```

**Files with zero shared mutable state** (pure logic, no DOM/cache/error handlers) skip it entirely.

`resetTestState(html?)` may also be called mid-test when a sequential lifecycle test needs a fresh DOM between sub-scenarios (e.g., testing multiple Portal insert types). Each call fully resets all package state. This is preferable to splitting into separate tests when the sub-scenarios share conceptual context but require clean DOM.

If a file needs fresh containers per test, create them in `beforeEach` after `resetTestState()`, remove in `afterEach`.

### afterEach

Use `afterEach` only when `resetTestState()` does not cover all shared mutable state. This applies to package-level caches, observer registries, or selector maps that persist across tests.

`resetTestState()` clears DOM body, CSS styles, DOM package state (queues, mount/cleanup scheduling, MutationObserver registrations, selector registry, event listeners, delegated handler counts), and error handlers. Use `afterEach` only for state **not** already covered by `resetTestState()`.

```typescript
afterEach(() => {
  multiSelectors.clear();
});
```

Prefer extending `resetTestState()` to handle the cleanup over adding `afterEach` to individual test files. Only use `afterEach` when the cleanup is specific to a subset of tests in the file.

### Sequential Lifecycle Tests

Tests that verify a single scenario through multiple sequential steps (render → update → reorder) are acceptable as one test. Each step depends on the previous step's DOM state — they are not independent behaviors.

Independent behaviors that can be tested in isolation must have separate tests.

## Globals Reference

Preloaded globally. **Never import them. Never redefine locally.**

### Reactive Primitives

| Global | Type | Purpose |
|--------|------|---------|
| `signal` | `(val?) => Signal` | Writable reactive state |
| `computed` | `(fn) => Computed` | Derived reactive value |
| `effect` | `(fn) => Dispose` | Side effect on dependency change |
| `batch` | `(fn) => R` | Group signal writes into single update |
| `untracked` | `(fn) => R` | Read without creating dependency |
| `scope` | `(fn) => Dispose` | Collect and dispose effects together |
| `flush` | `() => void` | Force synchronous reactive update |

### Async Helpers

| Global | Signature | When to Use |
|--------|-----------|-------------|
| `tick()` | `() => Promise<void>` | One microtask (rarely correct alone — use `tick(0)`) |
| `tick(ms)` | `(ms: number) => Promise<void>` | Wait for real time |
| `delay(val, ms?)` | `(val: T, ms?) => Promise<T>` | Mock async value after `ms` (default 10) |
| `wait(fn, ms?)` | `(fn: () => boolean, ms?) => Promise<void>` | Poll until condition is true (default timeout 500) |

Decision tree:
- Need a value back → `delay(val, ms)`
- Waiting for sync reactive update → `flush()` (no await)
- Waiting for deferred update (MutationObserver, microtask) → `await tick(0)`
- Waiting for real time → `await tick(ms)`
- Waiting for condition → `await wait(() => condition())`

### Async Tests

- Mark a test `async` only when it `await`s. Sync tests stay sync.
- Structure async tests as **act → await → assert**: perform the action that schedules deferred work, await the smallest sufficient delay, then assert.
- Prefer `await wait(() => condition)` over a hardcoded `await tick(N)` whenever the exact flush timing is not contractually fixed — it is robust against microtask jitter and self-documents the success condition.
- When a fixed real-time wait is genuinely required (e.g., a transition leave timer of `duration + 50`), use `await tick(N)` and add an inline comment naming the constant being waited for. Example: `await tick(160); // duration(100) + safety buffer(50) + frame slack`.
- Never use the banned double-tick (`await tick(); await tick()`); use `await tick(0)` for a single microtask flush.

### DOM Helpers

| Global | Signature | Purpose |
|--------|-----------|---------|
| `resetTestState` | `() => void` | Canonical reset — body, CSS, cache, error handlers |
| `resetTestState` | `(html?) => void` | Reset `document.body.innerHTML` |
| `setupContainer` | `() => HTMLDivElement` | Create and append isolated container |
| `suppressConsole` | `() => { errors, restore }` | Capture `console.error`, return array + restore |

Console suppression: use `suppressConsole()` for error-path tests. Always call `restore()`. For simple call-count checks, mock `console.error` directly with save/restore in beforeEach/afterEach.

### Package-Exported Testing Utilities

These are imported from `@hellajs/dom/bundle` (not globals) and exist for deterministic lifecycle control in tests:

| Utility | Signature | Purpose |
|---------|-----------|---------|
| `flushMount(root?)` | `(root: Node = document.body) => void` | Process the mount queue for `root`'s children; runs deferred `afterMount` hooks synchronously |
| `queueCleanup(node)` | `(node: Node) => void` | Queue a node for immediate cleanup; runs `beforeDestroy`/`afterDestroy` and disposes effects/handlers |

Prefer these over waiting for the scoped MutationObserver when a test needs deterministic lifecycle timing.

## Mock Patterns

- `mock(() => {})` for call tracking — always prefer over manual counters
- `mock(() => value)` for return values
- `mockClear()` between assertion phases
- Pure call-tracking must use `mock()`. For the side-effect counter exception, see Anti-Patterns above. Signal reads and value returns are not observable side effects and do not qualify for the exception.
- Global mocking: save in `beforeEach`, restore in `afterEach`, use `as unknown as typeof X`
- DOM API mocking: `Object.defineProperty` for readonly props, save/restore for prototype patching
- Error handler setup: tests that exercise error boundaries repeat a common `onError` registration pattern. Extract this into a shared helper (e.g., `fallbackHandler(defaultNode)`) in a `tests/helpers.ts` file. Import and call the helper at the top of each test instead of repeating the full `onError((error, context) => ...)` lambda.

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

## DOM Element Access Patterns

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

- No comments on obvious logic — test names explain intent
- Section comments to group assertions in long tests
- ASCII dependency graphs for topology/complex reactive tests
- Inline comments for non-obvious setup or ordering
- Comments explain **why**, not **what**

## Code Style

- Semicolons always
- Arrow functions for inline helpers
- Avoid `any` — `unknown` only
- No AAA pattern — interleave setup, action, assertion
- `test.each()` for parameterized tests across inputs
- `@ts-expect-error` for intentionally invalid inputs

## Test Coverage

- 100% of public API
- Test real-world integration patterns, not internals
- Never import non-public APIs in tests — functions and types not exported from the package's `index.ts` are internal implementation details. Exports from `index.ts` (including testing utilities from `internal/` modules) are fair game for tests.
- Error paths and edge cases alongside happy paths
- Each behavior tested exactly once in the most relevant file