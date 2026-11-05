---
title: "Async computed traps: Promise-as-value and untracked post-await reads"
description: In an async computed getter, signal reads before the first await ARE tracked; the traps are the cached value being the Promise itself and post-await reads subscribing nothing.
tags: [core, computed, async, reactivity]
confirmed: 2026-11-04
---
# Why

Prose claiming an async computed "never invalidates" or "tracks nothing" is wrong on both counts and misleads anyone writing docs, skills, or tests about async reactivity in `@hellajs/core`. An async function body executes synchronously until the first `await`, so pre-await signal reads link normally and a later write to them re-runs the getter (producing a new cached Promise). The actual failure modes: the node's cached value is the Promise, never the resolved payload, so subscribers receive a promise that never resolves into the graph; and every read after the first `await` resumes outside the restored tracking context (`updateComputed`'s `finally` already ran on the synchronous return), subscribing nothing.

# Evidence

`packages/core/lib/internal/execution.ts` `updateComputed`: the getter runs synchronously under `setCurrentSub` with restore in `finally`. `packages/core/lib/computed.ts` caches `computedNode.value` from the getter's return, whatever it is. JS async semantics: the body runs synchronously to the first `await`. Verified 2026-11-04 while authoring the core best-practices skill; the rule file `cmp-sync-pure` states the corrected mechanism.
