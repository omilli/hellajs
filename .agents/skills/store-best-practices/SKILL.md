---
name: store-best-practices
description: >
  Best practices for @hellajs/store deeply reactive state: store, persistStore, localStorageAdaptor, sessionStorageAdaptor, and the $snapshot, $update, $cleanup, $subscribe store methods. Use when code imports @hellajs/store - converting plain objects to stores, reading and writing through property signals, $update deep merges and draft mutators, per-key equals and middleware, readonly config, subscriptions and cleanup, persistence with hydration, partialize, and debounce. Silent failure modes: recreating a store orphans every subscriber, a captured $snapshot() never updates, mutating the fresh array a collection read returns wakes no one, class-instance leaves are whole-value signals so in-place mutation is invisible, $update rejects function properties and reserved keys, dropped unsubscribe functions leak effects, non-serialized class instances corrupt persisted state. Use ONLY for @hellajs/store state - raw signals, computed, and effects to core-best-practices, async data to resource-best-practices.
---

# store-best-practices

Grounded rules for `@hellajs/store`: `store(initial)` walks a plain object and converts it into granular reactive state - primitives become signals, nested objects become nested stores, Array/Map/Set keys become collection containers with per-element granularity, functions are preserved as behavior. State mutates in place through `$update` (deep-merge partials or structural draft mutators), reads flatten through `$snapshot()`, single keys observe through `$subscribe`, `$cleanup` tears down nested stores, and `persistStore` writes state through to a storage adaptor with hydration, partialize, and debounce. Every rule is derived from the package source and its test suite; each rule file cites the symbols and tests that pin it.

## When to Apply

- Any code importing `@hellajs/store` or creating state with `store({...})`.
- Reading or writing state through store properties (`s.count()`, `s.user.name("Bob")`), deep-merging with `$update`, or flattening with `$snapshot()`.
- Configuring stores: `readonly`, per-key `equals`, `middleware`, or composing stores by embedding.
- Observing state with `$subscribe` or tearing down with `$cleanup`.
- Persisting stores with `persistStore`, `localStorageAdaptor`, `sessionStorageAdaptor`, or a custom `StoreAdaptor`.

Not for: raw `signal`/`computed`/`effect` usage outside stores (`core-best-practices`), async data fetching (`resource-best-practices`), route state (`router-best-practices`).

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
| shape | Shape and conversion | HIGH |
| snap | Snapshots and updates | CRITICAL |
| sub | Subscriptions and cleanup | HIGH |
| res | Reserved keys and readonly | CRITICAL |
| persist | Persistence | HIGH |

## Rules

### Shape and conversion (shape)

- `shape-properties-are-the-signals` - Read and write store state through the property calls
- `shape-class-instances-whole-signals` - Class-instance leaves are whole-value signals
- `shape-collections-granular-containers` - Drive collections through the container surface, never the bare-call copy
- `shape-functions-preserved` - Function properties are behavior, not state
- `shape-compose-stores` - Compose stores by embedding, subscribe on the owner

### Snapshots and updates (snap)

- `snap-update-never-recreate` - Change state through $update, never by recreating the store
- `snap-snapshot-copy` - $snapshot() returns a point-in-time copy, never live state
- `snap-draft-structural-batching` - Draft mutators apply structural diffs and are not auto-batched
- `snap-grow-via-returned-store` - Grow stores through the reference $update returns
- `snap-equals-gates-writes` - Gate equal writes with per-key equals comparators

### Subscriptions and cleanup (sub)

- `sub-subscribe-settable-keys` - $subscribe observes one settable key on the owning store
- `sub-unsubscribe-discipline` - Call the unsubscribe function every subscription returns
- `sub-cleanup-tears-down-stores` - $cleanup tears down nested stores, not leaf signals

### Reserved keys and readonly (res)

- `res-reserved-keys` - Keep the $-prefixed method names out of initial state
- `res-readonly-at-creation` - Configure readonly at creation; it propagates deep

### Persistence (persist)

- `persist-adaptor-shape` - Persist through a StoreAdaptor built by the shipped factories
- `persist-partialize-serializable` - Partialize persistence down to serializable state
- `persist-hydration-contract` - Gate async persistence on the hydrated flag
- `persist-debounce-dispose` - Debounce write bursts and dispose persistence handles

Full rule text, incorrect/correct examples, and source references: `AGENTS.md` in this folder (compiled from `rules/` by `vp run skills-build`).
