# Non-package work is surface-change:no by definition

**Date:** 2026-06-24
**Type:** decision
**Source:** scripts-ts-migration plan (no index.ts to read)
**Lives in:** `plan/SKILL.md` Phase 1

## Decision
If work is not in a package workspace (scripts, root config, guides, docs infrastructure), Surface change is no by definition. Skip the index.ts read.

## Why
Phase 1 said "Read packages/[pkg]/index.ts" but scripts have no barrel. The agent had to extrapolate the fork definition to an uncovered case. Non-package work has no public API consumers, so the surface-change question is trivially no.
