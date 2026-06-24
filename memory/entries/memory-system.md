# Progressive disclosure memory system

**Date:** 2026-06-24
**Type:** decision
**Source:** user direction on cross-run memory for AI agent
**Lives in:** `memory/`, `.agents/skills/memory/SKILL.md`

## Decision
`memory/` folder with `INDEX.md` (one line per entry, scannable) + `entries/[tag].md` (8-15 lines each, read selectively). The memory skill is the single writer; all other skills read. Feedback hands off outcomes to memory; memory critically filters and persists only what affects future runs.

## Why
Flat log grows linearly and forces full-file reads. Progressive disclosure lets the agent read ~30 lines (index) then deep-dive only into 1-2 relevant entries (~15 lines each). Total cost: ~500-800 tokens for full memory access vs 2000+ for a flat log at scale. Descriptive filenames (not numbered IDs) make `ls entries/` a topic scan — no indirection.

## Structure
- `INDEX.md` — space-delimited: `date type tag summary`. Grep-friendly.
- `entries/` — flat folder. Filename: `[tag].md`. The tag IS the identifier — descriptive enough that `ls entries/` alone tells you what each entry is about.
- Types: `decision` | `rejection` | `preference` | `pattern` | `friction`
- Pruning: accepted decisions expire after 90 days; rejections never expire; friction expires after 60 days if no recurrence.
