| prefix | title | impact | description |
|---|---|---|---|
| sig | Signals and collection signals | CRITICAL | Creating state: replace-not-mutate writes, equality gates, undefined semantics, granular collections |
| cmp | Computed derivation | CRITICAL | Synchronous pure derivations, result equality, error retry behavior |
| eff | Effects and tracking | CRITICAL | Side-effect sinks: sync bodies, cleanup returns, nesting traps, untracked reads |
| sched | Batching and lifecycle | HIGH | Coalescing writes with batch, scope disposal, flush recovery |
| env | Environment guards | LOW | SSR-safe platform probing |
