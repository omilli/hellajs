---
name: author
description: >
  Switch to agent-file authoring mode when creating or editing AGENTS.md, agent/skill/command prompts, or any instruction/rules file consumed by AI agents. Enforces AI-not-human voice, density, no redundancy with always-loaded context, correct trigger descriptions, and a verify gate. Use when writing, revising, or tightening these files. Use ONLY for agent-instruction files — not human documentation (READMEs, user docs, tutorials).
---

# Author

These files are consumed by agents, not humans. They load on every session or matching trigger, so every line is a permanent context tax — a redundant or human-targeted line earns nothing. author owns the **voice/format/method layer** across agent-instruction files. For a SKILL.md, `skill` leads anatomy/progressive disclosure — author informs voice. For AGENTS.md, agent prompts, command templates, project rules/style guides, author leads. Governed by prime: an edit to an always-loaded file changes every future run.

## Escape hatch

Typo or one-word fix → make it, stop. Author is for writing, revising, or tightening instruction prose.

## Step 1 — Read before write, and read for redundancy

Read the target file in full + immediate neighbors (section above/below; for a skill, its frontmatter and siblings). Then read what is **always loaded alongside it**: the harness system prompt, the user's global agent config, root AGENTS.md (§Skills, §Scripts, §Testing, §Non-negotiables), and sibling skills' descriptions. Prevents the most common failure — an instruction file duplicating content injected on every run. Redundancy with always-loaded context is pure tax; this read catches it.

An AGENTS.md/rules guide describing a codebase → ground every claim in source read this session; don't carry drift from the old file on trust.

## Step 2 — Choose format per block, not wholesale

- **A format earns its tokens when it changes how the agent reads the content.** Table = relational data scannable; header = navigation; bold-label bullet = atomic fact.
- **Cheaper representation wins when it's just navigation or labeled facts.** Nesting those, or wrapping a single child element, adds tokens for zero gain. Drop single-child wrappers — always removable.

Defaults: headers for sections; tables for relational data; bold-label bullets for atomic facts; plain prose for overviews/verdicts.

**Rules/style guide specifically**: three layers — decision trees at top (traverse to a decision), prose rules in middle, verification checklist at end (the audit floor; the matching `audit-*` skill ticks it instead of reconstructing rules from prose). Open with a one-line **Decision Precedence** (ranked tradeoffs) so conflicts resolve consistently. `guides/` is the live example of this shape — match it.

Match the file's **existing** conventions exactly — one line-wrap style, one bullet style, one voice. Inconsistency = this method was skipped.

## Step 3 — Write in agent voice

- **Imperative** — "Do X", not "you might consider X."
- **Dense** — lead with the load-bearing word; cut hedges, filler, motivation, human-targeted scaffolding.
- **Trigger-focused (descriptions/frontmatter)** — front-load literal keywords that should fire the file; cover *what* AND *when*; gate with "Use ONLY when…" where it must stay quiet.
- **Explain why where it aids generalization** — don't narrate the obvious.

## Step 4 — The density gate (before finishing)

For every line: does this earn its permanent context cost? Cut/merge anything that duplicates the always-loaded context, duplicates another section in the same file, states the obvious to a capable model, or carries drift the source no longer supports. A shorter file that says the same thing is strictly better.

## Step 5 — Trigger verification (for skills/prompts with descriptions)

Fires on the intended cases? False-fires on adjacent ones (→ narrow with "Use ONLY when…")? Collides with another skill's trigger surface (→ define precedence in the body)?

## Step 6 — Sync cross-references

After any edit that adds/renames/removes/materially changes a skill, search AGENTS.md and every sibling skill for references to it — name, loop role, cross-handoff. Sync every stale reference in the same pass. Match the skill name as a whole token (or backtick-quoted), not a bare substring. A dangling reference is an unfinished edit.

## Self-check

Every claim grounded in source or real workflow; density gate ran; skill description fires right with no false-fire; every cross-reference to a changed skill synced.

Run the prime handoff gate; evaluate the `feedback` trigger table literally: redundancy with always-loaded context found only at the density gate → `feedback` (Step 1 neighbor read didn't surface it); stale cross-reference surfaced in Step 6 → `feedback` (strengthen the sync rule); format choice redone → `feedback` (Step 2 didn't resolve first pass).
