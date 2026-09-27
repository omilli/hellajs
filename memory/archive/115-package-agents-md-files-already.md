---
type: decision
title: Package AGENTS.md files are already at author-density - compress drift, not prose
description: The 7 package AGENTS.md (and peripheral AGENTS) are already at author-density; blanket prose cuts would cut facts. Compression passes yield drift sweeps, not size.
tags: [agent-config, arch]
timestamp: 2026-09-09
last_confirmed: 2026-09-10
triggers: [agents-compression, file-map-drift, anchor-sweep, package-agents-density]
---

# Why

The optimize-agent-system pass (plans/agents/config/optimize-agent-system) targeted ~30-40% prose reduction on the 7 package AGENTS.md and found average paragraph length ~595 chars of load-bearing internals (flag tables, algorithm mechanics, gotchas grounded in tests) - written under the author regime over time. Cutting to hit a size target would remove facts, not prose; the preservation invariant correctly throttled the unit to -0.6%. What the pass DID yield: 6 drift defects caught by mechanical sweeps - root/scripts/docs AGENTS all said "six packages" (seven exist, ssr added last), router's AGENTS cited `InheritMeta`/`RouteHooks` while `internal/matched.ts` actually exports `extractInheritMeta`/`extractRouteHooks`, babel cited a fuzzy `guides/tests.md §Coverage` (section is §Test Coverage), and guides/tests.md's package-exported utilities table was empty while its async rule referenced `peekState`.

# Evidence

- `wc -c` before/after: packages 197,295 -> 196,162 with every fact preserved (audit sweep green).
- Drift fixes verified against `packages/router/lib/internal/matched.ts` (exports at lines 64, 90), `docs/astro.config.mjs` (7 package aliases + @examples), `packages/dom/lib/index.ts:36-38` (peekState/getState/hasState/deleteState/checkMultiSelectors/multiSelectors/resetDom exports).
- The durable enforcement lives in the split audit skills (plans/agents/config/audit-split): `audit-docs` SKILL.md Step 3 carries the package-AGENTS.md file-map checks, `audit-scripts` SKILL.md Step 3 the scripts/AGENTS.md ones; this entry records the density finding so a future compression attempt starts from sweep-not-rewrite.
