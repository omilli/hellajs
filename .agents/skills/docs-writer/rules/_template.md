<!--
Authoring contract for docs-writer content rules (`rules/<prefix>-<slug>.md`).
Mirrors the `*-best-practices` rule template (`.agents/skills/rules-template.md`)
with prose in place of code. Read directly by the skill; `vp run skills-build`
and `vp run skills-check` ignore this folder (they compile `*-best-practices`
dirs only), so `_sections.md` has no role here and the index lives in SKILL.md.

- Filename `<section-prefix>-<slug>.md`; the prefix matches one SKILL.md
  category row (lead / shape / sent / code).
- Frontmatter: `title` (non-empty), `impact`, optional `impactDescription`,
  `tags`; no other keys. Exactly one unfenced H2, equal to `title` (a
  quoted heading inside an Incorrect/Correct fence is content, not a heading).
- `**Incorrect (what is wrong):**` fence: prose quoted verbatim from a current
  doc, its source cited in a first-line HTML comment. Never an invented example.
- `**Correct (what is right):**` fence: the rewrite in the reference page's
  shape, then the reference passage it mirrors (cite it). Four-backtick `mdx`
  fences whenever an inner code block appears.
- `Reference:` line: the reference page section that exemplifies the rule
  (`packages/core/docs/concepts/reactivity.mdx ### <heading>`) and the
  `guides/docs.md` section that owns the structural half.

Impact calibration (reader cost, heaviest first). Accuracy is never a rule
here: it is the guide's Decision Precedence #1 and outranks every rule.
  CRITICAL - teaches a wrong model of the behavior (the prose contradicts
    what the code does; route to the guide's Accuracy precedence, not a style fix)
  HIGH    - loses the reader: an opener or title that says nothing, undefined
    jargon, mechanism or rationale standing in for behavior, no section lead
  MEDIUM  - slows the reader: long sentences, heavy paragraphs, emphasis doing
    the teaching, comments that narrate the what instead of the result
  LOW     - consistency
-->
---
title: Rule Title Here
impact: HIGH
impactDescription: one clause on the reader cost
tags: comma, separated
---

## Rule Title Here

One-paragraph imperative explanation: what to do, why (the reader effect, not taste).

**Incorrect (what is wrong):**

````mdx
<!-- packages/<pkg>/docs/<path>.mdx ## <heading> -->
Quoted prose.
````

**Correct (what is right):**

````mdx
The rewrite in the reference page's shape.

<!-- packages/core/docs/concepts/reactivity.mdx ### <heading> -->
The reference passage it mirrors.
````

Exceptions / when the rule does not apply (template-fixed sections).

Reference: `packages/core/docs/concepts/reactivity.mdx ### <heading>` and `guides/docs.md §<Section>`
