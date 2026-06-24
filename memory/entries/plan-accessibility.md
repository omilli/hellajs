# Plans: density vs accessibility

**Date:** 2026-06-24
**Type:** preference
**Source:** Feedback run on fix-sync-autocommit-files plan (2026-06-24); user explicit.
**Lives in:** Open tension — not yet encoded in a guide/skill. Partially addressed: H1 aggregate-status marker landed in `plan/TEMPLATE.md` Hard rules + `worker/SKILL.md` Step 3 (recompute on tick).

## Preference
Plan documents are heavily optimized for density and assume an expert reader. The user wants them to also carry minimal ("caveman-level") examples and visual affordances (status markers, glanceable hints) so an expert can navigate them. The H1 `[ ]`/`[x]` aggregate marker (added this run) is the first such affordance.

## Why
The plan skill deliberately treats Strategy as terse advisory prose ("not a parse target") and centralizes structure for the worker to parse. That serves the worker but starves a human skimming `plans/`. Notably, `Surface change: no` plans (config/internal) seed zero example today — only `Surface change: yes` plans get a runnable example via Contract `Public API delta` (`TEMPLATE.md:47`). Future plan-skill edits should weigh accessibility alongside density, not density alone.
