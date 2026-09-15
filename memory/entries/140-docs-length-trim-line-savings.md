---
type: decision
title: Docs length-trim line savings come only from whole-line removals
description: Package-doc mdx prose is single-line-per-paragraph, so within-paragraph compression moves wc -l by zero; plan length-trim savings only from removed tables, bullet lists, or whole paragraphs.
tags: [docs, planning]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [length-trim, docs-audit, plan-estimate]
---
# Why
Length-trim plans that estimate landing counts from "compress repeated prose" overshoot: four within-paragraph compressions in `patterns/routing.mdx` moved the count by −1 (the leading blank line), not the ~40 lines the plan's advisory assumed. Estimates must count only structural removals (tables, bullets, blank-line fixes, whole paragraphs) or declare the landing advisory and bind on parity + strict reduction instead.

# Evidence
`plans/router/audit/docs/05-docs-length-trim.md` unit: patterns/routing.mdx 521 → 520 after compressing pending re-explanations and two Server-section intros (`wc -l` post-edit); router.mdx dropped 412 → 397 only because a 9-line table, a 4-line bullet list, and a 2-line paragraph were removed. Amended `guides/docs.md` §Length Targets (healthy range / flag beyond) makes the range-to-flag zone judgment, so binding on parity + strict reduction is the correct contract shape.
