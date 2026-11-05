| prefix | title | impact | description |
|---|---|---|---|
| cfg | Route configuration | HIGH | resolution pipeline order, flat-route ordering, optional and wildcard params, nested parameter inheritance, meta cascade, fresh route maps |
| nav | Navigation and URLs | HIGH | param substitution with URL encoding, href builder, base paths, active-state matching, crumbs, navigate options |
| hook | Lifecycle hooks and guards | CRITICAL | guard verdict contract, async deferral and pending state, handler arity, leave guards, pre-commit route reads, execution order |
| mode | Modes, scroll, and interception | MEDIUM | history/hash/memory selection, scroll behavior priority and saved positions, link interception, SSR url mode, atomic route writes |
| reset | Reset and re-init | LOW | resetRouter teardown scope, router() reconfiguration |
