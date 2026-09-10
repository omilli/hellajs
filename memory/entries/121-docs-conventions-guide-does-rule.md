---
type: decision
title: "Docs conventions the guide does not rule on — prose-prefixed ⚠️ callouts and multi-sentence concept intros are accepted repo-wide forms, not per-package violations"
description: "Prose-prefixed ⚠️ callouts and multi-sentence concept intros are accepted repo-wide docs forms the guide doesn't rule on — audit-docs must not flag them per-package."
tags: [docs, conventions, audit]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [docs-convention-gap, prose-warning-callout, concept-intro-length, audit-docs-gap, alert-box-rule]
---

# Why

Two docs forms recur across packages with no `guides/docs.md` rule governing them; without this entry every `audit-docs` run re-surveys siblings to avoid emitting taste findings (the skill forbids ungrounded findings and says "rule absent → note the gap, don't substitute taste"):

1. **Prose-prefixed `⚠️` callouts** — a paragraph starting with `⚠️` in a concept doc (not in a code comment, not an alert box, not a blockquote). §Alert Boxes governs `<div role="alert">` and blockquote callouts; §Good/Bad Patterns lists `⚠️` for in-code warnings only. The prose form is neither sanctioned nor banned.
2. **Multi-sentence concept-doc intros** — the Concept Docs template shows "One-line description of the concept", but established concept docs open with 2–3-sentence intro paragraphs including cross-references.

Both are convention, not violations: flagging them per-package would break Accuracy>Consistency and contradict the sibling majority. They become findings only if the guide takes a stance (a `feedback` rule-update, not a package fix).

# Evidence

Verified 2026-09-10 during the ssr docs audit (`plans/ssr/audit/docs/`):

- `rg -n '^⚠️' packages/*/docs -g '*.mdx'` → exactly two hits: `packages/resource/docs/concepts/resources.mdx:99` and `packages/ssr/docs/concepts/ssr.mdx:71` — two packages share the form; `guides/docs.md` §Alert Boxes has no rule covering it.
- Concept intros measured: `packages/store/docs/concepts/state.mdx` opens with 3 sentences (including two cross-reference links); `packages/css/docs/concepts/styling.mdx` opens with a multi-clause two-sentence paragraph; `packages/dom/docs/concepts/hydration.mdx` uses one sentence — mixed, majority multi-sentence, none flagged by any guard.
- Guards green with both forms present: `bun em-dash`, `bun doc-links`, `bun lint:structure`, `bun doc-snippets` strict tier all exit 0 (run 2026-09-10).
