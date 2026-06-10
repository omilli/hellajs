# Package Tests Style Guide

Cross-package test conventions derived from all existing test files. New tests must follow these rules.

## Test Framework

- **Framework**: `bun:test`: always
- **Imports**: `import { describe, test, expect, ... } from "bun:test"`: double quotes
- **Available globals**: Preloaded via `bunfig.toml`: do not import explicitly:
  - Core: `signal`, `computed`, `effect`, `batch`, `untracked`, `scope`, `flush`
  - Async helpers: `tick`, `delay`, `wait`
- **Package imports**: Always use the `/bundle` suffix — `from "@hellajs/dom/bundle"`, not `from "@hellajs/dom"`

## Import Order

```typescript
// 1. bun:test (always first)
import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test"

// 2. Package under test
import { mount, html } from "@hellajs/dom/bundle"

// 3. Type-only imports (always last, separate import type statement)
import type { HellaNode } from "@hellajs/dom"
```

- Only import what each test file actually uses — no blanket imports
- Import `mock` from `bun:test` when tracking function calls; never use `jest.fn()` or `jest.spyOn()`: use `mock()` consistently
- Never import core reactive functions (`signal`, `computed`, `effect`, `batch`, `untracked`, `scope`, `flush`) — they are globals
- **Type imports**: Use a separate `import type` statement, never inline `type` in a value import
  - Good: `import { store } from "@hellajs/store/bundle"` then `import type { Store } from "@hellajs/store"`
  - Bad: `import { store, type Store } from "@hellajs/store/bundle"`
- **Babel plugin tests**: Direct imports from internal `../src/` paths are acceptable for unit-testing internal modules that have no public API surface

## File Naming

- **Convention**: `{feature}.test.ts`: lowercase, hyphenated, no package prefix
- Examples: `mount.test.ts`, `topology.test.ts`, `store-update.test.ts`, `errors.test.ts`
- Group related tests by feature area, not by internal module

## File Size and Organization

- **Target**: 100–300 lines per test file
- **Maximum**: 400 lines — if a file exceeds this, split it by feature sub-area
- **Minimum tests per file**: 2 — single-test files should be merged into a related file or expanded with missing coverage
- **Test count guideline**: Files with 10+ tests benefit from sub-describe blocks; files with 20+ tests must use them
- **No placeholder tests**: Never commit a test with a misleading name that tests unrelated behavior. Either implement the real test or omit it entirely

## Test Structure

```typescript
describe("package or plugin name", () => {
  describe("feature area", () => {
  // setup/teardown if needed

    test("describes specific behavior", () => {
      // test body
    })
  })
})
```

### Describe Naming

- **Top-level**: Must use the API/package name so test output immediately identifies what is being tested
  - Single-API packages: `"core"`, `"store"`, `"router"`, `"resource"`, `"resourceCache"`, `"css"`, `"cssVars"`
  - Multi-API packages (dom): use the specific API — `"mount"`, `"html"`, `"component"`, `"ForEach"`, `"Portal"`, `"$ref"`, `"$collection"`, `"lazy"`, `"element"`, `"registry"`
  - Related feature files: prefix with the API name — `"error handler"`, `"error boundary resolution"`, `"error reset"`, `"mount template"`, `"mount lifecycle"`
- **Nested** (when a file tests multiple distinct sub-features or has 10+ tests): feature area name — `"cleanup"`, `"middleware"`, `"nested"`, `"readonly"`, `"static routes"`, `"parameterized routes"`, `"polling visibility"`
- Avoid nesting deeper than 2 levels

### Sub-describe Blocks

Use nested `describe` blocks to organize tests when:

- A file has 10+ tests in a flat list — group by behavior: `"static routes"`, `"parameterized routes"`, `"redirects"`, `"not found"`
- Related tests test the same mechanism — group: `"change detection"`, `"empty updates"`, `"route specificity"`
- A file mixes concerns — group by concern: `"lifecycle hooks"`, `"error boundaries"`, `"cleanup"`

### Test Naming

- Descriptive phrases explaining the behavior, not the implementation
- Good: `"prevents duplicate renders in diamond pattern"`, `"fetches data successfully"`
- Bad: `"test 1"`, `"works correctly"`, `"should handle edge case"`, `"calls callbacks"`, `"handles errors"`
- **One behavior per test**: A test named "calls onSuccess and onError" tests two distinct behaviors — split into two tests
- **Name reflects what is asserted**: If a test verifies timeout does not interfere with a fast response, name it "timeout does not interfere with fast responses" not "accepts timeout option"

## Cross-File Organization

- **No overlap**: Each test file should own its feature area without duplicating assertions from other files
- **Misplaced tests**: Error-handling tests belong in `errors.test.ts`, not in `hooks.test.ts`
- **Feature-area tests**: If a file like `features.test.ts` exists, browser integration tests (popstate, hashchange) belong there, not in `routing.test.ts`
- **Edge cases**: Single-test `"edge cases"` describe blocks are a smell — the test likely belongs in an existing feature-area file

## Setup and Teardown

- Use `beforeEach` / `afterEach` when tests share mutable state that must be reset
- DOM tests: `beforeEach(() => { document.body.innerHTML = '<div id="app"></div>' })`
- Resource tests: `beforeEach(() => { resourceCache.map.clear() })`
- CSS tests: `beforeEach(() => { cssReset(); cssVarsReset() })`
- Router tests: `beforeEach` for container creation + `history.replaceState`; `afterEach` for container removal
- Restore mocked globals in `afterEach`: `globalThis.fetch = originalFetch`
- When no shared state exists, skip `beforeEach`/`afterEach` entirely
- **Console suppression consistency**: Use `beforeEach`/`afterEach` for console spies when most tests in a file need them; inline save/restore when only 1-2 tests need it

## Async Helpers (Globals)

These are preloaded in `utils/happydom.js`: never define them locally.

### `tick`

```typescript
tick()      // Microtask yield — same tick as before, resolves on next microtask
tick(ms)    // Real delay — waits ms milliseconds then resolves
```

- `await tick()`: yield to microtask queue for reactive updates (existing behavior)
- `await tick(ms)`: wait for real time to pass (replaces all fire-and-forget delay helpers)
- Use `tick(ms).then(() => val)` for lazy mock fetchers that compute values after delay

### `delay`

```typescript
delay(val, ms = 10)  // Returns val after ms milliseconds
```

- Returns a value after a delay — use as mock fetcher: `resource(() => delay(mockUser))`
- Default `ms` is `10`
- For fire-and-forget waits, use `tick(ms)` instead

### `wait`

```typescript
wait(fn, ms = 500)  // Poll until fn() returns true, reject on timeout
```

- Poll-until pattern: checks `fn()` every 10ms, resolves when truthy, rejects after `ms` timeout
- Use for asserting async state changes: `await wait(() => r.status() === "success")`
- Use consistently within a file — don't mix `wait()` and `tick(ms)` for the same polling purpose

## Console Suppression

```typescript
function suppressConsole() {
  const errors: unknown[][] = []
  const origError = console.error
  console.error = (...args: unknown[]) => errors.push(args)
  return {
    errors,
    restore: () => { console.error = origError }
  }
}
```

- Always use this pattern for error-boundary tests — never use `jest.spyOn`
- Always call `restore()` in the test body, not just in `afterEach`
- Never use `any`: use `unknown` for args arrays

For tests that only need to suppress and check call counts/args, use the `mock()` pattern:

```typescript
const origError = console.error
const consoleSpy = mock(() => {})
console.error = consoleSpy

// ... assertions using toHaveBeenCalledWith ...

console.error = origError
```

## Mock Patterns

### Tracking Function Calls

```typescript
const tracker = mock(() => {})
// ...
expect(tracker).toHaveBeenCalledTimes(2)
tracker.mockClear()
```

- Use `mock(() => {})` to create call-tracking stubs
- For mock functions that return values: `mock(() => ({ top: 100 }))`
- Name mock variables descriptively: `tracker`, `effectRuns`, `renderSpy`
- Use `mockClear()` between assertion phases within a single test when tracking phases independently
- **Always use `mock()`** for tracking — never use manual objects like `{ let called = false }` or boolean flag counters when `mock()` is available

### Mocking Globals

```typescript
let originalFetch: typeof globalThis.fetch

beforeEach(() => { originalFetch = globalThis.fetch })
afterEach(() => { globalThis.fetch = originalFetch })

// In test:
globalThis.fetch = (async () => ({ ok: true, json: async () => data })) as unknown as typeof globalThis.fetch
```

- Save original in `beforeEach`, restore in `afterEach`
- Use `as unknown as typeof X` for global reassignment
- Declare the backup variable with explicit type: `typeof globalThis.fetch`

## Assertion Patterns

- **Primitive equality**: `expect(value).toBe(expected)`
- **Deep equality**: `expect(obj).toEqual(expected)`
- **Boolean truthiness**: `expect(value).toBe(true)` over `expect(value).toBeTruthy()`
- **Call counts**: `expect(mockFn).toHaveBeenCalledTimes(n)`
- **Error throwing**: `expect(() => fn()).toThrow("message")`
- **DOM content**: `expect(el?.textContent).toBe("expected")`
- **CSS content**: `expect(styleEl?.textContent).toContain("color:red")`
- **Negation**: `expect(value).not.toBe(expected)`, `expect(mockFn).not.toHaveBeenCalled()`

## Async Test Patterns

- Use `async` test functions with `await`: avoid raw Promise chains
- `await tick()` for microtask yield (reactive updates)
- `await tick(ms)` for real delays (replaces `await delay(undefined, ms)`)
- `await delay(val, ms)` for mock fetchers that return values
- `await flush()` to force reactive update processing
- `await flushMount(el)` for DOM mount queue processing
- `await wait(() => someCondition())` for polling assertions

## Variable Naming

- **Signals**: Descriptive camelCase — `count`, `name`, `items`
- **Resources**: Short names — `r`, `r1`, `r2`
- **Stores**: `data`, `user`, `cart`
- **DOM elements**: `container`, `el`, `btn`
- **Mock trackers**: `tracker`, `effectRuns`, `renderSpy`
- **Counters**: `runs`, `fetchCount`, `clickCount`
- **Test data**: `mockUser`, `mockPosts`: prefix with `mock` when it's fixture data

## Comments

- **No comments** on obvious test logic — test names should explain intent
- **Inline comments** for non-obvious setup or subtle ordering requirements
- **ASCII dependency graphs** at the top of topology/complex reactive tests when they aid understanding
- Comments explain WHY, not WHAT

## Code Style

- **No semicolons** (match source code style)
- **Arrow functions** for helpers defined in-file
- **Function declarations** for reusable helpers like `suppressConsole()`
- **Avoid `any`**: use `unknown` where type is genuinely unknown
- **Ternary operators** for simple conditional values
- **Short-circuit `&&`** for conditional side effects
- **No AAA pattern**: tests flow naturally, not in rigid Arrange-Act-Assert sections
- **No comma-expression side effects**: `() => (++n, Promise.reject(...))` is clever but unclear — use multi-line arrow functions for clarity

## Test Coverage Goals

- Aim for 100% coverage of public API
- Test real-world integration patterns, not internal implementation details
- Never import non-public API functions (except babel plugin internal unit tests)
- Test error paths and edge cases alongside happy paths
- **No duplicate tests**: Each behavior should be tested exactly once in the most relevant file
