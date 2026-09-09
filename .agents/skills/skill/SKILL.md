---
name: skill
description: >
  Author new skills or revise existing ones. Covers capturing intent, SKILL.md anatomy, progressive disclosure, writing style, and first-party installation into .agents/skills/. Use when creating or editing a skill, or when the user says "turn this into a skill".
---

# Skill creator

Create skills from scratch, or edit/restructure existing ones. Skills live at `.agents/skills/<name>/`, discovered by the harness via the frontmatter description — first-party files with the same ownership as any other repo source. Invoked explicitly — no triggering logic. `author` owns voice; this skill owns anatomy.

## Capture intent first

Mine the current conversation before asking — the workflow is usually already there: tool sequence, step order, corrections, input/output formats. Ask only what determines the skill's shape: (1) what should it enable the agent to do? (2) exact output format — get a concrete example; (3) trigger — which keywords/situations; (4) edge cases, dependencies, constraints. Don't write until settled.

## Frontmatter (hard rules)

- **name** — required, lowercase-hyphen, ≤64 chars, must match the folder name.
- **description** — effectively required; skills without one are filtered out and never surfaced. Hard cap 1024 chars (pi `docs/skills.md`); longer descriptions surface as skill conflicts — trim before finishing. This is the trigger, not a summary: front-load literal keywords the user will say; cover *what* AND *when*; gate with "Use ONLY when…" to stay quiet on adjacent topics.
- **compatibility** — optional, rarely needed.

Authoritative field list: the harness's skill-authoring docs (pi: `docs/skills.md` under the pi installation) — check there if unsure.

## Anatomy

```
skill-name/
├── SKILL.md              # required: frontmatter + instructions
└── (optional)
    ├── scripts/          # executable code for deterministic/repetitive tasks
    ├── references/       # docs loaded into context as needed
    └── assets/           # files used in output (templates, icons, fonts)
```

## Progressive disclosure

Place content in the matching tier:

1. **Metadata** (name + description) — always in context. Tight, trigger-focused.
2. **SKILL.md body** — loaded when the skill runs. Under ~500 lines.
3. **Bundled resources** — loaded on demand, effectively unlimited; scripts run without entering context.

Rules: bulky/conditional/domain-specific content → `references/`, not the body (multi-domain skills: split references by variant, read only the relevant one); reference files >300 lines need a table of contents; recurring helper logic (formatter, parser, builder) → bundle once in `scripts/`, never reinvented inline.

## Writing style

- **Imperative** — "Do X", not "You might consider X."
- **Explain why** — given reasons, the model generalizes beyond rote rules; "why" makes a skill robust across prompts.
- **No caps-shouting** — if you reach for MUST/NEVER, reframe as reasoning; caps rarely change behavior, reasons do.
- **Generalize** — skills run across many prompts; overfitting to one example makes them brittle.
- **Define output formats explicitly** — exact templates, not vibes; an example for any non-trivial format.
- Draft, reread with fresh eyes, cut, improve.

## Improving an existing skill

Critique the current SKILL.md against these principles *before* editing. Common rot: dictates with no "why"; implicit output formats; body bloat belonging in `references/`; duplicated logic that should be a bundled script. Cut anything not pulling its weight; preserve the folder name and `name` field through content edits.

## Cross-reference sync (same pass)

A skill added/renamed/removed/materially changed → sync every reference in root AGENTS.md (§Skills) and sibling skills in the same pass — `author` Step 6 leads; whole-token match, never a bare substring. A dangling reference is an unfinished edit.

## Before you finish

Frontmatter valid; `name` matches folder; `description` fires on intended cases, stays quiet on adjacent ones; body under ~500 lines; nothing stranded in the body that belongs in `references/`; cross-references synced.

Run the prime handoff gate; evaluate the `feedback` trigger table literally: anatomy/progressive-disclosure issue the principles above didn't flag → `feedback`; trigger description that false-fires on an adjacent case → `feedback`.
