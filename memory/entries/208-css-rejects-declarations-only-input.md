---
type: correction
title: css() rejects declarations-only input with a thrown Error, not a silent no-op
description: Declarations-only css() throws "top-level declarations have no selector" on both platforms — css() input starts at a selector key; use style() for flavorless component styling.
tags: [css, contract]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [declarations-only-css, css-throws-no-selector, css-example-authoring, css-api-contract]
supersedes: 132
---
# Why

Supersedes 132: css() with a declarations-only object used to be a silent no-op that leaked brace-less text into cssText(); the css package has since made it reject loudly. Recalling the old silent behavior misdirects call sites, tests, and audits — code must now expect a thrown Error (client and server), not an empty return or polluted cssText(). The authoring guidance survives unchanged: `css()` input starts at a selector key (or a conditional at-rule nesting selectors); a flavorless component style is `style()`, not `css()`. Ignoring this turns every declarations-only css() call into a runtime crash instead of a styling bug.

# Evidence

Empirical, main tree 2026-09-26 (`bun -e` against `packages/css/lib/index.ts`): `css({ background: "blue", color: "white" })` threw `[css] top-level declarations have no selector — nest them under a selector or at-rule`; the `style()` form returned `h-12544n9` with cssText() = `".h-12544n9{background:blue;color:white}"`. Source: `packages/css/lib/css.ts` — JSDoc `@throws`, `isTopLevel && hasDirectDeclaration` throw guard, and the conditional-at-rule declarations throw; `lib/internal/injection.ts` registerText comment ("top-level bare declarations throw in process()"). Tests: `packages/css/tests/css.test.ts:181-189`, `tests/ssr.test.ts:64-66` ("css() throws for top-level declarations on the server too"), `tests/css-at-rules.test.ts:173-179`.
