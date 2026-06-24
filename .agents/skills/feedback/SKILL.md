---
name: feedback
description: Run after any skill execution to review for skill-level friction. Conservatively proposes edits to a skill's SKILL.md only when there is clear evidence of underperformance, conflict, or ambiguity during the run. A clean run proposes nothing — that is the common and correct outcome.
---

# Feedback

Review a skill run and propose skill improvements. This is the self-improvement loop: skills govern the work, feedback governs the skills. The goal is convergence — skills improve over time toward what the agent actually needs, instead of staying static after their first write.

Conservative by design, like audit: "a clean run is a good run." Do not manufacture proposals to seem thorough. Propose only when a specific moment in the run shows the skill underperformed. The compound value is high — fixing a skill once improves every future invocation — but the bar for proposing is cited evidence, not imagination.

## Non-negotiables

Two rules govern this skill absolutely.

**Guides are inviolable.** A friction signal that reflects a guide conflict (the skill told the agent to do X, the guide says Y) is not a skill bug to work around — it is a guide-update proposal, emitted through the same mechanism every loop skill carries. Feedback distinguishes "the skill has a gap" (propose a skill edit) from "the guide has a gap" (emit a guide-update proposal for the `guide` skill to execute). Conflating the two patches the skill to work around a guide problem, which is exactly the silent deviation the Non-negotiables exist to prevent.

**Every change carries its full blast radius.** A skill edit alters every future run of that skill. Proposals are therefore conservative and evidence-grounded: cite the specific moment in the run where the skill underperformed. A hypothetical improvement with no run evidence does not qualify — it is imagination, not feedback.

## Step 1 — Intake

Identify which skill ran and review what happened: the conversation, the tool calls, the outputs, any corrections the user made, any rework or ambiguity. The run just completed is the evidence base; feedback without a specific run is general rumination, which this skill does not do.

## Step 2 — Identify friction

Look for evidence of:

- **A guide conflict the skill's workflow didn't handle cleanly** — the proposal mechanism caught it, but the skill's steps had a gap (no step covered the case; two steps contradicted each other; the workflow sent the agent down a dead end).
- **An ambiguous output** — a Contract field, a scenario, a finding, a strategy that required re-derivation, guessing, or a user correction. Ambiguity is the signal that a step under-specified its output.
- **A verification step that missed a real problem** — caught later by blast-radius, by the user, or by a failing check the skill's floor didn't include.
- **A redundant or slow step** — work the skill did that added no signal (a check that always passes, a read that duplicates another).
- **A blast-radius effect that slipped through** — a cross-package caller, a sibling test, a doc contradiction that the skill's scope didn't account for.

## Step 3 — Conservatively propose

Only when there is clear evidence — cite the specific moment in the run. Frame each proposal as:

> **Skill**: `.agents/skills/[skill]/SKILL.md` §[step]
> **Evidence**: [what happened in the run — the specific moment]
> **Gap**: [what the skill's workflow did not cover]
> **Proposal**: [the specific edit to the step, with reasoning]

If the run was clean — no friction, no conflicts, no ambiguity, no misses — say so explicitly and propose nothing. That is the common and correct outcome. A feedback skill that proposes an edit every run is churning the skills, not improving them.

## Step 4 — Do not write

Feedback proposes; it does not edit skills directly. A skill change affects every future run, so the user approves first. If the user approves a proposal, apply it as a cohesive edit to the cited step (not an ad-hoc patch), following the skill's existing structure and the two Non-negotiables every skill carries. A rejected proposal is dropped — do not re-propose it on the next run unless new evidence recurs.

## Self-check

a. Does every proposal cite a specific moment in the run, not a hypothetical?
b. Did I distinguish skill gaps (propose a skill edit) from guide gaps (emit a guide-update proposal)?
c. If the run was clean, did I say so and propose nothing — rather than manufacturing a suggestion?
d. Did I propose, not write?
