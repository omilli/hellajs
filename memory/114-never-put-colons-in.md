---
title: Never put colons in best-practices rule frontmatter titles - the parser keeps quote chars
description: "`skills-build`'s parseFrontmatter does not strip YAML quoting - `title: \"A: B\"` stores the quotes in the value, so the single-H2-equals-title validation fails even when the H2 text matches. Keep titles colon-free."
tags: [skills-build, frontmatter, best-practices-skills, rules, validation]
confirmed: 2026-11-04
---

# Why

A rule title containing a colon forces YAML quoting (`title: "Give values their units: numbers mean px"`), and `skills-build`'s naive frontmatter parser (`parseFrontmatter` in `scripts/skills-build.ts`) captures the raw scalar with the quote characters included - it has no quote-stripping step. `validateSkill` then compares the single H2 against the quoted value (`## "A: B"` vs `## A: B`) and reports `expected exactly one H2 equal to the title`, which does not point at the colon as the cause. Keep rule titles colon-free (reword, or use a comma/dash); the same applies to any frontmatter key compared against body text.

# Evidence

- Parser read at `scripts/skills-build.ts parseFrontmatter` (regex `^([A-Za-z][\w-]*):\s*(.*)$`; `data.set(key, value.trim())` with no quote handling) and `validateSkill` (`h2s[0] !== \`## ${title}\``).
- css-best-practices unit (2026-11-04): retitled `css-value-semantics` from the quoted colon form to `Numbers mean px, so pass other units in strings` preemptively; build validated clean.
