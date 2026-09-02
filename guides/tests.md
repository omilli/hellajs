# Test Style Guide

## Core Philosophy

Tests are documentation. A reader should understand every behavior from tests alone. DRY above all — every repeated setup, assertion, or helper across files is a violation.

## Decision Precedence

1. **DRY** — shared helpers are mandatory. Two tests with the same setup means extract.
2. **Readability** — clear beats clever. Names describe behavior, not implementation.
3. **Coverage** — every public API path: happy, error, edge.
4. **Brevity** — short, never at DRY or clarity's expense.

## Scenario → test() derivation

When deriving tests from a plan's Behavioral scenarios (plan skill Phase 2), each scenario line becomes exactly one `test()`. This rule consolidates §Test Structure and §Naming so you do not synthesize across sections per scenario:

- One scenario line → one `test()`. Never two behaviors in one test (exception: sequential lifecycle tests — see §Test Structure).
- Name in present tense, describing the asserted behavior. No "should", no "test N", no "works correctly".
- Setup → action → assertion flows naturally (no AAA pattern).

Worked example:

- Scenario: `invalidates: ["user:"] + mutation success → invalidateByPrefix called with "user:"`
- `test("calls invalidateByPrefix on mutation success", () => { ... })`
- Scenario: `mutation aborts → no invalidation calls`
- `test("does not invalidate on mutation abort", () => { ... })`

## File-naming for tests

`{surface}.test.ts` — named after the specific API surface or behavior area, never a categorical prefix. When the surface is ambiguous, use the table:

| Change | File name | Reason |
|---|---|---|
| New option on a multi-method export (`invalidates` on `resource`) | `invalidates.test.ts` | the option/feature is the surface |
| Behavior of a single export (`signal` equality) | `signals.test.ts` | the export is the surface |
| A sub-area of a large export (router `active` state) | `active.test.ts` | the sub-area is the surface |
| Cross-cutting mode (hash-mode routing) | `hash-mode.test.ts` | the mode is the surface |

A file name that is only a category (`features-*.test.ts`, `unit-*.test.ts`) signals the file mixes concerns — split it.

## Anti-Patterns

- Import reactive primitives (`signal`, `effect`, `computed`, `batch`, `untracked`, `flush`, `scope`) from `@hellajs/core`. Import `onError` from `@hellajs/dom/bundle`. Import test helpers (`delay`, `suppressConsole`, `setupContainer`, `resetTestState`) from `@utils/test-helpers.js`. Never import a symbol whose module isn't listed — if you need a reactive primitive you didn't import, add it to the existing `@hellajs/core` import rather than creating a duplicate.
- Never use `jest.fn()` / `jest.spyOn()` / `vi.fn()` — use `mock()` from `bun:test`.
- Never use `any` — `unknown` only.
- Never use `it()` or `test.skip()` — always `test()`.
- Never test two behaviors in one test (exception: sequential lifecycle tests — see Test Structure).
- Never use AAA pattern — tests flow naturally.
- Never leave placeholder tests.
- Never mock reactive primitives — use real ones.
- Never repeat a helper across files — extract.
- Never `await flush()` — synchronous, returns `void`. Use bare `flush()`.
- Never use the double-delay (`await delay(); await delay()`). Use `await delay(0)` (macrotask) instead.
- Never track callback invocations with boolean flags (`let called = false`) or pure integer counters (`let runs = 0`) — use `mock()`. Renamed flags (`cleaned`, `handlerCalled`, `errorOccurred`, `asyncCompleted`) are the same pattern. The only exception: a counter incremented inside a callback that **also** performs observable side effects (`count++; flush()`, DOM writes, network calls). Signal reads or value returns (`return signal()`) don't qualify — use `mock()`.
- Never assert generated output (CSS text, HTML strings, serialized forms) by substring alone when the artifact's **structure** is the contract — `toContain` passes inside structurally invalid output (`@font-face{{font-family:…}}` satisfied substring asserts while browsers parsed it to an empty rule). Every generated shape gets at least one exact-form `toBe` assert.

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
- Import order: `bun:test` → `@hellajs/core` (reactive primitives, if needed) → `@utils/test-helpers.js` → package under test (`@hellajs/dom/bundle`) → `import type` (bare path, last) → local helpers (e.g. `./helpers`), if present.
- Separate `import type` statement — never inline.

```typescript
import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { delay, suppressConsole, setupContainer, resetTestState } from "@utils/test-helpers.js";
import { mount, html, onError } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";
import { fallbackHandler } from "./helpers";
```
- The §Verification Checklist must reflect the conventions in this section — keep both in sync.

## Files

- `{feature}.test.ts` — lowercase, hyphenated. The `.test`/`.spec` marker is load-bearing: omitting it makes the file invisible to `bun coverage`. **Never run `bun test` directly — always use `bun coverage <package>`.**
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
import { resetTestState } from "@utils/test-helpers.js";

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

### Async Tests

- Mark `async` only when it `await`s.
- Structure: **act → await → assert**.
- Use `delay()` (no args) to drain one microtask hop — equivalent to `await Promise.resolve()`. This is sufficient when exactly one microtask-bound continuation needs to settle (e.g. `signal.set(x)` → one effect callback). It is **NOT** sufficient for multi-hop chains (see below).
- Use `await delay(0)` (setTimeout 0) to cross a macrotask boundary — drains the entire pending microtask queue. Use when a multi-hop promise chain (`.then().catch()`), an async generator yield (the generator resumes on a separate microtask from each `yield`), or GC setup needs a full queue flush. This is the sanctioned alternative to the banned double-`delay()`.
- Use `await delay(N)` for a real-time wait of N ms (e.g. transition leave timer: `await delay(160); // duration(100) + safety buffer(50) + frame slack`).
- Use `await delay(val, ms)` to resolve a value after ms (mocking async APIs).
- Use a polling loop with `await delay(10)` for conditions where timing isn't contractually fixed: `for (let i = 0; i < 100; i++) { if (condition) break; await delay(10); }` — but see the observer-cleanup rule below before polling on DOM removals.
- **Observer-driven cleanup waits (element `remove()` → MutationObserver → effect disposal): poll with microtask hops + a mirror assert — never macrotask waits between staged removals.** `for (let __i = 0; __i < 50; __i++) { if (peekState(el) === undefined) break; await delay(); }` then `expect(peekState(el)).toBeUndefined();`. HappyDOM holds the observer's report closure only via `WeakRef` — any macrotask idle BEFORE a removal lets GC kill it, and the next removal is then NEVER reported (not late: never), so cleanup silently never runs. Microtask hops never idle the loop, and delivery + cleanup are microtask-scheduled, so the loop settles within a few hops. Poll the state-carrying element (the component root) — `peekState` of a removed static wrapper is vacuously `undefined` at iteration 0.
- Never double-delay — use `delay(0)` instead of `await delay(); await delay()`.

### Package-Exported Testing Utilities

Imported from `@hellajs/dom/bundle`. Use for deterministic lifecycle timing:

| Utility | Purpose |
|---------|---------|

Prefer over waiting for the scoped MutationObserver.

## Mock Patterns

- `mock(() => {})` for call tracking; `mock(() => value)` for return values.
- `mockClear()` between assertion phases.
- Pure call-tracking uses `mock()`. Signal reads/value returns don't qualify for the side-effect counter exception (see Anti-Patterns).
- Global mocking: save in `beforeEach`, restore in `afterEach`, cast `as unknown as typeof X`.
- DOM API mocking: `Object.defineProperty` for readonly props; save/restore for prototype patching.
- Spy typing: type a spy's recorded call signature with `mock`'s explicit generic (`mock<(type: string, opts?: unknown) => void>(() => {})`), never named-but-unused `_` params on the implementation — the eslint config carries no `argsIgnorePattern`, so they fail the gate.
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
- **Barrel rule**: when `index.ts` re-exports a utility (type guard, predicate, env-probe, iterator helper), the authoring package **must** cover it — even if consumers also exercise it. The barrel defines the public surface; coverage follows the barrel. Consumer coverage doesn't protect the author from silent contract drift (e.g. a predicate whose name suggests general semantics but whose implementation is narrow).
- **Compile-shape rule**: when testing component-child handling (`Suspense`/`Lazy`/`ForEach`/`Portal`/`Transition`, or anything reading `props.children`), cover BOTH compile shapes — the `html` tagged template (single child) AND JSX (`component(Comp, { children: [child] })`, an **array**). babel compiles JSX component children to an array while the `html` template passes a single child; a fix that passes for one shape can stringify or drop the other. Concrete miss: a `<Suspense>` fix that handled a bare function child passed every `html`-template test but still rendered `[object Promise]` for JSX `<Suspense>{() => …}</Suspense>` — the array wasn't unwrapped before evaluation.
- Never import non-public APIs. Functions/types not exported from `index.ts` are internal. Exports from `index.ts` (including testing utilities from `internal/` modules) are fair game.
- **Carveout — `plugins/**` build plugins**: Plugin internals (`src/**/*.mjs`) may be imported directly in unit tests when (a) the helpers are pure functions whose edge cases are impractical to reach through the plugin's public transform surface (single default export or visitor), and (b) there is no `index.ts` barrel to re-export them from. This exemption is narrow: runtime packages under `packages/` must keep the strict barrel-exclusive rule; `plugins/**` is the only scope where the practical benefit of isolated parser/util tests outweighs the internal-import cost.

## Verification Checklist

Run this when holding a Tests file (`*.test.ts` / `*.spec.ts`). Each item is a yes/no or a command. This is the audit floor stated where the rules live; the audit skill reads it instead of reconstructing it from prose.

**Framework & imports**
- [ ] `bun:test` only; double quotes, semicolons always
- [ ] All imports from correct sources: reactive primitives from `@hellajs/core`, `onError` from `@hellajs/dom/bundle`, test helpers from `@utils/test-helpers.js`
- [ ] Import order: `bun:test` → `@hellajs/core` → `@utils/test-helpers.js` → package under test (`/bundle` suffix) → `import type` (bare path, last) → local helpers (e.g. `./helpers`), if present
- [ ] Separate `import type` statement; never inline

**File & structure**
- [ ] `{surface}.test.ts` — surface-named per §File-naming for tests, no categorical prefix
- [ ] Max two `describe` levels; at most one inner `describe` per file
- [ ] 100–300 lines target (soft cap 400); minimum 2 tests per file

**Naming & shape**
- [ ] One behavior per `test()`; present tense, no "should"
- [ ] No AAA pattern — tests flow naturally
- [ ] `async` only when it `await`s; structure is act → await → assert

**Anti-patterns (none present)**
- [ ] No `jest.fn` / `jest.spyOn` / `vi.fn` — `mock()` from `bun:test`
- [ ] No `any` (`unknown` only)
- [ ] No `it()` or `test.skip()`
- [ ] No bare `await delay()` used as double-delay — use `delay(0)` (macrotask) for multi-hop chains
- [ ] No macrotask waits (`delay(0)`/`delay(N)`/`delay(10)` polls) between staged DOM removals whose cleanup the test waits on — observer-driven cleanup waits use the microtask-hop `peekState` poll + mirror assert (HappyDOM WeakRef GC hazard)
- [ ] No boolean-flag or pure-integer call counters — `mock()` (exception: counter with observable side effects)
- [ ] No substring-only asserts on generated output whose structure is the contract — at least one exact-form `toBe` per generated shape
- [ ] No helper duplicated across files — extracted to `tests/helpers.ts`

**State & cleanup**
- [ ] `beforeEach(() => { resetTestState(); })` on every file touching shared mutable state
- [ ] Patched browser globals saved in `beforeEach`, restored in `afterEach` (or try/finally)
- [ ] `afterEach` only for state `resetTestState()` does not cover

**Coverage**
- [ ] Every test asserts a behavior the source actually exposes (cross-checked against `lib/index.ts`)
- [ ] No test imports a symbol not exported from `lib/index.ts`
- [ ] `bun coverage` shows 100% on the relevant source lines; overall not lower than baseline
- [ ] Component-child handling covered in BOTH compile shapes — `html` template (single child) and JSX (`children: [child]` array)
