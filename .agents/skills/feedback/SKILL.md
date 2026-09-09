---
name: feedback
description: >
  Review a just-completed non-trivial run for friction and conservatively apply edits to AGENTS.md, the guides, or a skill (left uncommitted for diff review) so the next run is better. Use after a task that hit errors, rework, a wrong assumption, a rule or tool that didn't hold, or a user correction — or when explicitly asked how a run went. A clean run proposes nothing; that is the common and correct outcome. Use ONLY for improving the config/skills, not for doing the work itself.
---

# Feedback

The self-improvement loop: AGENTS.md, `guides/`, and `.agents/skills/` govern the work; feedback governs them. Conservative by design — a clean run is a good run. Compound value is high (one rule fix improves every future run), but the bar is cited evidence from THIS run, never imagination. Governed by prime.

## Step 1 — Evaluate the trigger table (mechanical, not judgment)

Feedback fires iff ANY row held this run:

| # | Trigger | Read as |
|---|---|---|
| 1 | A check, gate, or command failed ≥2 attempts | A rule or tool didn't hold — the prescription was wrong for reality |
| 2 | A stated rule, guide, or skill text conflicted with observed source/behavior | Config drift or a wrong rule |
| 3 | The user corrected or redirected mid-run | The config steered wrong |
| 4 | A tool behaved contrary to its documented contract | Doc rot in the config |
| 5 | Output was re-derived, redone, or guessed-then-corrected | An instruction was missing/vague |
| 6 | Redundancy found: a line duplicating always-loaded context or another file | Context tax |

Zero rows → "clean run, no proposals", stop. Do not rationalize a row into existence; do not wave one away — evaluate the table literally.

**Scan both scopes before closing** — project (this repo) vs global (generalizes across projects). The first finding noticed anchors attention; re-scan the other scope.

## Step 2 — Propose, conservatively

One proposal per fired trigger:

> **Target**: `AGENTS.md §[section]` | `guides/[file].md §[section]` | `.agents/skills/[skill]/SKILL.md §[step]`
> **Evidence**: the specific moment in this run (the trigger row + what happened)
> **Gap**: what the config didn't cover or got wrong
> **Proposal**: the specific edit, with reasoning

No bundling unrelated issues; no hypothetical improvements without run evidence. A proposal touching a guide syncs the checklist item that audits the rule in the same pass — `audit` ticks the checklist, not the prose.

## Step 3 — Route each proposal

**Kind:**
- **Config/skill gap** (instruction missing/vague/wrong) → edit root `AGENTS.md`, `guides/`, or `.agents/skills/` (first-party files).
- **Project rule conflicted with the work** → rule-update proposal for that rule (guide, guard, or AGENTS.md), not a config edit.
- **Recallable fact/decision, not a rule** → hand to `memory`.

**Scope:** project → this repo's config; global → the user's global agent config (outside this repo). Test: *would this fix apply in any project?* Don't bury a universal lesson in one project; don't pollute project config with generic rules.

## Step 4 — Apply, uncommitted

Apply immediately — no approval round-trip. `author` applies AGENTS.md/guides edits (voice + cross-reference sync same-pass); `skill` applies SKILL.md anatomy edits. Report each edit: file + section + evidence + reasoning. Everything lands **uncommitted** — the never-commit rule is the checkpoint: reviewed as `git diff`, rejected by reverting. A merits rejection is dropped; re-propose only on new evidence.

## Self-check

Trigger table evaluated literally (each row checked, not vibes); both scopes scanned; every proposal cites its trigger row + the specific moment; clean run → said so; applied via `author`/`skill`, uncommitted.
