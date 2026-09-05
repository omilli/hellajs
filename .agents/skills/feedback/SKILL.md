---
name: feedback
description: >
  Review a just-completed non-trivial run for friction and conservatively propose edits to AGENTS.md, the guides, or a skill so the next run is better. Use after a task that hit errors, rework, a wrong assumption, a rule or tool that didn't hold, or a user correction — or when explicitly asked how a run went. A clean run proposes nothing; that is the common and correct outcome. Use ONLY for improving the config/skills, not for doing the work itself.
---

# Feedback

The self-improvement loop: AGENTS.md, `guides/`, and `.agents/skills/` govern the work; feedback governs them. Conservative by design, like `audit` — "a clean run is a good run." Propose only when a specific moment in the run shows the config underperformed. Compound value is high (fixing a rule once improves every future run), but the bar is cited evidence from THIS run, not imagination. Governed by prime.

## Step 1 — Identify the friction

Review the run: tool calls, outputs, errors, rework, user corrections, wrong assumptions. Look for:

- **Rule or tool that didn't hold** — prescribed CLI not installed; command failed; check missed a real problem caught later (e.g. a guard passing on a structural rule it cannot see, §Testing).
- **Unverified assumption** — carried from memory but contradicted by environment/source.
- **Redundancy** — line duplicating the always-loaded context or another file.
- **Rework/ambiguity** — output re-derived, guessed, or corrected.
- **User correction** — user pointed out something missed/wrong.

**Scan both scopes before closing.** Sort every finding by scope — project (this repo) or global (generalizes across all your projects) — because a recallable finding routes to the repo KB or your global store, and a rule-change routes to repo or global config. The first finding noticed anchors attention; re-scan the scope you didn't surface.

No friction → "clean run, no proposals", stop.

## Step 2 — Propose, conservatively

One proposal per friction point:

> **Target**: `AGENTS.md §[section]` | `guides/[file].md §[section]` | `.agents/skills/[skill]/SKILL.md §[step]`
> **Evidence**: [the specific moment in this run]
> **Gap**: [what the config didn't cover or got wrong]
> **Proposal**: [the specific edit, with reasoning]

No bundling unrelated issues; no hypothetical improvements without run evidence. A proposal touching a guide syncs the checklist item that audits the rule in the same pass — `audit` ticks the checklist, not the prose (§Style guides).

## Step 3 — Route each proposal

Two axes:

**Kind:**
- **Config/skill gap** — instruction missing/vague/wrong → propose an edit to root `AGENTS.md`, `guides/`, or a skill under `.agents/skills/` (skills are first-party — §Skills).
- **Rule gap** — a *project* rule conflicted with the work → emit a rule-update proposal for that rule (guide, guard, or AGENTS.md), not a config edit.
- **Recallable fact/decision** — verified this run, worth recalling on demand but not a rule change → hand to `memory`.

**Scope (for config/skill gaps):**
- **Project** — specific to this repo → root `AGENTS.md`, `guides/`, or `.agents/skills/`.
- **Global** — generalizes across all your projects → the user's own global agent config, outside this repo.

Test: *would this fix apply in any project, or only this one?* Don't bury a universal lesson in one project; don't pollute a project's config with generic rules.

## Step 4 — Propose, don't write

Feedback proposes; it does not edit. A config change affects every future run → user approves first. On approval, hand to `author` to apply + sync cross-references (for a SKILL.md, `skill` leads anatomy). Rejected proposal → dropped; don't re-propose unless new evidence recurs.

## Self-check

Every proposal cites a specific moment in THIS run (no hypothetical); both scopes scanned, not anchored on the first finding; clean run → said so and proposed nothing; proposed, not wrote; approved → handed to `author` (or `skill` for skill anatomy) to apply + sync.
