---
title: Re-measure bundle baselines from the live tree before trusting a plan's recorded numbers
description: A byte baseline recorded in a plan can be stale against the current head — rebuild the baseline bundle (stash working changes, build, measure, pop) before writing or judging a size gate.
tags: [bundle-size, baselines, verification, git-stash]
confirmed: 2026-12-17
---
# Why      Size gates are deltas off a recorded byte count; if a refactor landed after the measurement, the gate is unreachable and the implementer wastes effort hunting non-existent fat. Module comments in the bundle (`// packages/...` section headers) and symbol inventories (`rg -o '^\s{2}function \w+'`) diff old vs new builds cheaply and expose refactors the recorded number predates.
# Evidence  A plan recorded the bench bundle at 58,727 bytes; a fresh committed build measured 62,295 — the recording predated the dirty-children overlay refactor (visible as `dirtyChildren`/`registeredIn` present in the new bundle's `clean` and absent from the old). Stash-build-measure-pop on the worktree reproduced the true baseline; the operator re-derived the gate from it.
