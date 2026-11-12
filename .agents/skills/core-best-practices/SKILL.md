---
name: core-best-practices
description: >
  Best practices for @hellajs/core reactive primitives: signal, signalArray, signalMap, signalSet, computed, effect, flush, untracked, scope, hasWindow, hasDocument, hasNavigator. Use when writing or reviewing code that imports @hellajs/core - creating or writing signals, deriving state with computed, running side effects with effect, forcing the synchronous effect drain with flush, disposing effects with scope, reading without subscribing via untracked, or guarding browser-only code with the env probes. Covers the silent failure modes: in-place mutation never propagates, async effect bodies lose dependency tracking, async or side-effecting computed corrupt the graph, manual per-write flush calls fight the auto-batched scheduler, discarded disposers leak ghost effects. Use ONLY for @hellajs/core primitives - DOM rendering and components belong to dom-best-practices, deep reactive state containers to store-best-practices.
---

# core-best-practices

Grounded rules for `@hellajs/core`: signals (sources), computed (transforms), effects (sinks) over a dependency DAG that propagates glitch-free in topological order. Every rule is derived from the package source and its test suite; each rule file cites the symbols and tests that pin it.

## When to Apply

- Any code importing `@hellajs/core` or creating/writing signals, computeds, or effects.
- Deriving state, running reactive side effects, forcing effect drains, or disposing effect lifecycles.
- Guarding browser-only code that runs in Node or SSR environments.

Not for: DOM rendering and components (`dom-best-practices`), deep reactive state containers (`store-best-practices`).

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Categories

| Prefix | Category | Impact |
|---|---|---|
| sig | Signals and collection signals | CRITICAL |
| cmp | Computed derivation | CRITICAL |
| eff | Effects and tracking | CRITICAL |
| sched | Batching and lifecycle | HIGH |
| env | Environment guards | LOW |

## Rules

### Signals and collection signals (sig)

- `sig-replace-not-mutate` - Replace signal values, never mutate in place
- `sig-equality-content` - Configure content equality for structured signal values
- `sig-undefined-is-a-write` - Passing undefined writes; only a no-argument call reads
- `sig-collections-granular` - Use collection signals for lists, maps, and sets

### Computed derivation (cmp)

- `cmp-sync-pure` - Keep computed synchronous and side-effect free
- `cmp-equality-gate` - Gate derived array and object results with equality
- `cmp-throw-retries` - Handle errors inside computed, not at read sites

### Effects and tracking (eff)

- `eff-sync-only` - Keep effect bodies synchronous
- `eff-return-cleanup` - Return cleanup functions from effects
- `eff-nested-accumulation` - Never create effects inside effects
- `eff-untracked-reads` - Wrap incidental reads in untracked

### Batching and lifecycle (sched)

- `sched-deferred-flush` - Trust auto-batching for same-tick writes
- `sched-scope-dispose` - Collect effects in scopes and dispose on teardown
- `sched-flush-advanced` - Reach for flush only to drain a stalled queue

### Environment guards (env)

- `env-probe-globals` - Probe the platform with hasWindow, hasDocument, hasNavigator

Full rule text, incorrect/correct examples, and source references: `AGENTS.md` in this folder (compiled from `rules/` by `vp run skills-build`).
