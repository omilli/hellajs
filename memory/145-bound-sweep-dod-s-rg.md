---
title: Bound a sweep DoD's rg pattern and verify its baseline match set before contracting it
description: A multiline rg sweep bridged by a lazy [\s\S]*? runs past the call it describes to the next "}, {" anywhere later in the file, so its promised "returns no matches" can be unreachable; run the exact pattern on the baseline and read every match start before writing it into a DoD.
tags: [plans, sweeps, rg, dod, false-positives, mdx, verification]
confirmed: 2026-11-25
---
# Why

A sweep DoD is only as good as its predicate. Two failure shapes, opposite directions:

- Lazy bridge: a pattern such as `style\(\s*\n?\s*<ident>\s*,[\s\S]*?\}\s*,\s*\n?\s*\{` does not stop at the call it describes. From a legitimate two-argument call `style(buttonStyle, {` it runs forward across prose and code blocks to the next `}` followed by `,{`, so it reports a leftover where none exists. The DoD's "returns no matches" is then unreachable without distorting correct docs, and the baseline count it cites already includes the false positive.
- Nesting-blind: the opposite tightening, `[^{}]*`, misses the forms it must catch when the first object carries a nested selector block.

# Evidence

2026-11-25, baseline tree, `rg -n -U "style\(\s*\n?\s*[A-Za-z_$][A-Za-z0-9_$]*\s*,[\s\S]*?\}\s*,\s*\n?\s*\{" -g '*.mdx' packages/css docs/src examples` matched `packages/css/docs/api/removestyle.mdx` at `const className = style(buttonStyle, {` and terminated 65 lines later at the `}, {` of a `removeStyle({ color: 'red' }, { label: 'x' })` block; the match was identical after every real three-argument example was removed.

The nesting-aware form `\{(?:[^{}]|\{[^{}]*\})*\}\s*,\s*\n?\s*\{` returned exactly the two true three-argument forms at baseline (both in `packages/css/docs/concepts/styling.mdx`) and zero afterwards.

A paren-balanced scan (walk from each `style(`/`removeStyle(` `(` with quote-aware `(){}[]` depth, count commas at depth 1, flag identifier-first calls with two or more) over 134 mdx files and 137 calls found only the two documented label-overload signature lines as identifier-first three-argument calls, and zero identifier-first two-argument calls whose second argument was not an options bag.
