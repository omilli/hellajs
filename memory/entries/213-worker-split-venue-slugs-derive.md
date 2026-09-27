---
type: correction
title: Worker split venue slugs derive from the first outstanding unit (deriveVenues skips delivered units pre-derive); merge routing resolves standing slugs by carrier-tick affinity first
description: "deriveVenues partitions ALL units but skips delivered ones before naming: split slug = setSlug-pending[0]; merge resolves standing slugs by carrier-tick affinity, then component[0] arithmetic."
tags: [tooling, plans, worktrees, runner]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [venue-slug, split-mode, post-merge-launch, carrier-tick-affinity, derive-venues]
supersedes: 162
---
# Why

Supersedes 162: its premise — venue slug = `component[0]` of an all-units partition, ticked units skipped only inside `runVenue` after slugs are fixed — described the pre-fix runner and, briefly, the uncommitted filter fix. Both states are gone. Current mechanism (scripts/worker/run.ts `deriveVenues`): components partition ALL units (`partitionComponents(units)`, so plan rework inserting/replacing units cannot re-anchor an outstanding component), but each unit is classified BEFORE slug derivation — main-tree marker `[x]` (merged) or any standing carrier's copy `[x]` (delivered, awaiting merge) pushes to `skips`; only `pending` units remain, and the derived split-mode slug is `` `${slugBase}-${pending[0]?.name.replace(/\.md$/, "")}` `` — the first OUTSTANDING unit — so a post-merge relaunch never re-enters a merged unit's venue name. A venue adopts a standing carrier already holding delivered units of that component (exactly one adopter; ambiguous adoption refused, letting the derived slug collide in `worktree.mjs new` to surface to the operator). Merge-side mirror (scripts/merge/queue.ts): `deriveQueue` also partitions ALL units; `matchComponent` resolves a standing slug by carrier-tick affinity first (the component hosting that carrier's delivered ticks; >1 host → anomaly), falling back to derived-slug arithmetic against `component[0]`.

What breaks if ignored: predicting a post-merge relaunch inherits the merged unit's slug (it derives from `pending[0]` instead); misreading a carrier-affinity match as a slug coincidence or an anomaly; "fixing" the all-units partition by filtering ticked units pre-partition (that was 2f1c46c2's shape — reverted by the rework, which needs the full partition for rework stability and carrier adoption).

# Evidence

- scripts/worker/run.ts `deriveVenues` (read 2026-09-27): `const groups = mode === "split" ? partitionComponents(units) : [units]`; per-unit `isTicked(unit.path)` / `carrierTicked(...)` checks push skips before `pending.push(unit)`; `const derived = mode === "split" ? \`${slugBase}-${pending[0]?.name.replace(/\\.md$/, "") ?? "component"}\` : slugBase`; adoption via `carriers.filter(... carrierTicked ...)` with `adopting.length === 1` guard.
- scripts/merge/queue.ts `deriveQueue`/`matchComponent` (read 2026-09-27): `const components = partitionComponents(units)` with comment "components partition ALL units"; hosts set built from `carrierTicked(entry.slug, relSetDir, unit.name)`, `hosts.size === 1` wins / `> 1` → null (anomaly); fallback `entry.slug === \`${setSlugValue}-${component[0] stem}\``.
- History: the 162 fix committed as 2f1c46c2 (2026-09-16 12:53 — `units.filter(!isTicked)` before `partitionComponents` in both files), reworked by 08bc38c0 into `deriveVenues` (pending-based slug, carrier adoption; queue.ts back to all-units partition). The ui set merged and was cleaned: d48d29b6 (feat(ui) registry components) + bcd97746 (memory/guides from ui merge) in main-tree log; `plans/ui/code/hellajs-ui/` no longer exists (only `registry-canonical-placeholders` remains).
