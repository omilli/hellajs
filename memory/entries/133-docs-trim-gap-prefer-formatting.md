---
type: decision
title: "When a docs-trim delta's levers fall short of its DoD line cap, prefer formatting compression over content cuts"
description: Operator fork resolution for plan-arithmetic gaps in length-capped doc examples: compress legal formatting first; only cut demo content when formatting cannot close the gap.
tags: [plan, docs]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [doD-line-cap-gap, example-length-trim, plan-arithmetic-shortfall, docs-trim-fork]
---

# Why

A plan delta that names specific trim levers (drop nesting, drop one comment) can net short of its own DoD numeric cap (block ≤ N lines). The worker then needs a lever the delta didn't name. When this fork was put to the operator (css index.mdx example: named levers floor at 42 vs ≤40 cap), the resolution was the zero-information-loss option: compress `vars()` to a single-line call, legal because the multiline-object rule (guides/docs.md §Code Examples → Example Code Style) and `bun lint:structure`'s `INLINE_CSS_OBJECT_RE` bind `css()`/`style()` only. Cutting demo content (slimming cva variants or style() properties) was offered and rejected as the first choice. Ordering: formatting compression that loses no information > feature-depth cuts > dropping registrations (never — the creators are the point of an index example).

# Evidence

Operator dialog, worktree plans-css-audit-docs, 2026-09-10 (plan set css/audit/docs unit 04): options presented were one-line vars() (chosen), slim cva variants, slim style() props, hand back to plan. Result landed at exactly 40 content lines with all five registrations and full feature depth intact. Guide-legal check: `scripts/doc-structure.ts:89` `INLINE_CSS_OBJECT_RE = /(css|style)\(\{[^}\n]*\}\)/` — vars not matched. Root fix for the gap class itself: plan SKILL.md Phase 3 trap 7 (threshold/lever arithmetic), applied via feedback the same run.
