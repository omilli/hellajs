---
title: Give cva() a variants map in runnable examples; CVAConfig.variants is required
description: cva({ base: style([defaults, overrides]) }) is not a complete call; CVAConfig.variants is required, so a runnable doc block written that way fails vp run doc-snippets with TS2741.
tags: [css, cva, docs, doc-snippets, types, examples]
confirmed: 2026-11-25
---
# Why

`cva({ base: style([defaults, overrides]) })` reads as the complete recipe-override bridge, but it is not a valid call: `CVAConfig.variants` is a required property. A doc block or example authored that shorthand way fails the strict `vp run doc-snippets` tier with TS2741, and the failure surfaces only at the docs gate, after the example has been copied into prose and skill rules. The shorthand is fine in prose naming the `base:` slot; a runnable block needs a minimal `variants` map beside `base`.

# Evidence

`packages/css/lib/types.d.ts` `CVAConfig`: `variants: V;` carries no `?`, while `base?: StyleObject | string` is optional (read 2026-11-25).

`vp run doc-snippets` 2026-11-25 on a `jsx` block holding `cva({ base: style([fieldBase, overrides]) })`:

    .doc-snippets/strict/packages_css_docs_api_style_mdx.tsx(95,19) TS2741: Property 'variants' is missing in type '{ base: string; }' but required in type 'CVAConfig<CVAVariants, CVAMedia>'.

Adding `variants: { state: { invalid: { borderColor: '#dc2626' } } }` to the same call left zero `packages_css_docs` lines in the next report. A probe that exercises only `style()` overload resolution cannot reveal this: the error needs a `cva()` call to appear.
