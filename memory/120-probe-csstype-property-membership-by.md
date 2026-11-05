---
title: Probe csstype property membership by grepping index.d.ts, never require()
description: "csstype is a types-only package (no runtime export), so require() always fails; verify whether a CSS property name is valid by grepping node_modules/csstype/index.d.ts for the Property key instead."
tags: [csstype, css, docs, typecheck, doc-examples]
confirmed: 2026-11-05
---

# Why

Doc examples in `@hellajs/css` (and any package styling docs) claim CSS property names that must be real `csstype` `Properties` keys or valid emitted CSS. Two traps meet here: `csstype` ships no runtime export (`index.js.flow`, types only), so `node -e "require('csstype')"` throws MODULE_NOT_FOUND from any directory (three failed probes before finding the right path); and the `CSSObject`/`StyleObject` index signatures include `(string & {})` selector keys, so a non-property like `translateY` still *typechecks* while emitting CSS the browser drops (`translateY: -10px` is not a declaration; `transform: translateY(-10px)` is). The correct probe is one grep: `rg -n "translateY\\b|^\\s*(translate|scale|rotate)\\b.*:" node_modules/csstype/index.d.ts` — membership in the `Properties` interface is the ground truth for whether a docs example property name is real.

# Evidence

`ls node_modules/csstype/` shows `index.d.ts` + `index.js.flow`, no `index.js` (types-only package; require fails from repo root and from `packages/css/`). `rg 'rotate?:|scale?:|translate?:' node_modules/csstype/index.d.ts` hits `Property.Rotate/Scale/Translate` member lines; `rg -w 'translateY' node_modules/csstype/index.d.ts` has no `Property` member hit (verified 2026-11-05). The emitted-CSS drop follows from `css.ts` `process()` passing unknown keys through as literal declarations, which browsers discard at parse.
