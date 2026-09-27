---
type: decision
title: Package AGENTS.md files are already at author-density - compress drift, not prose
description: The 8 package AGENTS.md files (ui joined after the original density pass) are already at author-density; blanket prose cuts would cut facts. Compression passes yield drift sweeps, not size.
tags: [agent-config, arch]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [agents-compression, file-map-drift, anchor-sweep, package-agents-density]
supersedes: 115
---
# Why

The optimize-agent-system pass (plans/agents/config/optimize-agent-system) targeted ~30-40% prose reduction on what were then the 7 package AGENTS.md and found average paragraph length ~595 chars of load-bearing internals (flag tables, algorithm mechanics, gotchas grounded in tests). Cutting to a size target removes facts, not prose; the preservation invariant throttled that unit to -0.6% (197,295 -> 196,162 bytes) while its mechanical sweeps still caught 6 drift defects (stale package counts across root/scripts/docs, router symbol names, a fuzzy guide-section cite, an empty utilities table). Since the pass, `packages/ui` joined: its AGENTS.md (~42.8 KB) is likewise author-dense (registry tables, marker mechanics, CLI internals), extending the conclusion to 8 package AGENTS.md. A future compression attempt starts from drift sweeps, not prose rewriting.

# Evidence

- Re-verified 2026-09-26: `fd 'AGENTS.md$' packages/` lists 8 (core, css, dom, resource, router, ssr, store, ui); `wc -c packages/ui/AGENTS.md` = 42,837.
- The original pass's fixes still hold: `packages/router/AGENTS.md` cites `extractInheritMeta`/`extractRouteHooks` matching the `packages/router/lib/internal/matched.ts` exports (lines 64, 90); `plugins/babel/AGENTS.md` cites `guides/tests.md` §Test Coverage; `guides/tests.md` carries the package-exported utilities table (`peekState(el)` row) feeding the observer-cleanup poll rule; no "six packages" text remains.
- Durable enforcement lives in the split audit skills: `audit-docs` SKILL.md Step 3 (package AGENTS.md file-map drift), `audit-scripts` SKILL.md Step 3 (scripts/AGENTS.md row drift).
