---
type: decision
title: Word a plan's removal-note prose to avoid the literal phrase its sweep-DoD rg bans
description: When a plan delta requires a prose removal note and its DoD sweep rg bans a phrase, author the note with synonyms that never contain the banned substring, or the DoD cannot tick.
tags: [plans, docs]
timestamp: 2026-10-04
last_confirmed: 2026-10-04
triggers: [sweep-dod, removal-note, plan-delta, docs-rewrite]
---
# Why

A sweep-DoD (`rg <pattern> … exits 1`) and a delta demanding "explicitly note the old form is gone" can collide: the note itself matches the pattern, so the gate fails on required text. Two rewrite rounds were burned rewording after the fact. Substring collisions hide in compounds too — "clas**s base**" is inside "clas**s-string base**", so dropping one word is not always enough; check the note against the pattern before running the gate.

# Evidence

plans/css/code/style-string-label/01-string-first-label.md Docs DoD: `rg -n 'string base|prefixes verbatim|prefix verbatim' packages/css/docs packages/css/README.md` must exit 1, while the style.mdx delta requires "explicitly noting the old string-base form is gone". First note ("class-string base form") matched via the `string base` substring; reword to "class-string argument" — sweep exit 1, note retained (packages/css/docs/api/style.mdx, Composition section).
