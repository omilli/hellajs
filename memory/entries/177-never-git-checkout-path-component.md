---
type: correction
title: "Never git-checkout -- a path in a component worktree; rebuild a lost manifest from AGENTS table + committed base + drift guard"
description: "git checkout -- <file> in a component worktree destroys prior units' uncommitted state; a lost ui registry.json rebuilds from the AGENTS.md table + committed base, verified by drift guard."
tags: [worktrees, registry, git]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [registry-json-loss, worktree-checkout, manifest-recovery, worktree-state-loss, ui-registry]
---
# Why
Component worktrees hold months of uncommitted cross-unit state (the whole registry/ + registry.json). A routine-looking `git checkout -- packages/ui/registry/registry.json` reverted it to the 7-entry baseline, losing 51 delivered entries; the file was never staged, so git objects had nothing. The manifest is fully derivable from in-repo truth, so the loss is recoverable in minutes if you know the recipe.
# Evidence
Recovered 2026-09-23 during unit 18: rebuild = committed base entries verbatim (theme/cn/button/card/input/dialog/tabs) + one entry per delivered component (`files` from `ls registry/<name>/` minus style modules; `deps` = core+dom shared, css slot adds `@hellajs/css`; per-style `registryDependencies` from the worktree AGENTS.md SSRegistry table's deps column) in unit delivery order, then `bun bundle ui` + `registry.test.ts` (manifest-disk integrity) + `drift.test.ts` (fresh-add byte-match vs vendored docs) all green in the next full `bun coverage ui`. (At recovery time the AGENTS table's deps column read "core, dom, primitives" — stale; the manifest data uses core+dom only. The table has since been corrected to `core, dom`.)
