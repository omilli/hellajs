---
title: oxfmt hugs only sole-object-arg styling calls; multi-arg calls expand one argument per line
description: In fmt-governed files (lib, tests, examples src) a sole object argument hugs its call (`style({`), but any call with multiple arguments plus a breaking object is canonically expanded one argument per line — a hand-written hug there is reverted by `vp check --fix` and fails `vp check`.
tags: [oxfmt, formatting, style, css, sweep, hug]
confirmed: 2026-11-10
---
# Why

The hug convention (`guides/docs.md` §Code Examples, enforced by `vp run lint:structure` for `packages/css/docs`) applies fully only where the formatter cannot reach: mdx fences and skill rules. Real source belongs to oxfmt — sweeping multi-arg styling calls into `style("card", {` shapes there produces diffs that `vp check --fix` silently reverts, and Complete-Code tutorial fences byte-mirror those files, so the parity check drags the expanded form back into tutorials too. A sweep that ignores this iterates forever against the formatter.

# Evidence

`vp run lint` 2026-11-10 after sweeping `examples/ssr-streaming/src/theme.ts` and `packages/css/tests/*.test.ts` to hugged multi-arg forms: `vp check` reported formatting issues in 5 files; `vp check --fix` expanded every multi-arg region back (files byte-identical to HEAD afterward) while sole-arg hugs such as `css({` survived untouched. No oxfmt/vp fmt config file exists in-repo (`fd 'vp\.config|oxfmt\.json|\.oxfmtrc'` → empty), so the canonical output is not locally overridable.
