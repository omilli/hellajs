---
name: brain-skill
description: >
  Author new skills or revise existing ones. Covers capturing intent, SKILL.md anatomy, progressive disclosure, writing style, and packaging. Use when creating or editing a skill, or when the user says "turn this into a skill".
---

# Skill creator

Create skills from scratch, or edit and restructure existing ones. This skill is invoked explicitly — no triggering logic.

## Capture intent first

Mine the current conversation before asking — the workflow the user wants to capture is usually already there ("turn this into a skill"). Look for the tool sequence, the step order, the corrections the user made, and the input/output formats.

Then ask only the questions that determine the skill's shape. Don't start writing until these are settled:

1. What should this skill enable the agent to do?
2. What is the exact output format? Get a concrete example.
3. What triggers it — which keywords or situations?
4. What edge cases, dependencies, or constraints matter?

## Frontmatter (the hard rules)

- **name** — required, lowercase-hyphen, ≤64 chars, must match the folder name.
- **description** — effectively required; skills without one are filtered out and never surfaced. This is the trigger, not a summary. Front-load the literal keywords the user will say, cover *what* AND *when*, and gate with "Use ONLY when…" if the skill should stay quiet on adjacent topics.
- **compatibility** — optional, rarely needed.

The authoritative field list lives in your agent's skill-authoring docs (for opencode, the schema at https://opencode.ai/config.json) — check there if unsure rather than guessing.

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

Skills load in three tiers — place content in the tier that matches it:

1. **Metadata** (name + description) — always in context. Keep it tight and trigger-focused.
2. **SKILL.md body** — loaded when the skill runs. Keep under ~500 lines.
3. **Bundled resources** — loaded on demand, effectively unlimited. Scripts can run without being loaded into context.

Rules:

- Bulky, conditional, or domain-specific content belongs in `references/`, not the body. For multi-domain skills, split references by variant and read only the relevant one.
- Large reference files (>300 lines) need a table of contents so the agent can navigate.
- If the same helper logic recurs (a formatter, a parser, a builder), bundle it once as a script in `scripts/` — never reinvent it inline each run.

## Writing style

- **Imperative mood.** "Do X", not "You might consider X."
- **Explain why.** Given reasons, the model generalizes beyond rote rules. "Why" is what makes a skill robust across prompts.
- **No caps-shouting.** If you reach for MUST/NEVER, reframe it as reasoning. Caps rarely change behavior; reasons do.
- **Generalize.** Skills run across many prompts. Overfitting to one example makes them brittle.
- **Define output formats explicitly** — exact templates, not vibes. Provide an example for any non-trivial format.
- Draft, reread with fresh eyes, cut, improve.

## Improving an existing skill

Read the current SKILL.md and critique it against the principles above *before* editing. Common rot:

- Instructions that dictate without explaining why.
- Output formats left implicit.
- Body bloat that belongs in `references/`.
- Duplicated logic that should be a bundled script.

Cut anything not pulling its weight. Preserve the directory name and the `name` field. If the install path is read-only, copy to a writable location before editing.

## Packaging

Stage in `/tmp/` before copying to the output directory. Package the finished skill and return the path to the user.

## Before you finish

Re-check: frontmatter valid, `name` matches the folder, `description` triggers correctly, body under ~500 lines, and nothing stranded in the body that belongs in `references/`.
