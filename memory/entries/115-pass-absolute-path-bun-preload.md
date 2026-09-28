---
type: decision
title: Pass an absolute path to bun --preload for HappyDOM smoke checks
description: bun --preload fails to resolve relative paths under bun -e; use $PWD/utils/happydom.js for out-of-test DOM smoke checks.
tags: [testing, tooling]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [happydom-smoke, preload-path, worktree-verification]
---
# Why

Verifying runtime page wiring outside `bun test` (demo mounts, vendored ui parts, docs-page scripts) uses the repo's HappyDOM preload via `bun --preload utils/happydom.js -e '...'`. A relative preload path fails with `error: preload not found` even though the file exists, making the check look blocked; only an absolute path loads. Ignoring this wastes a round-trip per smoke check or pushes the check into a throwaway test file (wrong surface for docs-only units).

# Evidence

Session repro from a worktree root: `bun --preload utils/happydom.js -e '...'` exited with `error: preload not found "utils/happydom.js"`; the identical script with `bun --preload "$PWD/utils/happydom.js" -e '...'` ran and verified the message-scroller jump-button wiring (data-active flips, signal written on click).
