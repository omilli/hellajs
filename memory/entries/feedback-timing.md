# Feedback runs once per loop not per skill

**Date:** 2026-06-24
**Type:** decision
**Source:** feedback run on audit→plan handoff (scripts-ts-migration)
**Lives in:** `AGENTS.md` §Skills, `feedback/SKILL.md` frontmatter

## Decision
Feedback runs after a full loop completes (audit→plan→worker), or immediately on blocking friction. Not after every individual skill.

## Why
Per-skill feedback was wasteful: the audit phase had zero friction, so a feedback pass after it would propose nothing. Friction points resolve in later phases (a Phase 2 gap is often handled by Phase 5). The aggregate view after the full loop catches systemic patterns invisible per-skill (TEMPLATE multi-task gap only visible when seeing audit produce 14 findings AND plan try to structure them).
