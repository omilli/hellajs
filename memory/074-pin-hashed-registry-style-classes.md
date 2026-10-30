---
title: Pin hashed registry style classes from rendered class tokens, not compiled module exports
description: Assert registry class pins off rendered class attributes (css: scope-prefix `startsWith` on classTokens tokens; tailwind: a signature utility `toContain`) — compiled dist canonicals inline style values as non-exported module-locals, so module reads yield undefined.
tags: [ui, tests, registry, classTokens, style-modules, pinning, hashed-classes, dist]
confirmed: 2026-10-30
---
# Why

A test that pins a registry component's style class by importing the compiled canonical (`import * as Mod from "../dist/registry/<pkg>/<style>/<pkg>"` and reading `Mod.base`) fails with `TypeError: Cannot read properties of undefined (reading 'split')`: the compile step splices the style module's body into the canonical as plain module-locals (`const base = style("popover-trigger", { … })` in the emitted JS) and exports only the component functions — the style bindings are never re-exported. Each such attempt burns a full red coverage cycle before the pin is rewritten against the rendered DOM.

The working pin shape (established convention): resolve the element, then for the css flavor assert a hashed scope-prefix token — `classTokens(el).some((token) => token.startsWith("<scope-name>"))` — and for the tailwind flavor assert one signature utility of the class string — `classTokens(el)).toContain("<utility>")` — branching on `variant.style` inside one `test.each` over both flavors.

# Evidence

Confirmed 2026-10-30. Failing form: reading `.base` off `../dist/registry/popover/css/popover` threw in `vp run coverage ui` (packages/ui/tests/popover.test.ts). Source: `packages/ui/dist/registry/popover/css/popover.js` declares `const base = style("popover-trigger", …)` with no `export`; exports are component functions only. Working convention: `packages/ui/tests/bubble.test.ts` `"$part $style carries the variant class for every style"` — `classTokens(root).some((token) => token.startsWith("bubble-secondary"))` (css) / `toContain("*:data-[slot=bubble-content]:bg-secondary")` (tailwind). Rewritten pin passed: `vp run coverage ui` exit 0, 69 files / 1868 tests.
