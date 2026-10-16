---
title: Purge bun-installed member node_modules before npm install in bun-seeded worktrees
description: "bun's install leaves node_modules/ dirs inside workspace members; npm reify records them as version-less lock stubs (`{}` entries) and the NEXT npm install crashes (`Invalid Version:` in arborist canDedupe) — `rm -rf packages/*/node_modules plugins/*/node_modules` before switching PMs."
tags: [npm, bun, arborist, workspaces, package-lock, vite-plus, worktree]
confirmed: 2026-10-16
---
# Why

`worktree.mjs` (pi cluster, still bun-launched) seeds worktrees with a bun install, and bun places some deps in nested `node_modules/` dirs inside workspace members. When npm later reifies the same tree it writes those physical dirs into `package-lock.json` as ghost entries (`"packages/<pkg>/node_modules/<dep>": {}` — no version, no flags). The FIRST `npm install` (fresh tree) succeeds; the SECOND one builds its ideal tree from that lock, instantiates the stubs as version-less nodes, and crashes: `TypeError: Invalid Version: ` in `Node.canDedupe` via `pruneDedupable` — deterministic, every subsequent install. Any repo that flips bun→npm (or mixes the two PMs across machines) hits this; deleting the member-level `node_modules` dirs and regenerating the lock clears it permanently (root hoists everything; members need no nested trees).

# Evidence

De-bun worktree probe (2026-10-16): fresh `npm install` exit 0 → second `npm install` exit 1 with `Invalid Version:`; instrumented arborist (`Node.prototype.canDedupe` wrap) named the poisoned node `packages/css/node_modules/csstype` with `version: ""`; lock contained 21 version-less stubs under `packages/*/node_modules` + `plugins/*/node_modules`. After `rm -rf packages/*/node_modules plugins/*/node_modules` + lock regen: 0 ghost entries, idempotent dry-run and real install both exit 0. Overrides and `"*"` member specs were ruled out empirically before the real cause.
