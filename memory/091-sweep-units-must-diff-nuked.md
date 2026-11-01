---
title: Sweep units must diff the nuked part's compose regions against the root before deleting
description: "Before executing a registry part removal premised on 'the root already renders it', diff every class/compose region the part applies against the composed root's JSX — a missing style application is invisible to attribute-based tests and every guard, and deleting the part orphans the style or ships an unstyled root."
tags: [ui, registry, parts, sweep, compose, style-modules, premise-verification]
confirmed: 2026-10-31
---
# Why

A registry part can carry styling the composed root never applied, while every
test and guard stays green: unit tests assert attributes (data-state,
aria-expanded), not class composition, and no guard cross-checks a canonical's
compose regions against its style modules. Executing the removal on the plan's
word alone then ships a root missing the nuked part's visual behavior and
leaves a dead style export in both style modules — the docs prose the plan kept
contradicts the shipped implementation. The gap is pre-existing (the root never
had the class), so a green baseline proves nothing about it.

# Evidence

`packages/ui/registry/collapsible/collapsible.tsx` (2026-10-31): the standalone
`CollapsibleContent` applied `class={[content, cls]}` (the grid-collapse style,
`collapsible-css.ts` export `content`) while the composed root's `<Content>`
carried no class — true since the component's introduction (commit a137862c,
git log on the file). The sweep plan premised "the root already renders both …
nothing to add"; execution surfaced the gap only by reading the part's JSX
against the root's. Resolution required an operator decision; the fix applied
the style to the root's `<Content>` compose (accordion-root parity —
`packages/ui/registry/accordion/accordion.tsx` applies `[content]` +
`[contentInner]` to its regions). Verification ritual for any part removal:
`rg -n 'class=\{' <registry>/<name>/<name>.tsx` over BOTH the part and the root
before deleting, and confirm every style-module export the part consumed has a
remaining value-position consumer.
