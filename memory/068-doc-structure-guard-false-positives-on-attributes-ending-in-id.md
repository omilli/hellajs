---
title: Doc-structure guard false-positives on attributes ending in id
description: "scripts/doc-structure.ts WRAPPED_ATTR_RE matches the `id={` substring inside longer attribute names (`invalid={() =>`, `data-id={() =>`); write derived flags as bare accessor bindings (`invalid={emailInvalid}`) instead of function-wrapped ones to avoid it."
tags: [docs, doc-structure, guard, false-positive, regex, jsx]
confirmed: 2026-02-07
---
# Why

`WRAPPED_ATTR_RE` in scripts/doc-structure.ts is `/(class|style|title|href|id)=\{\(\) =>/` with no word boundary, so any attribute whose name ends in `id` (`invalid`, `describedby`-adjacent props, `data-id`) trips the "function-wrapped attribute" finding when written as `name={() => ...}` in a jsx/tsx fence. The bare-binding form is the preferred style anyway (guides/code.md §Templates: zero-arg fn/signal bindings bare), so deriving the flag once (`const emailInvalid = () => form.errors().email != null`) and passing `invalid={emailInvalid}` satisfies the guard without a regex change.

# Evidence

2026-02-07: the new packages/headless/docs/api/form.mdx tripped "line 29: function-wrapped attribute" on `<FormControl invalid={() => ...}>`; the match is the `id={` inside `invalid={`. Rewriting the example to bare accessor bindings cleared `node ./scripts/doc-structure.ts`. Checked 2026-02-07 against the WRAPPED_ATTR_RE constant (line 93).
