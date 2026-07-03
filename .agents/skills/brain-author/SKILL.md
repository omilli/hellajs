---
name: brain-author
description: >
  Switch to agent-file authoring mode when creating or editing AGENTS.md, agent/skill/command prompts, or any instruction/rules file consumed by AI agents. Enforces AI-not-human voice, density, no redundancy with always-loaded context, correct trigger descriptions, and a verify gate. Use when writing, revising, or tightening these files. Use ONLY for agent-instruction files — not human documentation (READMEs, user docs, tutorials).
---

# Author

These files are consumed by agents, not humans. They load on every session or matching trigger, so every line is a permanent context tax — a redundant or human-targeted line earns nothing. brain-author owns the **voice/format/method layer** across agent-instruction files. For a SKILL.md, `brain-skill` leads anatomy/progressive disclosure — author informs voice. For AGENTS.md, agent prompts, command templates, project rules/style guides, author leads. Governed by brain-prime: an edit to an always-loaded file changes every future run.

## Escape hatch

Typo or one-word fix → make it, stop. Author is for writing, revising, or tightening instruction prose.

## Step 1 — Read before write, and read for redundancy

Read the target file in full + immediate neighbors (section above/below; for a skill, its frontmatter and siblings). Then read what is **always-loaded alongside**: the system prompt, the always-loaded AGENTS.md, other skills' descriptions. Prevents the most common failure — an instruction file duplicating something already injected on every run. Redundancy with always-loaded context is pure tax; this read catches it.

AGENTS.md/rules guide describing a codebase → ground every claim in source read this session; don't carry drift from the old file on trust.

## Step 2 — Choose format per block, not wholesale

Two tests per block:

- **A format earns its tokens when it changes how the agent reads the content.** Table = relational data scannable; header = navigation; bold-label bullet = atomic fact.
- **Cheaper representation wins when it's just navigation or labeled facts.** Nesting those in XML, or wrapping a single child element, adds tokens for zero gain.

Defaults: markdown headers for sections; tables for relational data; bold-label bullets for atomic facts; plain prose for overviews/verdicts. Drop single-child wrappers — the most common waste, always removable.

**Rules/style guide specifically**: three layers — decision trees at top (traverse to a decision), prose rules in middle, verification checklist at end (the audit floor; `brain-audit` ticks it instead of reconstructing rules from prose). Open with a one-line **Decision Precedence** (ranked tradeoffs for that context) so conflicts resolve consistently.

Match the file's **existing** conventions exactly — one line-wrap style, one bullet style, one voice. Inconsistency = this method was skipped.

## Step 3 — Write in agent voice

- **Imperative.** "Do X", not "you might consider X."
- **Dense.** Lead with the load-bearing word; cut hedges, filler, motivation, human-targeted scaffolding.
- **Trigger-focused (descriptions/frontmatter).** Front-load literal keywords that should fire the file; cover *what* AND *when*; gate with "Use ONLY when…" if it should stay quiet on adjacent topics.
- **Explain why where it aids generalization** — don't narrate the obvious.

## Step 4 — The density gate (before finishing)

For every line: does this earn its permanent context cost? Cut/merge anything that:

- Duplicates the system prompt or another always-loaded file.
- Duplicates another section in the same file.
- States the obvious to a capable model.
- Carries drift the source no longer supports.

A shorter file that says the same thing is strictly better.

## Step 5 — Trigger verification (for skills/prompts with descriptions)

- Fires on the intended cases?
- False-fires on adjacent/unintended cases? If so → narrow with "Use ONLY when…".
- Collides with another skill's trigger surface? Two skills fire on the same situation → define precedence in the body.

## Step 6 — Sync cross-references

After any edit that adds/renames/removes/materially changes a skill, search AGENTS.md and every sibling skill for references to it — its name, its role in the loop composition, any cross-handoff. Sync every stale reference in the same pass. A rename/removal with a dangling reference is an unfinished edit. Match the skill name as a whole token (or backtick-quoted), not a bare substring — short names like `brain-worker`/`brain-author` appear inside common words.

## Self-check

a. Read always-loaded neighbors and cut redundancy?
b. Every claim grounded (source for codebase claims; real workflow for skill claims) — nothing from the old file on trust?
c. Format per block, no single-child wrappers, no wholesale XML where markdown suffices?
d. Rules guide → decision trees + rules + verification checklist + Decision Precedence all present?
e. File matches its own conventions exactly (one style throughout)?
f. Skill → description fires right, doesn't false-fire?
g. Density gate ran — every line earning its cost?
h. Synced every reference to the changed skill in AGENTS.md and siblings?

Run the brain-prime handoff gate; friction signals: redundancy with always-loaded context found only at the density gate (Step 4 should have caught it at Step 1), a stale cross-reference surfaced in Step 6, or a format choice that had to be re-done.
