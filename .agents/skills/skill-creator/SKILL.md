---
name: skill-creator
description: Create new skills, or modify and improve existing ones. Covers SKILL.md anatomy, progressive disclosure, writing style, and packaging.
---

# Skill Creator

Create skills from scratch, or edit and restructure existing ones. This skill is invoked explicitly — no triggering logic.

## Capture intent

The current conversation may already contain the workflow the user wants to capture ("turn this into a skill"). Mine conversation history first — tools used, step sequence, corrections the user made, observed input/output formats — then fill gaps with targeted questions.

1. What should this skill enable the agent to do?
2. What is the expected output format?
3. What dependencies, edge cases, or constraints matter?

Interview proactively about input/output formats, example files, success criteria, and dependencies. Don't start writing until the scope is ironed out.

## Write the SKILL.md

Fill in:

- **name** — identifier
- **description** — one-line summary of what the skill does
- **compatibility** — required tools/dependencies (optional, rarely needed)
- **body** — the instructions

## Skill anatomy

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled resources (optional)
    ├── scripts/    — executable code for deterministic/repetitive tasks
    ├── references/ — docs loaded into context as needed
    └── assets/     — files used in output (templates, icons, fonts)
```

### Progressive disclosure

Skills load in three tiers:

1. **Metadata** (name + description) — always in context (~100 words)
2. **SKILL.md body** — loaded when the skill runs (aim for <500 lines)
3. **Bundled resources** — loaded as needed (unlimited; scripts can run without loading)

Keep SKILL.md under 500 lines. Approaching the limit, add hierarchy and clear pointers to where the agent should go next. For large reference files (>300 lines), include a table of contents. For multi-domain skills, split references by variant and read only the relevant one.

If the same helper logic would be needed across invocations (a formatter, a builder, a parser), bundle it once as a script in `scripts/` rather than reinventing it inline every time.

## Writing style

- Prefer the imperative mood.
- Explain **why** each instruction matters. Models are smart; given reasons, they generalize beyond rote rules.
- Avoid shouting MUST/NEVER in caps. If you reach for one, reframe as reasoning.
- Generalize. Skills run across many prompts; overfitting to one example makes them brittle.
- Write a draft, reread with fresh eyes, improve.

Define output formats explicitly:

```markdown
## Report structure
ALWAYS use this exact template:
# [Title]
## Executive summary
## Key findings
## Recommendations
```

Examples pattern:

```markdown
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

## Improving an existing skill

Read the current SKILL.md and assess it critically against the writing-style principles above before editing. Common failure modes: instructions that dictate without explaining why, output formats left implicit, sections that bloat the body when they belong in `references/`, and duplicated logic that should be a bundled script. Cut anything not pulling its weight.

When updating an installed skill:

- Preserve the original directory name and `name` frontmatter field.
- The install path may be read-only — copy to a writable location before editing.
- Stage in `/tmp/` before copying to the output directory.

## Packaging

Package the finished skill and return the `.skill` file path to the user.
