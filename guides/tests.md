# Test Style Guide

## Core Philosophy

Tests are documentation — a reader understands every behavior from tests alone. DRY above all: every repeated setup, assertion, or helper across files is a violation.

## Contents

Decision index — jump to the section for the decision you are making; do not scan linearly.

| Decision | Section |
|---|---|
| Which `test()`s does a plan scenario yield? | §Scenario → test() derivation |
| What to name the file? | §File-naming for tests |
| Is something banned? | §Anti-Patterns |
| Import sources/order? | §Test Framework |
| File size/grouping? | §Files |
| `describe` nesting, test naming? | §Test Structure |
| Reset, cleanup, patched globals? | §Shared State and Cleanup |
| Which async wait / delay form? | §Shared State and Cleanup → Async Tests |
| Mocking anything? | §Mock Patterns |
| Which assertion form? | §Assertion Patterns |
| How to access the DOM? | §DOM Element Access |
| Variable naming? | §Variable Naming |
| Comments / code style? | §Comments, §Code Style |
| What must be covered? | §Test Coverage |
| Running gates / triaging failures? | §Triage & Gate Semantics |
| Final audit before finishing? | §Verification Checklist |

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

- Import reactive primitives (`signal`, `effect`, `computed`, `batch`, `untracked`, `flush`, `scope`) from `@hellajs/core`; `onError` from `@hellajs/dom`; test helpers (`delay`, `suppressConsole`, `setupContainer`, `resetTestState`) from `@utils/test-helpers.js`. Never import a symbol whose module isn't listed — a needed primitive joins the existing `@hellajs/core` import, never a duplicate.
- Never `jest.fn()` / `jest.spyOn()` / `mock()` — `vi.fn()` from `vite-plus/test`.
- Never unawaited `expect(promise).rejects` / `.resolves` — under Vitest the expectation silently skips: `await expect(p).rejects.toThrow(...)`. A sync-style `expect(() => asyncFn()).toThrow()` never sees the rejection — assert `rejects`.
- Never `any` — `unknown` only. Never `it()` or `test.skip()` — always `test()`.
- Never two behaviors in one test (exception: sequential lifecycle tests, §Test Structure). Never AAA pattern. Never placeholder tests. Never mock reactive primitives — use real ones.
- Never repeat a helper across files — extract.
- Never `await flush()` — synchronous, returns `void`; bare `flush()`.
- Never the double-delay (`await delay(); await delay()`) — `await delay(0)` (macrotask) instead.
- Never track callback invocations with boolean flags (`let called = false`) or pure integer counters (`let runs = 0`) — `vi.fn()`. Renamed flags (`cleaned`, `handlerCalled`, `errorOccurred`, `asyncCompleted`) are the same pattern. Sole exception: a counter incremented inside a callback that **also** performs observable side effects (`count++; flush()`, DOM writes, network calls). Signal reads or value returns (`return signal()`) don't qualify — `vi.fn()`.
- Never assert generated output (CSS text, HTML strings, serialized forms) by substring alone when the artifact's **structure** is the contract — `toContain` passes inside structurally invalid output (`@font-face{{font-family:…}}` satisfied substring asserts while browsers parsed it to an empty rule). Every generated shape gets at least one exact-form `toBe` assert.

Enforcement: the `hella/tests-api` JS-plugin rule (`lint/hellajs.js`, registered in the `vite.config.ts` lint block) bans `it()`, `test.skip()`, and `jest.*` calls in test files; `mock()` and the rest are prose-enforced (audited via the checklist).

### Replace pattern

Wrap the side effect in `vi.fn()` — tracks the call and runs the effect in one step:

```typescript
// Before
let called = false;
const callback = () => { called = true; doWork(); };
register(callback);
expect(called).toBe(true);

// After
const callback = vi.fn(() => doWork());
register(callback);
expect(callback).toHaveBeenCalledTimes(1);
```

## Test Framework

- `vite-plus/test` only (Vitest 5 via the local vite-plus CLI — `vp test` runs it through the root `vite.config.ts`). Formatting follows guides/code.md §Formatting — oxfmt (`vp fmt`) is the style authority.
- Import order: `vite-plus/test` → `@hellajs/core` (reactive primitives, if needed) → `@utils/test-helpers.js` → package under test (`@hellajs/dom`) → `import type` (bare path, last) → local helpers (`./helpers`), if present.
- Separate `import type` statement — never inline.

```typescript
import { describe, test, expect, beforeEach, afterEach, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { delay, suppressConsole, setupContainer, resetTestState } from "@utils/test-helpers.js";
import { mount, onError } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import { fallbackHandler } from "./helpers";
```

- The §Verification Checklist must reflect the conventions in this section — keep both in sync.

## Files

- `{feature}.test.ts` — lowercase, hyphenated. The `.test`/`.spec` marker is load-bearing: omitting it makes the file invisible to `vp run coverage`. **Never run bare `vp test`/`vitest` for verification — always `vp run coverage <package>`** (§Triage & Gate Semantics).
- Names identify the **specific** API surface or behavior area (`scroll`, `active`, `crumbs`, `hash-mode`, `navigate-options`); categorical prefixes add no information. Category-only or surface-less naming signals mixed concerns — split.
- Group by feature area, not internal module.
- 100–300 lines target; soft cap 400 (trim duplication or split on a sub-feature seam); minimum 2 tests per file. The cap is advisory, not a gate: a file well past 400 flags in audit only when a clean sub-feature seam exists — when the file's split seam is a real contract boundary (e.g. mount-side vs hydrate-adopted wiring), a larger file beats tests filed under the wrong seam.

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
- **Observer-driven cleanup waits (element `remove()` → MutationObserver → effect disposal): poll with microtask hops + a mirror assert — never macrotask waits between staged removals.** `for (let __i = 0; __i < 50; __i++) { if (peekState(el) === undefined) break; await delay(); }` then `expect(peekState(el)).toBeUndefined();`. HappyDOM holds the observer's report closure only via `WeakRef` — a macrotask idle before a removal lets GC kill it, and the next removal is then NEVER reported (not late: never), so cleanup silently never runs. Microtask hops never idle the loop; delivery + cleanup are microtask-scheduled, so the loop settles within a few hops. Poll the state-carrying element: the node that owns the `hook:` wiring the wait covers — a hook-less component root never gains ElementState at all (`processMountQueue` skips state-less nodes), so polling the root never resolves, in mount waits or cleanup waits. `peekState` of a removed static wrapper is vacuously `undefined` at iteration 0.
- **GC-determinism tests (WeakRef canary + `gc?.()`): create the canary inside an async IIFE that fully unwinds before collecting, then a macrotask hop (`await delay(10)`) and repeated `gc?.()` passes.** `gc()` exists because the gate spawns `vp test` with `NODE_OPTIONS=--expose-gc`; V8 conservative stack scanning pins objects referenced by stale words in any still-live frame — a direct test-local canary survives every pass; block scoping does not clear context slots. A single gc pass can also leave weak targets un-swept.

### Package-Exported Testing Utilities

Imported from `@hellajs/dom` (re-exports of `internal/` state accessors — fair game per §Test Coverage). Prefer over waiting for the scoped MutationObserver:

| Utility | Purpose |
|---------|---------|
| `peekState(el)` | Read an element's ElementState without tracking — the observer-cleanup poll primitive |
| `getState` / `hasState` / `deleteState` | State assertions and explicit state teardown |
| `resetDom` | Full DOM-package state reset (what `resetTestState` builds on) |
| `checkMultiSelectors` / `multiSelectors` | Multi-selector registry inspection |

## Mock Patterns

- `vi.fn(() => {})` for call tracking; `vi.fn(() => value)` for return values. `mockClear()` between assertion phases.
- Pure call-tracking uses `vi.fn()`; signal reads/value returns never qualify for the side-effect counter exception (§Anti-Patterns).
- Global mocking: save in `beforeEach`, restore in `afterEach`, cast `as unknown as typeof X`.
- DOM API mocking: `Object.defineProperty` for readonly props; save/restore for prototype patching.
- Spy typing: type the recorded call signature with `vi.fn`'s explicit generic (`vi.fn<(type: string, opts?: unknown) => void>(() => {})`), never named-but-unused `_` params — the linter's `no-unused-vars` flags them.
- Time mocking (`Date.now`, `performance.now`): declare the mock-time closure at describe scope, capture the original in `beforeEach`, restore in `afterEach`. Tests needing the mock override it in-body and advance the closure; they never own the save/restore pair, so a failing assertion can't leak a frozen clock.
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
- Zero-arg fn/signal bindings bare in JSX children/attributes (`{toggle}`, `show={visible}`) — never `{() => toggle()}` (guides/code.md §Code Rules → Templates); a wrapper only when it consumes a param or composes.
- `unknown` only — never `any`. No AAA pattern — interleave setup, action, assertion.
- `test.each()` for parameterized tests; intentionally invalid inputs via `@ts-expect-error` or a cast to the accepted type (`42 as unknown as number[]`) — match the file's existing idiom; an invalid input against an overloaded function casts to one concrete overload shape (`undefined as unknown as DocOptions & { body: string }`) — a bare options-type cast fails TS2769 before the runtime throw runs.

## Test Coverage

- 100% of public API. Real-world integration patterns, not internals. Error and edge cases alongside happy paths. Each behavior tested exactly once in the most relevant file.
- **Barrel rule**: when `index.ts` re-exports a utility (type guard, predicate, env-probe, iterator helper), the authoring package **must** cover it — even if consumers also exercise it. The barrel defines the public surface; coverage follows the barrel. Consumer coverage doesn't protect the author from silent contract drift (a predicate whose name suggests general semantics but whose implementation is narrow).
- **Compile-shape rule**: when testing component-child handling (`Suspense`/`Lazy`/`ForEach`/`Portal`/`Transition`, or anything reading `props.children`), cover both child shapes — the compiled JSX array (`<Comp>{child}</Comp>`, `children: [child]`) and the direct-call single child (`component(Comp, { children: child })`). babel compiles JSX component children to an array; the single-child form survives only as a direct public call; a fix that passes for one shape can stringify or drop the other. Concrete miss: a `<Suspense>` fix that handled a bare function child passed every single-child test but still rendered `[object Promise]` for the compiled array — the array wasn't unwrapped before evaluation.
- **JSX authoring rule**: test markup is JSX — `.test.tsx` files, transformed at load by `vite-plugin-hellajs` through the root `vite.config.ts` (which also supplies the happy-dom environment for `vp test`). Markup reads as JSX (`<div id="x">{value}</div>`), compiled by `babel-plugin-hellajs` at test time — the same compiled path production code ships through.
- **Discrimination rule**: a scenario encoding a bug — the plan states today's broken behavior — is shown to FAIL against the pre-fix code before its DoD ticks: stash the fix, rebuild the bundle, run the scenario, restore (expected fail → pass). A timing-sequenced race scenario additionally places each step by causal order, not delay magnitude: the joining fetch lands after the superseded request's settle while the surviving request is still in flight. Concrete miss: a force-supersede dedup scenario joined before the prefetch settled — it passed against both the fixed and unfixed bundle, ticking a DoD it never verified; only the pre-fix run exposed it.
- Never import non-public APIs: functions/types not exported from `index.ts` are internal; exports from `index.ts` (including testing utilities from `internal/` modules) are fair game.
- **Carveout — `plugins/**`**: plugin internals (`src/**/*.mjs`) may be imported directly in unit tests when (a) the helpers are pure functions whose edge cases are impractical to reach through the public transform surface (single default export or visitor), and (b) no `index.ts` barrel exists to re-export them. Narrow: runtime packages keep the strict barrel-exclusive rule; `plugins/**` is the only scope where isolated parser/util tests outweigh the internal-import cost.

## Triage & Gate Semantics

How test gates are run and triaged. The verification gate is `vp run coverage` (§Scripts) paired with `vp run lint` — coverage runs no lint, so green coverage alone is never sufficient; these rules govern coverage's scoped form and failure handling.

- **No bare `vp test`/`vitest` for verification.** Tests import from `dist/` bundles; a bare runner never rebuilds them and silently tests stale code. Mid-flight iteration uses the triage form: `vp run bundle <package> --quiet && ./node_modules/.bin/vp test packages/<package>/tests[/<file>.test.tsx]` (explicit rebuild + scoped tests). The green baseline and final gate are always `vp run coverage <package>` + `vp run lint`.
- **Scoped-run scoping.** `vp run coverage <package>` scopes tests to the target package and runs no lint (`vp run lint` is its own gate, repo-wide). A scoped run failing on a file OUTSIDE the target is foreign, not yours: report the foreign failure, move on — `vp run lint` pairs with every gate run and is itself repo-wide, so a foreign lint red reports the same way; CI's unscoped pair re-checks the full repo.
- **Bundle-stage foreign block.** `bundle.ts --quiet` builds ALL packages before scoped tests run, so a foreign bundle failure blocks the target's own tests. Verify via `vp run bundle <package>` (explicit rebuild — honors no-stale-dist) followed by the scoped test command coverage runs internally (`vp test packages/<package>/tests --coverage`); report the foreign failure.
- **Gate-failure attribution.** A check failing on files outside your diff → `git status -sb` first; verify the files carry no edits of yours (concurrent user changes) before debugging your own work. Re-run the gate after the foreign change settles.
- **Plugin scoping.** `vp run coverage <plugin>` scopes tests to `plugins/<p>/tests` and narrows the coverage includes to the plugin's rows (source `.mjs` — plugins have no `dist/`; `vite`/`rollup` carry no suites and fail the tests-dir check). The bundle stage still runs before plugin tests: `plugins/astro`'s tests import `@hellajs/core`'s dist. Package-scoped runs still execute no plugin suites: a `packages/` change breaking them (serializer output, runtime contracts a plugin test asserts) surfaces only when a plugin unit executes — run the affected `vp run coverage <plugin>` (bare `./node_modules/.bin/vp test plugins/<p>/tests` mid-flight — plugin tests import source, not `dist/`) before declaring done when the change reaches what they assert.
- **Coverage blind spots.** `vp run coverage` runs bundle + tests only — no lint. The mechanical subset (the `hella/*` JS-plugin rules: `for…of`/`for…in` and raw typeof in `packages/*/lib`, banned test APIs in test files) is `vp run lint`'s to catch. Everything else — `guides/code.md`'s thin-wrapper ban, `lib/internal/` placement, single-callsite <30-line extraction, `@internal` visibility, and most of §Anti-Patterns — has no lint counterpart. A new file, file structure, or shared test helper → run `audit-tests` as part of verification.
- **Measurement target.** Coverage instruments the entry-graph per-module dist files (`dist/*.js` + `dist/internal/*.js`), the ui registry minus `cn.js`/`tokens*.js`, and `plugins/**/*.mjs` — not `lib/`: `lib/` is truth, the built dist artifact is the measurement. `bundle.js` is exercised by each package's `tests/bundle.test.ts` smoke test (export parity), not measured. A reading is point-in-time: re-run `vp run coverage` immediately before reporting coverage findings.

## Verification Checklist

Run this when holding a Tests file (`*.test.ts` / `*.spec.ts`). Each item is a yes/no or a command. This is the audit floor stated where the rules live; `audit-tests` reads it instead of reconstructing it from prose.

**Framework & imports**
- [ ] `vite-plus/test` only; `vp fmt --check` clean (guides/code.md §Formatting)
- [ ] All imports from correct sources: reactive primitives from `@hellajs/core`, `onError` from `@hellajs/dom`, test helpers from `@utils/test-helpers.js`
- [ ] Import order: `vite-plus/test` → `@hellajs/core` → `@utils/test-helpers.js` → package under test (bare specifier) → `import type` (bare path, last) → local helpers (e.g. `./helpers`), if present
- [ ] Separate `import type` statement; never inline

**File & structure**
- [ ] `{surface}.test.ts` — surface-named per §File-naming for tests, no categorical prefix
- [ ] Max two `describe` levels; at most one inner `describe` per file
- [ ] 100–300 lines target; soft cap 400 advisory (audit flags only far-past-400 files with a clean seam); minimum 2 tests per file

**Naming & shape**
- [ ] One behavior per `test()`; present tense, no "should"
- [ ] No AAA pattern — tests flow naturally
- [ ] `async` only when it `await`s; structure is act → await → assert

**Anti-patterns (none present)**
- [ ] No `{() => fn()}` wrapper bindings — zero-arg fns/signals bind bare (`{fn}`)
- [ ] No `jest.fn` / `jest.spyOn` / `mock()` — `vi.fn()` from `vite-plus/test` (jest.* enforced by `hella/tests-api`; `mock()` prose-enforced)
- [ ] No unawaited `.rejects`/`.resolves` — `await expect(p).rejects.toThrow(...)` (the expectation silently skips otherwise)
- [ ] No `any` (`unknown` only)
- [ ] No invalid-input call against an overloaded function cast to the bare options type — cast to one concrete overload shape (TS2769 otherwise)
- [ ] No `it()` or `test.skip()` (enforced by `hella/tests-api`)
- [ ] No bare `await delay()` used as double-delay — use `delay(0)` (macrotask) for multi-hop chains
- [ ] No macrotask waits (`delay(0)`/`delay(N)`/`delay(10)` polls) between staged DOM removals whose cleanup the test waits on — observer-driven cleanup waits use the microtask-hop `peekState` poll + mirror assert (HappyDOM WeakRef GC hazard)
- [ ] GC-determinism tests canary from an async IIFE that fully unwinds, with `await delay(10)` + repeated `gc?.()` before the deref assert (V8 conservative stack scanning)
- [ ] No boolean-flag or pure-integer call counters — `vi.fn()` (exception: counter with observable side effects)
- [ ] No substring-only asserts on generated output whose structure is the contract — at least one exact-form `toBe` per generated shape
- [ ] No helper duplicated across files — extracted to `tests/helpers.ts`

**State & cleanup**
- [ ] `beforeEach(() => { resetTestState(); })` on every file touching shared mutable state
- [ ] Patched browser globals saved in `beforeEach`, restored in `afterEach` (or try/finally)
- [ ] `afterEach` only for state `resetTestState()` does not cover

**Coverage**
- [ ] Every test asserts a behavior the source actually exposes (cross-checked against `lib/index.ts`)
- [ ] No test imports a symbol not exported from `lib/index.ts`
- [ ] `vp run coverage` shows 100% on the relevant source lines; overall not lower than baseline
- [ ] Component-child handling covered in BOTH child shapes — compiled JSX array (`children: [child]`) and direct-call single child (`children: child`)
- [ ] Markup authored as JSX in `.test.tsx` files (compiled by `vite-plugin-hellajs` through the root `vite.config.ts`)
- [ ] Bug-encoding scenario verified to fail against pre-fix code (stash → rebuild → run) before the DoD tick (§Test Coverage, Discrimination rule)

**Gate usage (§Triage & Gate Semantics)**
- [ ] No bare `vp test`/`vitest` used for verification — mid-flight iteration used the triage form; final gate was `vp run coverage <package|plugin>` + `vp run lint`
- [ ] Foreign failure triaged per protocol (own package verified clean, failure reported), not debugged as own work
- [ ] New file/structure/helper → `audit-tests` run (coverage's blind spots)
