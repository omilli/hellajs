# Plan paths derive from package + root-task type

**Date:** 2026-06-24
**Type:** decision
**Source:** feedback run on plan-path convention (2026-06-24)
**Lives in:** `.agents/skills/plan/TEMPLATE.md` Hard rules (path bullet) + path lines 66 & 111

## Decision
Plan files live at `plans/{package}/{type}/[name].md` — `{package}` = `Contract.Package`, `{type}` = lowercase root-task Type tag (`code` | `tests` | `docs` | `misc`). Non-package work → `plans/meta/{type}/`. Never root-level. Supersedes the prior implicit root-level practice (no prior memory entry existed to reshape).

## Why
The type words match the worker's Type-tag vocabulary, so the folder signals what the worker is parsing; the path is fully deterministic (derived from `Contract.Package` + the root task's Type), removing the inference that once put a package plan at `plans/dfs-stack-reuse.md` (root). Trio plans root in Code → `code/`; their embedded Tests/Docs tasks are still dispatched by the worker via in-file Type tags, so `tests/` and `docs/` buckets stay thin by design (pure single-type plans only) — "plans containing test work" is a content scan, not a folder glob.
