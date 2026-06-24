# Feedback edits skills directly — does not delegate to skills-creator

**Date:** 2026-06-24
**Type:** decision
**Source:** feedback run on hotpath/core (2026-06-24), Q3 boundary analysis
**Lives in:** `.agents/skills/feedback/SKILL.md` Step 4

## Decision
When a feedback proposal is accepted, feedback applies the edit to the SKILL.md directly. It does NOT hand the edit off to `skills-creator`. skills-creator is a separate track for new-skill creation or ground-up rewrites, not for applying accepted one-step patches.

## Why
skills-creator lives in `~/.opencode/skills/` (opencode-global) and applies generic writing principles — its guidance says "avoid shouting MUST/NEVER in caps." Project skills in `.agents/skills/` have a specific house style that *deliberately* uses "Never" framing: every skill carries the two Non-negotiables verbatim, and hotpath's invariant is "Never assert a speedup you did not measure." Delegating a project-skill edit to skills-creator would import generic principles that drift the skill away from house style. feedback Step 4's "apply as a cohesive edit... following the skill's existing structure" preserves house style by construction. feedback also holds the evidence-grounded proposal (cited step + exact edit) in context; delegating would force re-derivation.
