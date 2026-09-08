---
type: decision
title: "A red baseline on plan-file worktree re-entry is attributed per-failure — failures tracing to this unit's own unticked delta are in-flight work to complete, not an inherited break to stop on"
description: The baseline-red stop rule targets inherited/foreign red; on re-entry, red from an interrupted instance's unticked edits of this unit's own contract is completed, not reverted.
tags: [plan-loop, worker, worktree]
timestamp: 2026-08-09
last_confirmed: 2026-08-09
triggers: [red-baseline-reentry, interrupted-unit-resume, unticked-partial-work, worktree-continue-from-unticked]
---
# Why

An interrupted worker instance can leave its unit's edits APPLIED but UNTICKED (Unit D: `values.mjs` deleted, JSDoc tightened — zero ticks in the plan file). The re-entry instruction says "continue from the first unticked task and do not redo ticked work", so the resumed run finds a dirty baseline: `bun lint` red with 11 tsc errors, none of them foreign. Worker Step 2's stop rule ("baseline red → stop and report; don't layer changes on a broken start") exists for red INHERITED from before the change or from foreign files — mechanically stopping here strands half-applied contract work and guarantees the same red on the next re-entry.

The discriminator is per-failure attribution: every failing check must trace to (a) this unit's own planned delta applied-but-unfinished → complete the delta (that IS the contract work, and "verify the task is needed" already allows finishing an in-flight state), or (b) anything else → the stop rule applies unchanged. Reverting (a) would redo work the plan asks for; stopping on it mislabels own-work friction as a broken start.

Recall this before: stopping on a red baseline inside a re-entered component worktree, deciding whether an interrupted unit's partial edits get reverted or completed, or triaging failures when plan ticks and applied edits disagree.

# Evidence

- Unit D re-entry (plans/plugins/babel/code/audit-fixes, slug plans-plugins-babel-code-audit-fixes): `git status` showed ` D plugins/babel/src/processors/values.mjs` + 11 tightened-JSDoc tsc errors in `bun lint`, all tracing to this unit's delta files; plan file had zero ticks.
- Per-failure attribution: 5x @babel/types instance errors + 6x HtmlNode-guard errors, all in files named by (or same-delta-class extensions of) the unit's Files list; completing the delta (typing fixes + test compile repairs) turned both gates green (`bun test plugins/babel/tests` 246 pass, `bun lint` exit 0) without reverting anything.
- Contrast: foreign-failure triage (root AGENTS.md §Testing) covers files OUTSIDE the target package — this entry covers the third case, own-unit unticked in-flight work.
