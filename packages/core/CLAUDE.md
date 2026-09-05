<core-package-instructions>

Reactive primitives over a doubly-linked dependency DAG. Signals are sources, computeds are transforms, effects are sinks. Updates propagate via depth-first traversal in topological order — glitch-free, each node executes at most once per update cycle. Heavily modified fork of [Alien Signals](https://github.com/stackblitz/alien-signals).

## Public exports (`lib/index.ts`)

| Export | Kind | Source |
|---|---|---|
| `signal`, `computed`, `effect`, `batch`, `untracked`, `scope` | Primitives | `lib/*.ts` |
| `flush` | Scheduler drain (advanced/testing) | `lib/internal/scheduler.ts` |
| `isFunction`, `isString`, `isPlainObject`, `isNumber`, `isBoolean`, `isNull`, `isFalsy`, `isObject`, `objectLoop` | Utils | `lib/internal/utils.ts` |
| `hasWindow`, `hasDocument`, `hasNavigator` | Env probes | `lib/internal/env.ts` |
| `Signal` | Type-only | `lib/types.d.ts` |

`computed`, `effect`, `batch`, `untracked`, and `scope` each throw `new Error("[core] <name>: <argName> must be a function, received <typeof>")` when their callback is not a function (arg names: `computedFn`, `effectFn`, `batchFn`, `untrackedFn`, `fn`). `signal` takes a value, not a function, and validates only its optional `options.equals` (throwing `[core] signal: equals must be a function, received <typeof>` when present and non-function); `computed(fn, options)` validates the same way. An equal `equals` result skips the update entirely — old value/reference kept, no propagation; on `computed`, the comparator is skipped on the first evaluation (prev is `undefined`).

## Node types & initialization

Every node extends `Reactive` (`lib/internal/links.ts`): `rd` (first dependency link), `rpd` (tracking bookmark — last dep accessed), `rs` (first subscriber link), `rps` (prev subscriber link), `rf` (bitmask).

| Node | Created by | Initial `rf` | Extra fields |
|---|---|---|---|
| Signal | `signal()` | `WRITABLE` (1) | `sbv` (base/committed value), `sbc` (current, possibly uncommitted) |
| Computed | `computed()` | `WRITABLE \| COMPUTED \| DIRTY` (81) | `cbc` (cached value), `cbf` (compute fn, receives prev), `ce` (optional equals comparator) |
| Effect | `effect()` | `GUARDED \| SIGNAL_DEPS` (258) | `ef` (effect fn), `ec` (cleanup fn or undefined) |

A `Link` (`lib/types.d.ts`) is the doubly-linked edge: `ls` (source), `lt` (target/subscriber), `lpd`/`lnd` (prev/next dep in target's list), `lps`/`lns` (prev/next sub in source's list). DFS algorithms allocate stack frames `{sv, sp}` (`Stack<T>`).

- **Computed starts `WRITABLE | COMPUTED | DIRTY`** so the first read triggers compute; the `WRITABLE` bit lets propagation treat it like a signal (descend into subscribers), and `updateValue` dispatches on the `COMPUTED` bit (never a `cbf` property probe).
- **Effect starts `GUARDED | SIGNAL_DEPS`** marking it as a sink to be *scheduled* (not traversed) during propagation, and as signals-only until a computed link clears the fast-path bit.

## Flags (`lib/internal/flags.ts`)

| Flag | Value | Meaning |
|---|---|---|
| `CLEAN` | 0 | No pending work |
| `WRITABLE` | 1 | Value node (signal or computed) — propagation descends into its subscribers |
| `GUARDED` | 2 | Effect node — propagation schedules it rather than descending |
| `TRACKING` | 4 | Currently executing and recording dependencies |
| `EFFECT_DEP` | 8 | Effect's dep list contains at least one child effect — gates the skip-path scheduled-children walk |
| `DIRTY` | 16 | Definitely needs re-execution |
| `PENDING` | 32 | Might need re-execution (validate before deciding) |
| `COMPUTED` | 64 | Computed value node — discriminates computed from signal among WRITABLE nodes |
| `SCHEDULED` | 128 | Effect is in the flush queue |
| `SIGNAL_DEPS` | 256 | Effect's deps are all signals — writes prove change, propagation marks it DIRTY directly, flush runs it without validation |

`WRITABLE`/`GUARDED`/`COMPUTED` are permanent type bits (cleared only by `disposeEffect` → `CLEAN`, and by computed auto-GC, which preserves `COMPUTED`); `EFFECT_DEP`/`SIGNAL_DEPS` are sticky effect bits (set when observed, never re-derived — a stale `EFFECT_DEP` costs a no-op walk, a cleared `SIGNAL_DEPS` locks in the conservative validation path); `TRACKING`/`DIRTY`/`PENDING`/`SCHEDULED` are transient state bits.

## Execution context (`lib/internal/context.ts`)

Module-level singletons that drive tracking and scope registration:
- **`currentValue`** / `setCurrentSub(sub)`: the reactive node currently executing (an effect or computed). Signal/computed getters call `createLink(source, currentValue)` only when this is set — this is how dependencies get recorded. `setCurrentSub` returns the previous value so callers can save/restore (used by `executeComputed`, `executeEffect`, `untracked`, `effect`).
- **`activeScope`** / `setActiveScope(scope)`: the innermost `scope()` in effect. `addScopeEffect(cleanup)` lazily allocates a `Set` on the scope and registers an effect's disposer; no-op when no scope is active.

## Core algorithms

**`propagateChange(link)` — setter entry (`scheduler.ts`).** DFS through subscribers using lightweight stack frames `{sv, sp}`. Per node: only those with `rf & (WRITABLE | GUARDED)` are processed. Clean nodes get `|= PENDING`, plus `|= DIRTY` when `SIGNAL_DEPS` is set — signal writes already proved the value changed, so such effects skip flush-time validation entirely; already-active nodes (`TRACKING|DIRTY|PENDING`) set a *local* `rf = CLEAN` variable so the `GUARDED` re-schedule check below skips them — this is what prevents double-queuing an effect in a single propagation, and is also why a node is never re-scheduled by its own synchronous write. `GUARDED` nodes are scheduled. `WRITABLE` nodes with subscribers are descended into depth-first; sibling branches are pushed onto the stack for later backtracking.

**`propagate(link)` — upgrade PENDING → DIRTY (`scheduler.ts`).** Linear walk of a subscriber list. For each node that is `PENDING` and not already `DIRTY`, set `DIRTY`; if `GUARDED`, schedule. Called after a confirmed value change — from the signal/computed getters (post-`executeSignal`/`executeComputed`, gated on their changed return) and from inside `validateStale` once a dependency's change is confirmed. This promotes a "maybe stale" PENDING node to definitely-stale DIRTY.

**`validateStale(link, subscriber)` — skip-update optimization (`scheduler.ts`).** Stack-based DFS deciding whether a `PENDING` node is actually stale. If a dependency is `WRITABLE|DIRTY`, run `updateValue` and check `!==`; if unchanged, clear `PENDING` and skip re-execution. If a dependency is `WRITABLE|PENDING`, recurse into *its* dependencies. On unwind, if still stale, `updateValue` the subscriber and `propagate` to its other subscribers. This is the mechanism behind "computed returns the same value → downstream effects don't fire".

**Tracking (`tracking.ts`).** There is no `startTracking` — the execute paths rebuild the flag word from constants (`executeComputed`: `WRITABLE|COMPUTED|TRACKING`; `executeEffect`: `(flags & (EFFECT_DEP|SIGNAL_DEPS)) | GUARDED | TRACKING`) and reset `rpd = undefined` inline, cheaper than a read-modify-write. `endTracking` removes every dependency after `rpd` (the ones not re-accessed this run) via a `removeLink` loop, then clears `TRACKING`. This rebuild is what makes conditional dependencies work — the graph is re-derived each execution.

**`createLink(source, target)` (`links.ts`).** Dedup fast-path: if `rpd.ls === source` return. If `target` is `TRACKING`, peek the next dep (`rpd.lnd` or `rd`); if it points to the same source, advance `rpd` and reuse the link — zero allocation in steady state. Otherwise splice a new link into both doubly-linked lists; on the new-link path only, a `COMPUTED` source permanently clears the target's `SIGNAL_DEPS` (a computed's value may come out equal, forcing flush-time validation — reuse paths skip the clear because an existing computed link already cleared it). Edge direction: `target` subscribes to `source` (link lands in `target.rd` and `source.rs`).

**`removeLink(link, target)` (`links.ts`).** DLL surgery on both lists (target is always explicit), returns `lnd` so callers can keep walking. **Auto-GC:** if the source loses all subscribers (`!lps && !(ls.rs = lns)`) and carries `COMPUTED`, mark it `WRITABLE | COMPUTED | DIRTY` and remove **all** of its outgoing dependency links (cascading into dep computeds that lose their own last subscriber).

**Scheduler (`scheduler.ts`).** `scheduleEffect` appends to `effectQueue` and sets `SCHEDULED` (dedup). `flush` (module-local, beside the queue state) drains inline: each dequeue clears the slot (for GC) and the `SCHEDULED` bit, then runs `executeEffect`; indices zero at the end, and a throw aborts the drain with remaining entries intact (the next flush recovers them). `executeEffect`: if `DIRTY` or (`PENDING` && `validateStale`), run prior `ec`, `setCurrentSub` + the constant flag store, run `ef`, capture new `ec`, `endTracking`. Else if just `PENDING`, clear it — then, only when `EFFECT_DEP` is set, walk `rd` and recursively `executeEffect` any dependency still flagged `SCHEDULED` (clearing the bit before recursing) — this runs nested scheduled effects in dependency order; leaf effects skip the walk entirely. `disposeEffect` runs `ec`, removes all `rd` links and the incoming `rs` link, sets `rf = CLEAN`.

## Getter / setter mechanics

- **Signal getter (`signal.ts`):** `rf & DIRTY && executeSignal(state, sbc) && rs && propagate(rs)`. `executeSignal` commits `sbc → sbv`, resets `rf = WRITABLE`, returns `oldValue !== value` (short-circuits propagation when unchanged). Then `currentValue && createLink(...)` tracks if inside a reactive context. Returns the destructured `sbc` local — by the return point `sbc === sbv` always holds (`sbc` diverges from `sbv` only while `DIRTY`, and the commit just ran), saving a property reload.
- **Signal setter:** dispatched by `arguments.length > 0` (NOT `value !== undefined` — so you can store `undefined`). If `sbc !== value` (reference equality): set `sbc`, set `rf = WRITABLE | DIRTY`, and only if `rs` exists call `propagateChange(rs)` then `!batchDepth && flush()`. No subscribers → no work.
- **Computed getter (`computed.ts`):** `rf & DIRTY || (rf & PENDING && (validateStale(...) || (rf = rf & ~PENDING, false)))` decides staleness, then `executeComputed` (runs `cbf(cbc)`, caches `cbc`, returns changed-ness) and `propagate(rs)`. The PENDING clear is folded into the condition — the comma arm only runs when validation says not-stale, and that snapshot never carries `DIRTY` (the first arm short-circuits), so a fresh-clean `rf` is never clobbered back to stale. Tracks via `createLink`.
- **`effect` (`effect.ts`):** if `currentValue` is active (a parent effect/computed), `createLink(this, parent)` is called *before* `setCurrentSub` — note the argument order: **the parent subscribes to this child** (the edge lands in `parent.rd` / `child.rs`, not the reverse). Ordering before `setCurrentSub` ensures the link targets the parent rather than this effect. The factory then runs `ef` synchronously under `setCurrentSub(this)` and captures `ec` if `ef` returns a function. Returns a `disposeEffect` closure and registers it with the active scope via `addScopeEffect`.

## Non-obvious behaviors

- **Getter/setter discriminator is `arguments.length`, not value identity.** `s(undefined)` is a setter call, not a getter — storing `undefined` is supported and tested.
- **Reference equality with `NaN` self-equal by default** for change detection (`isEqual` in `lib/internal/utils.ts`: `a === b || (a !== a && b !== b)`), overridable per node via `signal(v, { equals })` / `computed(fn, { equals })`. Primitives compare by value; new object/array references always propagate; writing `NaN` over `NaN` is treated as unchanged and never fires (`+0`/`-0` compare equal — `Object.is` as `equals` distinguishes them). An equal comparator result skips the write block entirely — the old reference stays visible. In-place mutation never fires — replace the reference.
- **Self-writes do not infinite-loop.** An executing node holds `TRACKING`, and `propagateChange` sets a local `rf=CLEAN` for active nodes so it skips re-scheduling them — the same mechanism behind the no-double-queue guarantee. A single effect writing a signal it reads runs at most twice then stabilizes (verified: `count(count()+1)` → 2 runs, value `2`); even mutual write-cycles between two effects stabilize. `untracked` exists to read without establishing a dependency, not to prevent loops.
- **The first effect run differs from re-runs.** The `effect()` factory runs `ef` under `setCurrentSub(this)` without the scheduler's flag rebuild — dependencies are still recorded (`createLink` runs because `currentValue` is set), but `rf` stays `GUARDED | SIGNAL_DEPS` during that first run — which is why a self-write on the first run can schedule one extra execution before the re-run sets `TRACKING` and stabilizes.
- **Errors abort the flush.** An uncaught throw in an effect propagates out of the signal setter that triggered it; remaining queued effects are skipped. Subsequent signal writes start a fresh flush and recover. Signal state is not corrupted.
- **Errors defeat tracking past the throw point.** A throw in a computed/effect means dependencies read after the throw point aren't tracked (the `finally` still calls `endTracking`, pruning everything after `rpd`). `try/catch` *inside* the reactive function preserves tracking — read deps before branching.
- **Effects must be synchronous.** `async` effect functions break dependency tracking (the body returns before deps are read); start async work via `.then` / `fetch` inside a sync effect body.
- **Nested effects accumulate.** Re-running a parent effect creates new child effects but does NOT dispose old ones — old children keep firing on their own dependencies until explicitly disposed.
- **Scope cleanup is idempotent.** The returned function `forEach`-calls cleanups then clears the set; subsequent calls iterate an empty set (no-op). Empty scopes return a shared `NOOP` singleton (reference-equal across calls).
- **`untracked` nests correctly:** saves/restores the prior `currentValue`, so it composes inside `computed`/`effect` and reads multiple signals in one call.
- **Batch is a depth counter.** `++batchDepth` on entry, `!--batchDepth` triggers `flush()`. Nested batches drain at outermost exit. Async work scheduled inside escapes the boundary.
- **Signals-only effects skip flush-time validation; computed-mediated ones never do.** An effect with `SIGNAL_DEPS` (no computed ever linked) is marked `DIRTY` directly by `propagateChange` and runs on flush without `validateStale` — a signal write already proved the change. Consequence: a batch whose writes cancel out (`s(1); s(0)`) re-runs a signals-only effect once (pinned in `batch.test.ts`), while computed-mediated effects still skip (the computed's equal-value check stays authoritative). A single computed link disables the fast path for that effect forever — conservative by design.
- **Computed auto-GC.** When a computed's last subscriber link is removed, `removeLink` drops **all** of its dependency links (cascading into dep computeds that lose their own last subscriber) and marks it `WRITABLE | DIRTY`. The next read rebuilds the graph and recomputes from scratch.

## Testing approach (`tests/`)

Integration-style, public API only — never imports `lib/internal/*`. Uses `mock()` from `bun:test` for call counts.

- `signals.test.ts` — primitive/reference types, default equality (incl. `NaN` self-equal), custom `equals`, no-arg signal (`undefined`).
- `computed.test.ts` — chaining, previous value, error recovery, auto-GC + rebuild, deep chains (6 levels), undefined/NaN-result no-op.
- `effects.test.ts` — cleanup return value, nested effects, errors from setter, try/catch tracking, async via `.then`, no-double-queue, flush-abort, deep accumulation.
- `batch.test.ts`, `scope.test.ts` — grouping, nesting, return values, cancel-out batches (signals-only runs once, computed-mediated skips), idempotent dispose, shared NOOP.
- `topology.test.ts` — diamond / jagged-diamond / lazy-branch / skip-update / unsubscribe-inactive patterns (ported from preact-signals), incl. multi-dep unsubscribe after branch loss (effect + computed).
- `env.test.ts`, `utils.test.ts` — env probes and type guards (`isPlainObject` rejects arrays, Date, Map/Set, class instances; accepts `Object.create(null)`).

Run with `bun coverage core`.

</core-package-instructions>
