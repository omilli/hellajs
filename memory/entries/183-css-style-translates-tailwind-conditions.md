---
type: decision
title: "css style() translates tailwind conditions with &-first keys only: `&:is(ancestor *)` for dark/group/peer, `&:is(a):hover` for `[a&]`, and nested `@media` keys inherit the scoped selector"
description: Tailwind conditions translate with &-first keys only: dark:/group-*/peer-* become &:is(...) chains, [a&]:hover becomes &:is(a):hover, md: becomes a nested @media key.
tags: [arch, ui, css, contract]
timestamp: 2026-09-19
last_confirmed: 2026-09-19
triggers: [css-flavor-translation, ancestor-selector, peer-disabled, media-query-nesting, registry-style-module]
---
# Why
Registry css modules must translate shadcn tailwind strings to `style()` objects. Engine rules from
`packages/css/lib/css.ts` `process()`: a nested selector key replaces `&` ANYWHERE but only when the
key STARTS with `&` (otherwise the key composes as a descendant selector with a literal `&` left in —
the AGENTS.md gotcha). Verified forms: `dark:x` → `"&:is(.dark *)"`; ancestor conditions
(`group-data-[disabled=true]:*`, `[[data-slot=tooltip-content]_&]:*`) → `"&:is(.group[data-disabled='true'] *)"` /
`"&:is([data-slot='tooltip-content'] *)"` (chained: `... :is(.dark *)`); sibling conditions
(`peer-disabled:*`) → `"&:is(.peer:disabled ~ *)"`; `[a&]:hover` → `"&:is(a):hover"`;
`md:p-12` → a nested `"@media (min-width: 48rem)"` key (conditional at-rules inherit the scoped
selector, emitting `@media …{.h-cls{…}}`). One-off shorthands: `calc(var(--spacing)*4)` has no
tokens.js `--spacing` — use the literal `1rem`. Hand-named `@keyframes` stay banned; animations go
through `keyframes()` hashes referenced in `animation` strings.

# Evidence
- `packages/css/lib/css.ts` `process()` — `&`-prefix gate, conditional at-rule selector inheritance
  (read this session); `packages/ui/AGENTS.md` §Registry gotchas (`.dark &` hazard).
- Runtime probe (2026-09-19): imported compiled empty/kbd/separator css modules and asserted
  `cssText()` contains `@media (min-width: 48rem){.h-hella-empty-*{padding-block:3rem;…}}`,
  `.h-hella-kbd-*:is([data-slot='tooltip-content'] *)`, its `.dark` chain, and
  `.h-hella-separator-*[data-orientation='vertical']{height:100%;width:1px}` — all matched.
- `bun coverage ui` green with label/badge/alert using the same forms (401 tests).
