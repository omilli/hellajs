---
name: brain-feedback
description: >
  Review a just-completed non-trivial run for friction and conservatively propose edits to AGENTS.md or a skill so the next run is better. Use after a task that hit errors, rework, a wrong assumption, a rule or tool that didn't hold, or a user correction — or when explicitly asked how a run went. A clean run proposes nothing; that is the common and correct outcome. Use ONLY for improving the config/skills, not for doing the work itself.
---

# Feedback

The self-improvement loop: AGENTS.md and the skills govern the work; brain-feedback governs them. The goal is convergence — the config gets better over time toward what actually works, instead of staying static after its first write.

Conservative by design, like `brain-audit`: "a clean run is a good run." Propose only when a specific moment in the run shows the config underperformed. The compound value is high — fixing a rule once improves every future run — but the bar is cited evidence from THIS run, not imagination. Two non-negotiables apply (see `brain-prime`): rules inviolable (friction that reflects a real project-rule conflict is a rule-update proposal for the project, not a config patch) and full blast radius (a config edit changes every future run, so proposals are specific and grounded).

## Step 1 — Identify the friction

Review what happened in the run: the tool calls, the outputs, any errors, any rework, any corrections the user made, any assumption that turned out wrong. Look specifically for:

- **A rule or tool that didn't hold** — a prescribed CLI that wasn't installed; a command that failed; a check that missed a real problem caught later.
- **An unverified assumption** — something carried from memory that the environment or source contradicted.
- **Redundancy** — a line duplicating the system prompt or another file (earning no context).
- **Rework or ambiguity** — an output that had to be re-derived, guessed, or corrected.
- **A user correction** — the user pointed out something missed or gotten wrong.

**Scan both scopes before closing.** Sort every finding by scope — project (this repo) or global (generalizes across all your projects) — because a recallable finding routes to the repo knowledge base or your own global store accordingly (Step 3), and a rule-change routes to the repo or global config. A run that surfaces findings at only one scope usually didn't scan the other: the first finding noticed (typically what prompted the run) anchors attention, and the silent scope then goes unwritten. Re-scan the scope you didn't surface before closing.

No friction → say "clean run, no proposals" and stop. That is the correct, common outcome.

## Step 2 — Propose, conservatively

For each friction point, frame one proposal:

> **Target**: `AGENTS.md §[section]` or `skills/[skill]/SKILL.md §[step]`
> **Evidence**: [the specific moment in this run]
> **Gap**: [what the config didn't cover or got wrong]
> **Proposal**: [the specific edit, with reasoning]

One friction = one proposal. Do not bundle unrelated issues, and do not propose a hypothetical improvement with no run evidence.

## Step 3 — Route each proposal to the right scope

Two axes per proposal:

**Kind:**
- A **config/skill gap** — the instruction was missing, vague, or wrong → propose an edit to AGENTS.md or a skill.
- A **rule gap** — a *project* rule conflicted with the work → emit a rule-update proposal for that project's rules, not a config edit.
- A **recallable fact or decision** — verified this run, worth recalling on demand but not a rule change → hand to the `brain-memory` skill (a knowledge-base entry), not a config edit.

**Scope (for config/skill gaps):**
- **Project** — the lesson is specific to this repo's stack or conventions → edit this repo's `AGENTS.md`, `.agents/skills/`, or guides.
- **Global** — the lesson generalizes across all your projects → edit your own global agent config (outside this pack). This pack is repo-scoped; it has no global store, so a global-scoped edit is yours to make in your own environment.

Test: *would this fix apply in any project, or only this one?* Don't bury a universal lesson in one project; don't pollute a project's config with generic rules.

## Step 4 — Propose, don't write

Feedback proposes; it does not edit. A config change affects every future run, so the user approves first. On approval, hand to the `brain-author` skill to apply the edit cohesively and sync cross-references. A rejected proposal is dropped — do not re-propose it unless new evidence recurs in a later run.

## Self-check

a. Does every proposal cite a specific moment in THIS run, not a hypothetical?
b. Did I route each proposal correctly — kind (config vs rule) and scope (project vs global)?
c. If the run was clean, did I say so and propose nothing — rather than manufacturing a suggestion?
d. Did I propose, not write?
e. Did I hand approved proposals to `brain-author` to apply and sync?
f. Did I scan both scopes (project AND global) before closing — or did I anchor on the first finding and route only that?
