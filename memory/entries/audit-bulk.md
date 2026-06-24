# Bulk handoff produces one evidence map not N

**Date:** 2026-06-24
**Type:** decision
**Source:** scripts audit (14 findings from one root cause, user said "hand off all")
**Lives in:** `audit/SKILL.md` Step 6

## Decision
When user hands off all findings from one root cause, produce ONE evidence map for the group. Plan derives task breakdown from the group map.

## Why
14 individual evidence maps for 14 pre-migration findings would be noise — they all trace to the same gap. The audit→plan handoff worked naturally because the conversation was continuous, but in a subagent/fresh context, N individual maps would be lossy and wasteful.
