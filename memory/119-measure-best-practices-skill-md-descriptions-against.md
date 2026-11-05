---
title: Measure best-practices SKILL.md descriptions against the 1024 cap before the skills-build gate
description: "A comprehensive trigger description drafts at ~1200 chars while siblings run 900-1023 against the hard 1024 cap - count the string length before running vp run skills-build, not after it reds."
tags: [skills-build, best-practices-skills, SKILL.md, frontmatter, description]
confirmed: 2026-11-05
---

# Why

The `*-best-practices` SKILL.md frontmatter `description` is the skill's trigger and is hard-capped at 1024 chars by `skills-build` validation. The natural first draft - export names, when-to-apply, misuse surfaces, and the full "Use ONLY for" gate chain - runs well past the cap, while the delivered siblings all press against the ceiling (900-1023 chars). Eyeball-trimming undershoots twice; measuring the string length before writing lands under the cap in one pass. Squeeze the gate chain and the misuse-surface list first - they compress hardest.

# Evidence

`scripts/skills-build.ts validateSkill` (`description.length > 1024` -> "description is N chars, max 1024"), read in-repo. Sibling description lengths measured with awk over all `.agents/skills/*-best-practices/SKILL.md` (2026-11-05): 900 (core) through 1023 (vite). The rollup skill's description red the gate at 1233 and again at 1186 before a measured rewrite landed at 1017 (2026-11-05).
