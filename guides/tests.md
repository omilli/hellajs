# Test Style Guide

## Core Philosophy

Tests are documentation — a reader understands every behavior from tests alone. DRY above all: every repeated setup, assertion, or helper across files is a violation.

## Decision Precedence

1. **DRY** — shared helpers mandatory; two tests with the same setup → extract.
2. **Readability** — clear beats clever; names describe behavior, not implementation.
3. **Coverage** — every public API path: happy, error, edge.
4. **Brevity** — short, never at DRY or clarity's expense.

## Scenario → test() derivation

Each of a plan's Behavioral scenarios becomes exactly one `test()`. This rule consolidates §Test Structure and §Naming so you do not synthesize across sections per scenario:

- One scenario line → one `test()`. Never two behaviors in one test (exception: sequential lifecycle tests, §Test Structure).
- Present-tense name describing the asserted behavior. No "should", no "test N", no "works correctly".
- Setup → action → assertion flows naturally (no AAA pattern).

Worked example:

- Scenario: `invalidates: ["user:"] + mutation success → invalidateByPrefix called with "user:"` → `test("calls invalidateByPrefix on mutation success", ...)`
- Scenario: `mutation aborts → no invalidation calls` → `test("does not invalidate on mutation abort", ...)`

## File-naming for tests

`{surface}.test.ts` — named after the specific API surface or behavior area, never a categorical prefix:

| Change | File name | Reason |
|---|---|---|
| New option on a multi-method export (`invalidates` on `resource`) | `invalidates.test.ts` | the option/feature is the surface |
| Behavior of a single export (`signal` equality) | `signals.test.ts` | the export is the surface |
| A sub-area of a large export (router `active` state) | `active.test.ts` | the sub-area is the surface |
| Cross-cutting mode (hash-mode routing) | `hash-mode.test.ts` | the mode is the surface |

A file name that is only a category (`features-*.test.ts`, `unit-*.test.ts`) signals the file mixes concerns — split it.

## Anti-Patterns

- Import reactive primitives (`signal`, `effect`, `computed`, `batch`, `untracked`, `flush`, `scope`) from `@hellajs/core`; `onError` from `@hellajs/dom/bundle`; test helpers (`delay`, `suppressConsole`, `setupContainer`, `resetTestState`) from `@utils/test-helpers.js`. Never import a symbol whose module isn't listed — a needed primitive joins the existing `@hellajs/core` import, never a duplicate.
- Never `jest.fn()` / `jest.spyOn()` / `vi.fn()` — `mock()` from `bun:test`.
- Never `any` — `unknown` only. Never `it()` or `test.skip()` — always `test()`.
- Never two behaviors in one test (exception: sequential lifecycle tests, §Test Structure). Never AAA pattern. Never placeholder tests. Never mock reactive primitives — use real ones.
- Never repeat a helper across files — extract.
- Never `await flush()` — synchronous, returns `void`; bare `flush()`.
- Never the double-delay (`await delay(); await delay()`) — `await delay(0)` (macrotask) instead.
- Never track callback invocations with boolean flags (`let called = false`) or pure integer counters (`let runs = 0`) — `mock()`. Renamed flags (`cleaned`, `handlerCalled`, `errorOccurred`, `asyncCompleted`) are the same pattern. Sole exception: a counter incremented inside a callback that **also** performs observable side effects (`count++; flush()`, DOM writes, network calls). Signal reads or value returns (`return signal()`) don't qualify — `mock()`.
- Never assert generated output (CSS text, HTML strings, serialized forms) by substring alone when the artifact's **structure** is the contract — `toContain` passes inside structurally invalid output (`@font-face{{font-family:…}}` satisfied substring asserts while browsers parsed it to an empty rule). Every generated shape gets at least one exact-form `toBe` assert.

### Replace pattern

Wrap the side effect in `mock()` — tracks the call and runs the effect in one step:

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
- Import order: `bun:test` → `@hellajs/core` (reactive primitives, if needed) → `@utils/test-helpers.js` → package under test (`@hellajs/dom/bundle`) → `import type` (bare path, last) → local helpers (`./helpers`), if present.
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

- `{feature}.test.ts` — lowercase, hyphenated. The `.test`/`.spec` marker is load-bearing: omitting it makes the file invisible to `bun coverage`. **Never run `bun test` directly — always `bun coverage <package>`** (§Triage & Gate Semantics).
- Names identify the **specific** API surface or behavior area (`scroll`, `active`, `crumbs`, `hash-mode`, `navigate-options`); categorical prefixes add no information. Category-only or surface-less naming signals mixed concerns — split.
- Group by feature area, not internal module.
- 100–300 lines target; soft cap 400 (trim duplication or split on a sub-feature seam); minimum 2 tests per file.

## Test Structure

Max depth: two `describe` levels — outer (feature/package) + inner (sub-area). At most **one** inner `describe` per file — a second sibling inner `describe` moves to its own file. The file name is the grouping mechanism; co-locating sibling inner describes hides how many concerns a file covers and lets it grow past the soft cap before a split is due.

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

A single scenario verified through sequential steps (render → update → reorder) is one test — each step depends on the prior step's DOM state. Independent behaviors are separate tests.

## Shared State and Cleanup

### `beforeEach` with `resetTestState()`

Every file touching shared mutable state uses exactly:

```typescript
import { resetTestState } from "@utils/test-helpers.js";

beforeEach(() => {
  resetTestState();
});
```

Skip it for files with zero shared mutable state (pure logic, no DOM/cache/error handlers). A test creating its own `signal`/`store`/`effect` inside the body does **not** touch shared state — subscriptions are local. Reset is required only when a test reads/writes module-level reactive singletons (internal state maps, global error handlers, DOM observer registries). For packages whose only shared state is module-level signals the public API reinitializes on each call (`router(config)` overwriting routes/hooks/redirects), per-test invocation satisfies the requirement; a signal that persists across such a call (LRU cache, observer registry, connection pool) needs an explicit reset path.

`resetTestState(html?)` may be called mid-test when a sequential lifecycle test needs a fresh DOM between sub-scenarios (multiple Portal insert types) — preferable to splitting tests when sub-scenarios share conceptual context.

Fresh containers per test? Create in `beforeEach` after `resetTestState()`, remove in `afterEach`.

### `afterEach`

Only when `resetTestState()` doesn't cover all shared mutable state. `resetTestState()` clears DOM body, CSS styles, DOM package state (queues, mount/cleanup scheduling, MutationObserver registrations, selector registry, event listeners, delegated handler counts), error handlers. `afterEach` is for state **not** in that list:

```typescript
afterEach(() => {
  multiSelectors.clear();
});
```

Prefer extending `resetTestState()` over per-file `afterEach`; use `afterEach` only for cleanup specific to a subset of tests.

### Patched browser globals

Any test reassigning a global (`window.scrollTo = ...`, `global.window = {...}`, `console.error = ...`) captures the original in `beforeEach` and restores in `afterEach`, or wraps the body in `try { ... } finally { restore(); }`. A trailing restoration assignment is unacceptable — a failing assertion before it leaks the mock into later files.

### Async Tests

- Mark `async` only when it `await`s. Structure: **act → await → assert**.
- `delay()` (no args) drains one microtask hop (`= await Promise.resolve()`) — sufficient when exactly one microtask-bound continuation must settle (`signal.set(x)` → one effect callback). **NOT** sufficient for multi-hop chains.
- `await delay(0)` (setTimeout 0) crosses a macrotask boundary, draining the entire pending microtask queue — use for multi-hop promise chains (`.then().catch()`), async generator yields (each `yield` resumes on a separate microtask), or GC setup needing a full flush. The sanctioned alternative to the banned double-`delay()`.
- `await delay(N)` — a real-time wait of N ms (transition leave timer: `await delay(160); // duration(100) + safety buffer(50) + frame slack`).
- `await delay(val, ms)` — resolve a value after ms (mocking async APIs).
- Polling loop `await delay(10)` for conditions with no contractually fixed timing: `for (let i = 0; i < 100; i++) { if (condition) break; await delay(10); }` — but see the observer-cleanup rule before polling on DOM removals.
- **Observer-driven cleanup waits (element `remove()` → MutationObserver → effect disposal): poll with microtask hops + a mirror assert — never macrotask waits between staged removals.** `for (let __i = 0; __i < 50; __i++) { if (peekState(el) === undefined) break; await delay(); }` then `expect(peekState(el)).toBeUndefined();`. HappyDOM holds the observer's report closure only via `WeakRef` — a macrotask idle before a removal lets GC kill it, and the next removal is then NEVER reported (not late: never), so cleanup silently never runs. Microtask hops never idle the loop; delivery + cleanup are microtask-scheduled, so the loop settles within a few hops. Poll the state-carrying element (the component root) — `peekState` of a removed static wrapper is vacuously `undefined` at iteration 0.

### Package-Exported Testing Utilities

Imported from `@hellajs/dom/bundle` (re-exports of `internal/` state accessors — fair game per §Test Coverage). Prefer over waiting for the scoped MutationObserver:

| Utility | Purpose |
|---------|---------|
| `peekState(el)` | Read an element's ElementState without tracking — the observer-cleanup poll primitive |
| `getState` / `hasState` / `deleteState` | State assertions and explicit state teardown |
| `resetDom` | Full DOM-package state reset (what `resetTestState` builds on) |
| `checkMultiSelectors` / `multiSelectors` | Multi-selector registry inspection |

## Mock Patterns

- `mock(() => {})` for call tracking; `mock(() => value)` for return values. `mockClear()` between assertion phases.
- Pure call-tracking uses `mock()`; signal reads/value returns never qualify for the side-effect counter exception (§Anti-Patterns).
- Global mocking: save in `beforeEach`, restore in `afterEach`, cast `as unknown as typeof X`.
- DOM API mocking: `Object.defineProperty` for readonly props; save/restore for prototype patching.
- Spy typing: type the recorded call signature with `mock`'s explicit generic (`mock<(type: string, opts?: unknown) => void>(() => {})`), never named-but-unused `_` params — eslint carries no `argsIgnorePattern`; they fail the gate.
- Time mocking (`Date.now`, `performance.now`): declare the mock-time closure at describe scope, override in `beforeEach`, restore in `afterEach`. Tests advance the closure; they never own the save/restore pair, so a failing assertion can't leak a frozen clock.
- Error handler setup: extract the common `onError` pattern into a shared helper (`fallbackHandler(defaultNode)`) in `tests/helpers.ts`; call it at the top of each test instead of repeating the lambda.

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

Query `document` directly via `getElementById`; `setupContainer()` only when a test needs an isolated root.

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
- Section comments to group assertions in long tests; ASCII dependency graphs for topology/complex reactive tests; inline comments for non-obvious setup or ordering.
- Comments explain **why**, not **what**.

## Code Style

- Semicolons always; arrow functions for inline helpers.
- `unknown` only — never `any`. No AAA pattern — interleave setup, action, assertion.
- `test.each()` for parameterized tests; `@ts-expect-error` for intentionally invalid inputs.

## Test Coverage

- 100% of public API. Real-world integration patterns, not internals. Error and edge cases alongside happy paths. Each behavior tested exactly once in the most relevant file.
- **Barrel rule**: when `index.ts` re-exports a utility (type guard, predicate, env-probe, iterator helper), the authoring package **must** cover it — even if consumers also exercise it. The barrel defines the public surface; coverage follows the barrel. Consumer coverage doesn't protect the author from silent contract drift (a predicate whose name suggests general semantics but whose implementation is narrow).
- **Compile-shape rule**: when testing component-child handling (`Suspense`/`Lazy`/`ForEach`/`Portal`/`Transition`, or anything reading `props.children`), cover BOTH compile shapes — the `html` tagged template (single child) AND JSX (`component(Comp, { children: [child] })`, an **array**). babel compiles JSX component children to an array while the `html` template passes a single child; a fix that passes for one shape can stringify or drop the other. Concrete miss: a `<Suspense>` fix that handled a bare function child passed every `html`-template test but still rendered `[object Promise]` for JSX — the array wasn't unwrapped before evaluation.
- Never import non-public APIs: functions/types not exported from `index.ts` are internal; exports from `index.ts` (including testing utilities from `internal/` modules) are fair game.
- **Carveout — `plugins/**`**: plugin internals (`src/**/*.mjs`) may be imported directly in unit tests when (a) the helpers are pure functions whose edge cases are impractical to reach through the public transform surface (single default export or visitor), and (b) no `index.ts` barrel exists to re-export them. Narrow: runtime packages keep the strict barrel-exclusive rule; `plugins/**` is the only scope where isolated parser/util tests outweigh the internal-import cost.

## Triage & Gate Semantics

How test gates are run and triaged. `bun coverage` (§Scripts) is the single verification gate; these rules govern its scoped form and failure handling.

- **No bare `bun test` for verification.** Tests import from `dist/` bundles; `bun test` never rebuilds them and silently tests stale code. Mid-flight iteration uses the triage form: `bun bundle <package> --quiet && bun test packages/<package>/tests[/<file>.test.ts]` (explicit rebuild + scoped tests). The green baseline and final gate are always `bun coverage <package>`.
- **Scoped-run scoping.** `bun coverage <package>` scopes tests + eslint to the target package; its `tsc` and guard stages stay repo-wide. A scoped run failing on a file OUTSIDE the target is foreign, not yours: confirm your package clean (`bunx eslint packages/<pkg>`), report the foreign failure, move on — CI's unscoped `bun coverage` owns the full-repo gate.
- **Bundle-stage foreign block.** `bundle.ts --quiet` builds ALL packages before scoped tests run, so a foreign bundle failure blocks the target's own tests. Verify via `bun bundle <package>` (explicit rebuild — honors no-stale-dist) followed by the scoped test command coverage runs internally (`bun test packages/<package>/tests --coverage`); report the foreign failure.
- **Gate-failure attribution.** A check failing on files outside your diff → `git status -sb` first; verify the files carry no edits of yours (concurrent user changes) before debugging your own work. Re-run the gate after the foreign change settles.
- **Plugin exception.** `bun coverage <plugin>` fails — `isValidPackage` resolves under `packages/` only. For plugins, use `bun test plugins/<p>/tests` + `bun lint`. Plugin tests import source, not `dist/` — except `plugins/babel/tests/parity.test.ts`, whose runtime side imports the `@hellajs/dom` dist bundle: `bun bundle dom --quiet` first when dom's template parsing changes.
- **Coverage blind spots.** `bun coverage` runs tsc + eslint + tests but enforces NEITHER the guides' structural rules (`guides/code.md`: thin-wrapper ban, `lib/internal/` placement, single-callsite <30-line extraction, `for…of`/`for…in`, `@internal` visibility) NOR this guide's anti-patterns (§Anti-Patterns) — no lint counterpart exists. A new file, file structure, or shared test helper → run `audit` against the matching guide as part of verification.
- **Measurement target.** Coverage instruments built bundles (`dist/`), not `lib/` — `lib/` is truth, the bundle is the measurement. A reading is point-in-time: re-run `bun coverage` immediately before reporting coverage findings.

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

**Gate usage (§Triage & Gate Semantics)**
- [ ] No bare `bun test` used for verification — mid-flight iteration used the triage form; final gate was `bun coverage <package>`
- [ ] Foreign failure triaged per protocol (own package verified clean, failure reported), not debugged as own work
- [ ] Plugins verified via the plugin exception path, not `bun coverage`
- [ ] New file/structure/helper → `audit` run against the matching guide (coverage's blind spots)
