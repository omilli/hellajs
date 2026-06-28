---
name: brain-author
description: >
  Switch to agent-file authoring mode when creating or editing AGENTS.md, agent/skill/command prompts, or any instruction/rules file consumed by AI agents. Enforces AI-not-human voice, density, no redundancy with always-loaded context, correct trigger descriptions, and a verify gate. Use when writing, revising, or tightening these files. Use ONLY for agent-instruction files — not human documentation (READMEs, user docs, tutorials).
---

# Author

These files are consumed by agents, not humans. They load on every session or on every matching trigger, so every line is a permanent context tax — and a redundant or human-targeted line earns nothing. Authoring them well is a method, not a vibe.

brain-author owns the **voice / format / method layer** across agent-instruction files. For a SKILL.md, `brain-skill` leads on anatomy and progressive disclosure — brain-author informs the voice. For AGENTS.md, agent prompts, command templates, and project rules/style guides, brain-author leads. Two non-negotiables govern this skill (see `brain-prime`): rules inviolable (a project's existing conventions govern format) and full blast radius (an edit to an always-loaded file changes every future run).

## Escape hatch

A typo or one-word fix needs no method — make it, stop. Author is for writing, revising, or tightening instruction prose.

## Step 1 — Read before write, and read for redundancy

Read the target file in full and its immediate neighbors (the section above/below; for a skill, its frontmatter and siblings). Then read what is **always-loaded alongside it**: the agent's system prompt, the always-loaded AGENTS.md, and other skills' descriptions. The failure mode this prevents is the most common one — an instruction file that duplicates something already injected on every run. Redundancy with always-loaded context is pure tax; this read is what catches it.

For an AGENTS.md or rules guide describing a codebase, ground every claim in source read this session — do not carry drift from the old file on trust.

## Step 2 — Choose format per block, not wholesale

Decide format per content block, applying two tests:

- **A format earns its tokens when it changes how the agent reads the content.** A table makes relational data scannable; a header segments for navigation; a bold-label bullet labels an atomic fact.
- **The cheaper representation wins when the structure is just navigation or labeled facts.** Nesting those in XML, or wrapping a single child element, adds tokens for zero gain.

Defaults: markdown headers for sections; tables for relational data; bold-label bullets for atomic facts; plain prose for overviews and verdicts. Drop single-child wrappers — they are the most common waste in dense instruction files and are always removable.

**For a rules / style guide specifically**, use the three-layer structure: decision trees at the top (traverse to a decision), prose rules in the middle, a verification checklist at the end. The checklist is the audit floor — `brain-audit` ticks it instead of reconstructing rules from prose. Open the guide with a one-line **Decision Precedence** (the ranked tradeoffs for that context) so conflicts resolve consistently.

Match the file's **existing** conventions exactly — one line-wrap style, one bullet style, one voice. Inconsistency within a file is a sign this method was skipped.

## Step 3 — Write in agent voice

- **Imperative.** "Do X", not "you might consider X."
- **Dense.** Lead with the load-bearing word; cut hedges, filler, motivation, and human-targeted scaffolding.
- **Trigger-focused (for descriptions/frontmatter).** Front-load the literal keywords that should fire the file; cover *what* AND *when*; gate with "Use ONLY when…" if it should stay quiet on adjacent topics.
- **Explain why where it aids generalization** — but do not narrate the obvious.

## Step 4 — The density gate (run before finishing)

For every line, ask: does this earn its permanent context cost? Cut or merge anything that:

- Duplicates the system prompt or another always-loaded file.
- Duplicates another section in the same file.
- States the obvious to a capable model.
- Carries drift the source no longer supports.

A shorter file that says the same thing is strictly better. This gate is the difference between a curated instruction file and a bloated one.

## Step 5 — Trigger verification (for skills/prompts with descriptions)

- Does the description fire on the intended cases?
- Does it false-fire on adjacent, unintended cases? If so, narrow with "Use ONLY when…".
- Does it collide with another skill's trigger surface? If two skills fire on the same situation, define precedence in the body.

## Step 6 — Sync cross-references

After any edit that adds, renames, removes, or materially changes a skill, check the blast radius across the instruction surface: search AGENTS.md and every sibling skill for references to the changed skill — its name, its role in the loop composition, and any cross-handoff. Sync every stale reference in the same pass. A rename or removal with a dangling reference is an unfinished edit; this is exactly the failure that leaves one skill pointing at a name that no longer exists. When searching, match the skill name as a whole token (or backtick-quoted), not a bare substring — short names like `brain-worker` or `brain-author` appear inside common words.

## Self-check

a. Did I read the always-loaded neighbors and cut redundancy with them?
b. Is every claim grounded (source for codebase claims; the real workflow for skill claims) — nothing carried from the old file on trust?
c. Is format chosen per block, with no single-child wrappers and no wholesale XML where markdown suffices?
d. For a rules guide: decision trees + rules + verification checklist + Decision Precedence all present?
e. Does the file match its own existing conventions exactly (one style throughout)?
f. For a skill: does the description fire right and not false-fire?
g. Did the density gate run — is every line earning its context cost?
h. Did I sync every reference to the changed skill in AGENTS.md and the sibling skills?
