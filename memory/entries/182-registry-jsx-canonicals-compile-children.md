---
type: decision
title: "Registry jsx canonicals compile children to `[...props.children]` — rendering without children throws; registry tests and demos must always pass children"
description: The babel jsx transform emits a spread at the child slot, so a child-carrying canonical crashes with TypeError when rendered bare; html-format canonicals bind function slots and are undefined-safe.
tags: [arch, ui, registry, contract]
timestamp: 2026-09-19
last_confirmed: 2026-09-27
triggers: [registry-canonical-children, jsx-children-spread, rendervariant-children, ui-static-components]
---
# Why
`packages/ui` canonicals follow button/card: `children?: HellaChildren` plus `{props.children}` in
the jsx format. Compiled output is `children: [...props.children]` — a spread evaluated at render,
so `Comp({})` throws `TypeError: props.children is not iterable`. The html format's
`${() => props.children}` function slot is safe. Consequence for every registry unit: tests built on
`helpers/variants.ts` must type child-carrying components as `ChildrenVariant` and always render
with `children: variant.child(...)`, and part suites pass `children: []` (card.test.ts idiom).
Fixing the engine (emit `props.children ?? []`) is out of registry scope — it lives in the babel
plugin and would change every compiled component.

# Evidence
- Compiled artifact: `packages/ui/dist/registry/skeleton/css/skeleton.js` ends
  `children: [...props.children]`; button.js identical (delivered set).
- Empirical probe this session (2026-09-19): rendering Skeleton with no children under happydom →
  `TypeError` at the spread; with children → mounts.
- `guides/tests.md` §Test Coverage "Compile-shape rule" (jsx array vs html single) is the same
  duality at the walker level; memory 028 covers ssr walkers, not this render-time crash.
