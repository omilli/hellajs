---
name: brain-skill
description: >
  Author new skills or revise existing ones. Covers capturing intent, SKILL.md anatomy, progressive disclosure, writing style, and packaging. Use when creating or editing a skill, or when the user says "turn this into a skill".
---

# Skill creator

Create skills from scratch, or edit/restructure existing ones. Invoked explicitly — no triggering logic.

## Capture intent first

Mine the current conversation before asking — the workflow is usually already there ("turn this into a skill"): tool sequence, step order, corrections, input/output formats.

Ask only what determines the skill's shape; don't start writing until settled:

1. What should this skill enable the agent to do?
2. Exact output format? Get a concrete example.
3. Trigger — which keywords/situations?
4. Edge cases, dependencies, constraints?

## Frontmatter (hard rules)

- **name** — required, lowercase-hyphen, ≤64 chars, must match the folder name.
- **description** — effectively required; skills without one are filtered out and never surfaced. This is the trigger, not a summary. Front-load literal keywords the user will say; cover *what* AND *when*; gate with "Use ONLY when…" if it should stay quiet on adjacent topics.
- **compatibility** — optional, rarely needed.

Authoritative field list lives in your agent's skill-authoring docs (for opencode, the schema at https://opencode.ai/config.json) — check there if unsure.

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

Three tiers — place content in the tier that matches it:

1. **Metadata** (name + description) — always in context. Tight, trigger-focused.
2. **SKILL.md body** — loaded when the skill runs. Keep under ~500 lines.
3. **Bundled resources** — loaded on demand, effectively unlimited. Scripts can run without being loaded into context.

Rules:

- Bulky/conditional/domain-specific content → `references/`, not the body. Multi-domain skills: split references by variant, read only the relevant one.
- Reference files >300 lines → need a table of contents.
- Recurring helper logic (formatter, parser, builder) → bundle once as a script in `scripts/`; never reinvent inline each run.

## Writing style

- **Imperative.** "Do X", not "You might consider X."
- **Explain why.** Given reasons, the model generalizes beyond rote rules. "Why" makes a skill robust across prompts.
- **No caps-shouting.** If you reach for MUST/NEVER, reframe as reasoning. Caps rarely change behavior; reasons do.
- **Generalize.** Skills run across many prompts. Overfitting to one example makes them brittle.
- **Define output formats explicitly** — exact templates, not vibes; an example for any non-trivial format.
- Draft, reread with fresh eyes, cut, improve.

## Improving an existing skill

Read the current SKILL.md and critique against the principles above *before* editing. Common rot: dictates with no "why"; implicit output formats; body bloat belonging in `references/`; duplicated logic that should be a bundled script.

Cut anything not pulling its weight. Preserve the directory name and the `name` field. Install path read-only → copy to a writable location before editing.

## Packaging

Stage in `/tmp/` before copying to the output dir. Package the finished skill; return the path.

## Before you finish

Re-check: frontmatter valid; `name` matches folder; `description` triggers correctly; body under ~500 lines; nothing stranded in the body that belongs in `references/`.

Run the brain-prime handoff gate; friction signals: an anatomy/progressive-disclosure issue discovered mid-edit that the principles above didn't flag up front, or a trigger description that false-fires on an adjacent case.
