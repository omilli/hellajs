---
title: Strip comments before strings when regex-scanning TS source for identifier references
description: Ordered regex strips (templates, then strings, then comments) let an apostrophe inside a block comment open a fake string literal that swallows real code spans and silently drops referenced identifiers — strip line/block comments first, or use a stack-based tokenizer that tracks template interpolation.
tags: [tooling, parsing, typescript, regex, static-analysis]
confirmed: 2026-10-31
---
# Why

A source-analysis pass that computes "which imported names does this module use" by stripping
TS constructs with sequential regex replaces gets the answer wrong on ordinary JSDoc: the
template-literal and string strips run while comments are still present, so an apostrophe in
prose ("the variant's component") opens a fake `'…'` string that consumes source until the
next apostrophe — every identifier inside the eaten span vanishes from the reference set and
the tool emits an incomplete import list. Separately, a character-level scanner that handles
template `${…}` interpolation by flipping state on `${` but not handling the closing `}` in
code state desyncs at the first interpolated template and eats everything up to the next
backtick.

# Evidence

Failing form 2026-10-31: a splitter tool computed import needs for
`packages/ui/tests/helpers/variants-core.tsx` from regex-stripped text ordered
templates → strings → comments → the JSDoc apostrophe in "variant's component" opened a fake
string that swallowed the `setupContainer()` call in `renderVariant` — the emitted module
lacked the import and every suite calling it failed `ReferenceError: setupContainer is not
defined` under `vp run coverage ui` (1166 test failures; coverage 94.7% → 64.1%). Bisect
showed the loss at the single-quote strip. Correct form: a stack tokenizer pushing a mode on
`"`/`'`/`` ` `` and on `${` inside templates, popping on the matching close, with `}` in code
state returning to template mode only when the entry below the stack top is a template — the
same file then scanned correctly and the patched import fixed all suites.
