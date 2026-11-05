<!--
Canonical rule-file template for `*-best-practices` skills. Byte-copy to
<skill>/rules/_template.md so every skill folder is independently portable
(`_`-prefixed files are skipped by skills-build validation and skills-check).

Authoring contract (`vp run skills-build` validates, `vp run skills-check` typechecks):
- Filename `<section-prefix>-<slug>.md`; the prefix must match one row of the
  skill's `rules/_sections.md` table.
- Frontmatter: `title` (non-empty), `impact`, optional `impactDescription`,
  `tags`; no other keys. Exactly one H2, equal to `title`.
- `**Incorrect (what is wrong):**` fence: wrong-but-plausible usage — the
  mistake a competent agent would make. Intentionally invalid; the typecheck
  gate skips it via the bold-label discriminator, so never mark it in a way
  that moves it out from under the label.
- `**Correct (what is right):**` fence: grounded usage that typechecks
  against the real `@hellajs/*` package (external bare-specifier imports are
  skipped, not checked).
- `Reference:` line: at least one backticked in-repo path (file or dir,
  resolved from the repo root), optionally followed by a symbol name inside
  the same backticks.

Impact calibration (correctness down):
  CRITICAL - breaks correctness: lost reactivity, leaks, glitching,
    hydration mismatch, data loss
  HIGH - measurable perf or UX degradation the library exists to prevent
  MEDIUM - suboptimal: works but fights the library's model
  LOW - convention or consistency
-->
---
title: Rule Title Here
impact: CRITICAL
impactDescription: one clause on the concrete cost
tags: comma, separated
---

## Rule Title Here

One-paragraph imperative explanation: what to do, why (mechanism, not taste).

**Incorrect (what is wrong):**

```ts
// intentionally wrong - mirrors a failure mode the package tests assert
```

**Correct (what is right):**

```ts
// grounded usage - typechecks against the real package
```

Exceptions / when the rule does not apply (if any).

Reference: `packages/<pkg>/lib/<file>.ts <symbol>` and/or `packages/<pkg>/docs/api/<page>.mdx`
