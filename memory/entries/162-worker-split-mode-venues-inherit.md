---
type: decision
title: "Worker split-mode venues inherit merged units' slugs (runSet partitions all units, slug = component[0]) — ui set relocated to a 02-named venue; runner fix deferred until the set merges"
description: "runSet partitions ticked units too and names split venues after component[0] - post-merge launches inherit the merged unit's slug; merge routing still matches; filter ticked units only post-merge."
tags: [tooling, plans, worktrees, runner]
timestamp: 2026-09-16
last_confirmed: 2026-09-16
triggers: [venue-slug, split-mode, post-merge-launch, worktree-relocation, partition-components]
---
# Why

`scripts/worker/run.ts` `runSet` builds `units = listPlanUnits(setDir)` (ticked included) and, in split mode, derives each venue slug from `component[0]?.name` of `partitionComponents(units)`. `partitionComponents` (scripts/worker/set.ts) unions over `depends_on` edges read from unit FILES — units 07/08 of the ui set declare `depends_on: [01-primitives, ...]`, so the already-merged 01 glues into the {02..10} component and the venue is named `...-01-primitives`. Ticked units are skipped only per-unit inside `runVenue`, after slugs are fixed. plans/ui/code/hellajs-ui/index.md documents the intended behavior ("post-merge ... the partition excludes 01") — the code never implements it.

Decisions (user, 2026-09-16): (1) The in-flight 02 delta was relocated to a fresh `...-02-ui-package-cli` venue (baseline-relative patch + plan-copy ticks + memory delta), old venue cleaned — which removed the original reason to defer the runner fix (orphaned slug match). (2) The fix was applied the same day, UNCOMMITTED in the main tree for user review: run.ts + queue.ts partition OUTSTANDING units (filter `!isTicked` before `partitionComponents`); verified `bun lint` exit 0 and the derived venue slug `...-02-ui-package-cli` matches the standing venue. Refresh or supersede this entry when the fix commits and the ui set merges.

What breaks if ignored: re-diagnosing the 01-named venue as stale/dirty state at merge time (it is a clean, v2-current cut); a post-merge relaunch re-entering a merged unit's venue name and confusing the record; applying the runner fix mid-set and stranding merge routing.

# Evidence

- scripts/worker/run.ts (read 2026-09-16): `const units = listPlanUnits(options.setDir)`; split branch: `slug: \`${setSlug(options.setDir)}-${component[0]?.name.replace(/\.md$/, "")}\``; ticked skip sits in `runVenue`, post slug derivation.
- scripts/worker/set.ts `partitionComponents`: union-find over `readDependsOn(unit.path)`; plans/ui/code/hellajs-ui/07-dialog.md + 08-tabs.md frontmatter carry `depends_on: [01-primitives, ...]`.
- scripts/merge/queue.ts `matchComponent`: slug → component via the same all-units partition (`partitionComponents(units)`, `component[0]` stem) — the routing the deferred fix must not orphan.
- Worktree timeline (reflog + gitdir birth, 2026-09-16): v2 merged 01 at 09:57:08 (`8c4e195`); the venue worktree was seeded 10:02:58 straight at `8c4e195` with baseline `b63b577` (parentless `commit-tree` hash per worktree.mjs `new`) — a fresh cut under the merged unit's slug, not a surviving pre-merge worktree.
