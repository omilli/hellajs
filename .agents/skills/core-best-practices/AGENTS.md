# core-best-practices

Compiled by `vp run skills-build` from `rules/` - never hand-edit; regenerate instead.

Best practices for @hellajs/core, the reactive-graph package underlying every HellaJS library: signal writes, computed derivations, effect lifecycle, deferred flushing, scope disposal, and environment probes. Every rule is grounded in the package source and test suite.

- Version: 1.0.0
- Organization: HellaJS
- Date: 2026-11-04

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Contents
- 1. Signals and collection signals
  - 1.1 Use collection signals for lists, maps, and sets (`sig-collections-granular`)
  - 1.2 Configure content equality for structured signal values (`sig-equality-content`)
  - 1.3 Replace signal values, never mutate in place (`sig-replace-not-mutate`)
  - 1.4 Passing undefined writes; only a no-argument call reads (`sig-undefined-is-a-write`)
- 2. Computed derivation
  - 2.1 Gate derived array and object results with equality (`cmp-equality-gate`)
  - 2.2 Keep computed synchronous and side-effect free (`cmp-sync-pure`)
  - 2.3 Handle errors inside computed, not at read sites (`cmp-throw-retries`)
- 3. Effects and tracking
  - 3.1 Never create effects inside effects (`eff-nested-accumulation`)
  - 3.2 Return cleanup functions from effects (`eff-return-cleanup`)
  - 3.3 Keep effect bodies synchronous (`eff-sync-only`)
  - 3.4 Wrap incidental reads in untracked (`eff-untracked-reads`)
- 4. Scheduling and lifecycle
  - 4.1 Trust auto-batching for same-tick writes (`sched-deferred-flush`)
  - 4.2 Reach for flush only to drain a stalled queue (`sched-flush-advanced`)
  - 4.3 Collect effects in scopes and dispose on teardown (`sched-scope-dispose`)
- 5. Environment guards
  - 5.1 Probe the platform with hasWindow, hasDocument, hasNavigator (`env-probe-globals`)

## 1. Signals and collection signals

### 1.1 Use collection signals for lists, maps, and sets

**Impact: HIGH** - whole-container signals wake every reader on any element change, the exact churn the collection signals exist to prevent

`signalArray`, `signalMap`, and `signalSet` maintain one child signal per element plus a structural version signal. A value write (`set(i, v)`, map `set(k, v)`) wakes only that element's readers; structural operations (`push`, `pop`, `splice`, `insert`, `delete`) reorder nodes and bump the version with zero child writes. A plain `signal(items[])` forces a whole-array replacement for every element edit, waking every reader of every element. Prefer `signalMap`'s `entry(k)` for stable per-key handles and `signalSet`'s `has(v)` for per-value membership tracking; calling the container with no arguments reads a fresh snapshot that tracks everything.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const names = signal(["Ada", "Grace"]);
effect(() => {
  console.log(names()[0]);
});
// One element appended via whole-array replacement: every reader of every
// element wakes on the new reference
names([...names(), "Barbara"]);
```

**Correct (what is right):**

```ts
import { effect, signalArray } from "@hellajs/core";

const names = signalArray(["Ada", "Grace"]);
effect(() => {
  console.log(names.get(0)); // wakes on element-0 writes and structural changes
});
names.set(0, "Ada Lovelace"); // one child write: element-0 readers only
names.push("Barbara"); // structural: version bump, positional readers wake
console.log(names.length()); // tracks the version only
```

Reference: `packages/core/lib/signalArray.ts` and `packages/core/lib/signalMap.ts` and `packages/core/lib/signalSet.ts` and `packages/core/docs/api/signalarray.mdx` and `packages/core/docs/concepts/reactivity.mdx`

### 1.2 Configure content equality for structured signal values

**Impact: HIGH** - default reference equality propagates every fresh object or array literal, re-running downstream effects on content-equal writes

Every new object or array reference propagates by default. When callers rebuild structured values (spread updates, mapper output, parsed payloads), install an `equals` comparator: returning `true` skips the write entirely, keeps the old reference, and stops propagation. Default equality already treats `NaN` as self-equal and `+0`/`-0` as equal; pass `Object.is` as `equals` when `+0`/`-0` must differ. Comparators run against the freshest staged value, so sequential writes compare against the last write, not the initial value.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const todos = signal([{ id: 1 }]);
effect(() => {
  console.log(todos().length);
});
todos([{ id: 1 }]); // new array literal: reference-unequal, the effect re-runs for nothing
```

**Correct (what is right):**

```ts
import { effect, signal } from "@hellajs/core";

const todos = signal([{ id: 1 }], {
  equals: (a, b) => a.length === b.length && a.every((t, i) => t.id === b[i]?.id),
});
effect(() => {
  console.log(todos().length);
});
todos([{ id: 1 }]); // content-equal: write skipped, no propagation
todos([{ id: 2 }]); // content-changed: propagates
```

Reference: `packages/core/lib/signal.ts` and `packages/core/tests/signal-equality.test.ts` and `packages/core/docs/concepts/reactivity.mdx`

### 1.3 Replace signal values, never mutate in place

**Impact: CRITICAL** - in-place mutation keeps the old reference, so subscribers are never notified and readers see stale derived state

Change detection compares references by default (`isEqual` in `lib/internal/utils.ts`: `a === b` with `NaN` self-equal). The setter stages a new value and propagates only when the reference differs; mutating the stored object or array leaves the reference identical, so the write block never runs, no subscriber is notified, and every computed/effect reading the signal keeps serving the pre-mutation view it already rendered. Always build and set a new object or array.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const user = signal({ name: "Ada", role: "admin" });
effect(() => {
  console.log(user().role);
});
// Same reference after mutation: no propagation, the effect never re-runs
user().role = "owner";
```

**Correct (what is right):**

```ts
import { effect, signal } from "@hellajs/core";

const user = signal({ name: "Ada", role: "admin" });
effect(() => {
  console.log(user().role);
});
// New reference: the equality gate sees the change and propagates
user({ ...user(), role: "owner" });
```

For element-granular lists, prefer `signalArray` (see the collection rule) over spreading whole arrays.

Reference: `packages/core/lib/signal.ts` and `packages/core/lib/internal/utils.ts isEqual` and `packages/core/docs/api/signal.mdx`

### 1.4 Passing undefined writes; only a no-argument call reads

**Impact: MEDIUM** - treating undefined as a read or as absence silently clears stored state

The getter/setter discriminator is `arguments.length`, not value identity. `s()` reads; `s(undefined)` writes `undefined`, and the setter returns `void`, so no default-on-read pattern exists. `signal<T>()` without an initial value legitimately starts `undefined`, making a stored `undefined` indistinguishable from never-set; use `??` at read sites for fallbacks and call the setter with `undefined` only when deliberately clearing.

**Incorrect (what is wrong):**

```ts
import { signal } from "@hellajs/core";

const userId = signal<number>();
// Not a read with a default: a WRITE that clears the signal and yields
// undefined (the setter returns void)
const id = userId(undefined);
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";

const userId = signal<number>(); // undefined until first set
const id = userId() ?? 0; // read, with the fallback at the read site
userId(undefined); // deliberate clear back to undefined
```

Reference: `packages/core/lib/signal.ts` and `packages/core/tests/signals.test.ts` and `packages/core/docs/api/signal.mdx`


## 2. Computed derivation

### 2.1 Gate derived array and object results with equality

**Impact: HIGH** - map/filter derivations allocate a fresh reference per recompute, re-running downstream effects even when the derived content is unchanged

A `computed` whose getter allocates (`map`, `filter`, spread, object literal) produces a new reference on every recompute, and the default reference check sees a change: downstream effects re-run regardless of content. Pass an `equals` comparator to `computed`: an equal recomputed result keeps the old cached reference and stops propagation at that node, so downstream effects skip the run entirely. The comparator is skipped on the first evaluation (previous value is `undefined`).

**Incorrect (what is wrong):**

```ts
import { computed, effect, signal } from "@hellajs/core";

const items = signal([1, 2, 3]);
const doubled = computed(() => items().map((x) => x * 2));
effect(() => {
  console.log(doubled().length);
});
items([1, 2, 3]); // new input reference: map() allocates a fresh array, downstream re-runs
```

**Correct (what is right):**

```ts
import { computed, effect, signal } from "@hellajs/core";

const items = signal([1, 2, 3]);
const doubled = computed(() => items().map((x) => x * 2), {
  equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
});
effect(() => {
  console.log(doubled().length);
});
items([1, 2, 3]); // recomputes to an equal result: propagation stops here
```

Reference: `packages/core/lib/computed.ts` and `packages/core/tests/computed-equality.test.ts` and `packages/core/docs/api/computed.mdx`

### 2.2 Keep computed synchronous and side-effect free

**Impact: CRITICAL** - an async computed caches the Promise itself instead of the payload, and writes inside a derivation re-enter propagation mid-evaluation

The computed getter runs synchronously inside the graph's evaluation context; dependencies are whatever signals it reads before returning. An `async` getter returns a pending `Promise` on first read and that Promise becomes the cached value: subscribers receive a promise, never the resolved payload, and every signal read after the first `await` happens outside the tracking context and subscribes nothing. Writing signals inside a derivation is equally wrong: it mutates graph state during evaluation. Derive values only; put side effects in `effect`, and resolve async work by writing a signal from `.then` callbacks.

**Incorrect (what is wrong):**

```ts
import { computed, signal } from "@hellajs/core";

const userId = signal(1);
const profile = computed(async () => {
  const res = await fetch(`/api/users/${userId()}`);
  return res.json();
});
// The cached value is the Promise itself, never the fetched payload, and
// any signal read after the first await subscribes nothing
```

**Correct (what is right):**

```ts
import { computed, signal } from "@hellajs/core";

const userId = signal(1);
const userKey = computed(() => `user-${userId()}`); // sync, pure, tracked
```

Async data belongs in a signal written from an effect's `.then` chain (see the synchronous-effects rule).

Reference: `packages/core/lib/computed.ts` and `packages/core/docs/api/computed.mdx` and `packages/core/docs/concepts/reactivity.mdx`

### 2.3 Handle errors inside computed, not at read sites

**Impact: HIGH** - an unhandled throw re-executes the getter on every read and rethrows, and dependencies read after the throw point are pruned

A throw inside a computed marks the node dirty again before rethrowing: every read re-executes the getter and rethrows, never serving the stale cache and never `undefined`. Dependencies read after the throw point are pruned by the run's cleanup, so the surviving subscription set is whatever was read before the failure. A `try`/`catch` inside the getter preserves tracking and yields a usable value on every read; reserve read-site handling for errors no fallback can absorb.

**Incorrect (what is wrong):**

```ts
import { computed, signal } from "@hellajs/core";

const raw = signal('{"n":1}');
// No inner handling: once raw holds invalid JSON, every read re-executes the
// getter and rethrows - callers cannot recover a value, only the error
const parsed = computed(() => JSON.parse(raw()) as { n: number });
```

**Correct (what is right):**

```ts
import { computed, signal } from "@hellajs/core";

const raw = signal('{"n":1}');
const parsed = computed(() => {
  try {
    return JSON.parse(raw()) as { n: number };
  } catch {
    return { n: 0 }; // fallback: every read stays usable, tracking preserved
  }
});
console.log(parsed().n);
```

Reference: `packages/core/lib/internal/execution.ts updateComputed` and `packages/core/tests/computed.test.ts` and `packages/core/docs/api/computed.mdx`


## 3. Effects and tracking

### 3.1 Never create effects inside effects

**Impact: HIGH** - nested effects accumulate: each parent re-run creates another child and old children keep firing on their own dependencies until explicitly disposed

Effects do not auto-dispose their children: re-running a parent creates new child effects while the old ones stay alive, each still subscribed to its own dependencies, duplicating side effects on every later change. Express the varying condition inside a single effect instead. Conditional reads are the model, not a hazard: dependencies are re-collected on every run, so reads in the inactive branch drop out automatically and the subscription set tracks the active branch.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const enabled = signal(false);
const query = signal("");
effect(() => {
  enabled(); // flips re-run this parent
  // Every re-run creates ANOTHER child; old children are never disposed and
  // keep firing on their own dependencies
  effect(() => {
    console.log(query());
  });
});
```

**Correct (what is right):**

```ts
import { effect, signal } from "@hellajs/core";

const enabled = signal(false);
const query = signal("");
effect(() => {
  // One effect, branching: the inactive branch's subscriptions drop out on
  // each re-run
  if (enabled()) {
    console.log(query().toUpperCase());
  } else {
    console.log("idle");
  }
});
```

When an external registry must own a nested effect's lifetime, `effect(fn, { separate: true })` decouples it from the parent, but the accumulation rule still applies: the registry, not the graph, disposes it.

Reference: `packages/core/lib/effect.ts` and `packages/core/tests/effect-lifecycle.test.ts` and `packages/core/tests/topology.test.ts` and `packages/core/docs/concepts/reactivity.mdx`

### 3.2 Return cleanup functions from effects

**Impact: HIGH** - without a returned cleanup every re-run stacks another listener or timer and disposal leaks them all

An effect captures a returned function as its cleanup and runs it before every re-execution and on disposal. Any resource acquired inside the body (event listeners, timers, subscriptions, observers) must be released through that return value; non-function returns are ignored. A cleanup may even call the effect's own disposer to stop the re-run entirely.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const mode = signal("touch");
const width = signal(0);
effect(() => {
  const handler = () => width(window.innerWidth);
  window.addEventListener(mode() === "touch" ? "touchstart" : "mousedown", handler);
  // No returned cleanup: every mode change binds another handler, and none
  // is ever removed
});
```

**Correct (what is right):**

```ts
import { effect, signal } from "@hellajs/core";

const mode = signal("touch");
const width = signal(0);
effect(() => {
  const handler = () => width(window.innerWidth);
  const event = mode() === "touch" ? "touchstart" : "mousedown";
  window.addEventListener(event, handler);
  return () => window.removeEventListener(event, handler); // before each re-run and on dispose
});
```

Reference: `packages/core/lib/effect.ts` and `packages/core/tests/effect-lifecycle.test.ts` and `packages/core/docs/api/effect.mdx`

### 3.3 Keep effect bodies synchronous

**Impact: CRITICAL** - an async effect returns before reading dependencies, so nothing is tracked and the effect never re-runs

Dependency tracking is active only while the effect function runs synchronously. An `async` function returns a pending `Promise` at the first `await`; the tracking context is already restored by then, so every signal read after the first `await` subscribes nothing. The effect executes once and never re-runs. Keep the body synchronous, and start async work (fetch, timers, promises) inside the sync body, resolving results by writing signals from `.then` callbacks.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const count = signal(0);
const latest = signal(0);
effect(async () => {
  await Promise.resolve(); // returns to the microtask queue: tracking context gone
  latest(count()); // untracked read - this effect never re-runs on count
});
```

**Correct (what is right):**

```ts
import { effect, signal } from "@hellajs/core";

const count = signal(0);
const latest = signal(0);
effect(() => {
  const value = count(); // tracked: read in the synchronous body
  void Promise.resolve(value).then((v) => latest(v)); // async resolves via a signal write
});
```

Reference: `packages/core/lib/effect.ts` and `packages/core/tests/effects.test.ts` and `packages/core/docs/api/effect.mdx`

### 3.4 Wrap incidental reads in untracked

**Impact: MEDIUM** - every signal read inside an effect or computed subscribes it, so logging and telemetry reads cause spurious re-runs

Every signal read inside a computed or effect establishes a dependency. Reads whose result should not drive recomputation (logging, telemetry, debug snapshots) must go through `untracked(fn)`: it reads current values with tracking suspended and restores the previous context on exit, so it nests correctly inside `computed`, `effect`, and further `untracked` calls.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const query = signal("");
const lastAudit = signal("");
effect(() => {
  console.log(query());
  console.log("audit:", lastAudit()); // subscribed: audit writes re-run this effect
});
```

**Correct (what is right):**

```ts
import { effect, signal, untracked } from "@hellajs/core";

const query = signal("");
const lastAudit = signal("");
effect(() => {
  console.log(query());
  untracked(() => console.log("audit:", lastAudit())); // read without subscribing
});
```

Reference: `packages/core/lib/untracked.ts` and `packages/core/tests/untracked.test.ts` and `packages/core/docs/api/untracked.mdx`


## 4. Scheduling and lifecycle

### 4.1 Trust auto-batching for same-tick writes

**Impact: HIGH** - hand-rolling write sequencing or reaching for removed batching APIs fights the scheduler the library already runs

Signal writes coalesce automatically: each write propagates and dirt-marks immediately, then one `queueMicrotask` drain runs the effects once with final values. Two related writes in the same tick (event handler, store `$update`, loop) never run a subscribed effect twice, and no intermediate state is ever observed. Reads stay synchronous: a signal getter or computed read between the writes returns the fresh committed value before any effect runs. Reach for `flush()` only when the effects must run before the next line; `batch` is not part of the API.

**Incorrect (what is wrong):**

```ts
import { effect, flush, signal } from "@hellajs/core";

const first = signal("");
const last = signal("");
effect(() => {
  console.log(first(), last());
});
flush(); // Redundant noise: nothing has been written yet
first("Ada");
flush(); // Manual drain per write: effects run before the second write lands
last("Lovelace");
flush();
```

**Correct (what is right):**

```ts
import { effect, signal } from "@hellajs/core";

const first = signal("");
const last = signal("");
effect(() => {
  console.log(first(), last());
});
first("Ada");
last("Lovelace"); // One drain at the microtask boundary: the effect runs once
```

Reference: `packages/core/lib/internal/scheduler.ts scheduleFlush` and `packages/core/tests/deferred-flush.test.ts` and `packages/core/docs/api/flush.mdx`

### 4.2 Reach for flush only to drain a stalled queue

**Impact: LOW** - misunderstanding the abort behavior leaves queued effects stranded until an unrelated write drains them

`flush()` is the scheduler's synchronous drain, exported for advanced and testing use. Normal writes schedule their own microtask drain, so explicit `flush()` calls in application code are noise unless effects must run before the next line. One real use: when an effect throws, the drain aborts with the remaining queue entries intact but unrun. On the scheduled path the throw dispatches to the handler registered with `setFlushErrorHandler` when one is registered (dom's errors feature registers its `onError` dispatch), and surfaces as an unhandled microtask rejection otherwise; a manual `flush()` throws to the caller and never dispatches. Swallowing either strands the survivors; a bare `flush()` in the recovery path runs each exactly once.

**Incorrect (what is wrong):**

```ts
import { effect, flush, signal } from "@hellajs/core";

const count = signal(0);
effect(() => {
  if (count() === 1) throw new Error("boom");
});
count(1); // The scheduled drain aborts at the throw (unhandled rejection)
// Swallowed: effects queued after the throwing one never ran and stay
// queued until some later write happens to drain them
```

**Correct (what is right):**

```ts
import { effect, flush, signal } from "@hellajs/core";

const count = signal(0);
effect(() => {
  if (count() === 1) throw new Error("boom");
});
count(1); // Schedules the drain
try {
  flush(); // The manual drain aborts at the throw; later-queued effects survive
} catch {
  flush(); // Recovers the surviving queue entries, each exactly once
}
```

Reference: `packages/core/lib/internal/scheduler.ts flush` and `packages/core/tests/flush-errors.test.ts` and `packages/core/docs/api/flush.mdx`

### 4.3 Collect effects in scopes and dispose on teardown

**Impact: HIGH** - discarded disposers leave effects running forever after teardown, firing ghost side effects on every write

Every effect returns a disposer, and every disposer discarded is a leak: the effect keeps re-running on its dependencies long after the view or feature it served is gone. Wrap effect creation in `scope(fn)`: it collects every effect created inside the callback and returns a single cleanup that disposes them all. Call it at teardown; the call is idempotent, and an empty scope returns a shared no-op.

**Incorrect (what is wrong):**

```ts
import { effect, signal } from "@hellajs/core";

const count = signal(0);
function mount(): void {
  // Disposers discarded: these effects keep firing on every count write
  // after teardown
  effect(() => {
    console.log("count:", count());
  });
}
```

**Correct (what is right):**

```ts
import { effect, scope, signal } from "@hellajs/core";

const count = signal(0);
function mount(): () => void {
  return scope(() => {
    effect(() => {
      console.log("count:", count());
    });
    effect(() => {
      console.log("doubled:", count() * 2);
    });
  });
}
const stop = mount();
stop(); // disposes both effects; a second call is a safe no-op
```

Reference: `packages/core/lib/scope.ts` and `packages/core/tests/scope.test.ts` and `packages/core/docs/api/scope.mdx`


## 5. Environment guards

### 5.1 Probe the platform with hasWindow, hasDocument, hasNavigator

**Impact: LOW** - bare window, document, or navigator references throw ReferenceError or break imports in non-DOM environments

`hasWindow()`, `hasDocument()`, and `hasNavigator()` return booleans without resolving the global, so they are safe to call and to branch on in any environment. A bare `window !== undefined` check is not: identifier resolution throws `ReferenceError` in environments without the global before any comparison runs, and top-level `window.*` access breaks SSR imports of the module. Guard every browser-only path (listeners, DOM access, user-agent checks) behind the matching probe.

**Incorrect (what is wrong):**

```ts
// Resolves the window identifier before comparing: ReferenceError under
// Node, and the same access at module top level breaks SSR imports
if (window !== undefined) {
  window.addEventListener("resize", () => {});
}
```

**Correct (what is right):**

```ts
import { hasDocument, hasNavigator, hasWindow } from "@hellajs/core";

if (hasWindow()) {
  window.addEventListener("resize", () => {});
}
if (hasDocument()) {
  document.title = "ready";
}
if (hasNavigator()) {
  console.log(navigator.language);
}
```

Reference: `packages/core/lib/internal/env.ts` and `packages/core/tests/env.test.ts`

