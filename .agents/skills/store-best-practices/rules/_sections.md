| prefix | title | impact | description |
|---|---|---|---|
| shape | Shape and conversion | HIGH | property calls as the reactive surface, class-instance leaves as whole-value signals, granular collection containers, preserved functions, store composition |
| snap | Snapshots and updates | CRITICAL | $update deep merges and draft mutators, $snapshot copy semantics, growing stores through the returned reference, per-key equals gating |
| sub | Subscriptions and cleanup | HIGH | $subscribe single-key observation on the owning store, unsubscribe discipline, $cleanup teardown scope |
| res | Reserved keys and readonly | CRITICAL | the $-prefixed method namespace and create-time collisions, creation-time readonly with deep propagation |
| persist | Persistence | HIGH | StoreAdaptor shape and the shipped factories, partialize for serializable projections, hydration contract, debounce and dispose |
