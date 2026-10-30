---
title: Exclude sibling scope segments when pinning class tokens that share a prefix
description: "When a style family's binding label is a prefix of sibling labels (content vs content-right), a bare startsWith pin matches the sibling too — exclude the sibling segment names in the token filter."
tags: [ui, tests, registry, classTokens, style-modules, pinning, hashed-classes]
confirmed: 2026-10-30
---
# Why

The established css-flavor pin (`classTokens(el).some((token) => token.startsWith("<scope-name>"))`) is ambiguous whenever one `style()` label prefixes another: `style("sheet-content", …)` emits `sheet-content-<hash>` while `style("sheet-content-right", …)` emits `sheet-content-right-<hash>`, so `startsWith("sheet-content")` matches both and the pin passes even if the base binding was dropped. The fix keeps the convention's shape and narrows the filter: require the scope prefix AND reject tokens whose next segment is a sibling scope name (regex lookahead or chained `!startsWith` per sibling label). Applies to every component whose content style ships a direction/side table (sheet `contentSides`, drawer `contentDirections`); tailwind-flavor pins are immune (utility tokens are verbatim, no label hashing).

# Evidence

Confirmed 2026-10-30. Token format `{label}-{hash}` from `packages/css/lib/style.ts` JSDoc ("The class name (`{label}-{hash}` …)"); sibling labels read from `packages/ui/registry/sheet/sheet-css.ts` (`sheet-content`, `sheet-content-right|left|top|bottom`) and `packages/ui/registry/drawer/drawer-css.ts` (`drawer-content`, `drawer-content-direction` labels). Working pin shipped in `packages/ui/tests/sheet.test.tsx` and `packages/ui/tests/drawer.test.tsx` ("carries the padded content binding on the portaled panel"): `token.startsWith("sheet-content") && !/^sheet-content-(right|left|top|bottom)/.test(token)`; green under `vp run coverage ui` exit 0, 69 files / 1876 tests.
