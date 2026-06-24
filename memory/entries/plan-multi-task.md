# Surface-change:no permits multi-task plans

**Date:** 2026-06-24
**Type:** decision
**Source:** scripts-ts-migration plan (5 tasks, surface-change:no)
**Lives in:** `plan/TEMPLATE.md` line 105

## Decision
Surface-change:no plans may have multiple tasks when work spans distinct concerns. No trio required.

## Why
TEMPLATE only showed single-task for no and trio for yes. Non-package work (scripts migration with cleanup→rename→restructure phases) naturally produces multi-task no plans. The trio pattern is about public surface, not about task count.
