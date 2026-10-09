---
type: fact
title: Registry built output exports only component functions — style constants stay module-private
description: The bundle splices each style module into the canonical file as private consts, so docs chrome cannot import registry classes from @registry/* — re-declare the needed subset or SSR the components.
tags: [ui, registry, bundle, docs]
timestamp: 2026-10-03
last_confirmed: 2026-10-08
triggers: [registry-styles, docs-chrome, style-module, static-nav, bundle-pipeline]
---
# Why

Composing static (non-island) docs chrome on the registry look cannot import the
registry's style vocabulary: `scripts/bundle/registry.ts` splices the style-module
text into each canonical file and the style constants stay `const` (private) —
every dist css-flavor file exports only its component functions
(`SidebarMenu`, `Button`, …). The docs demos import components; nothing imports
classes. Site-foundation 09 hit this at build (`MISSING_EXPORT "menu" is not
exported by …/sidebar/css/sidebar.js`) and resolved by user decision: the docs
chrome re-declares the needed subset under site-owned class names, values cited
from `packages/ui/registry/sidebar/sidebar-css.ts`, speaking the site-overridden
`--sidebar-*` tokens. Drift on those copies is manual. The alternatives cost
more: build-time `ssr()` of the real components ships dead mobile-Sheet markup
and couples the docs to component internals; exporting the constants is a
package-surface/pipeline change needing its own plan unit. Recall before any
"reuse the registry styles server-side" attempt (unit 10's navbar/search chrome
inherits this).

# Evidence

One non-component export exists since the tokens-js set (unit 02, verified
2026-10-08): `packages/ui/dist/registry/theme/tokens.js` exports `const tokens`
(the camel-keyed `vars()` reference object) for typed access in css-flavor
style modules and user code. Component-file style constants stay private.

2026-10-03, worktree plans-docs-misc-site-foundation unit 09:
`rg -n "^export" packages/ui/dist/registry/sidebar/css/sidebar.js` → only
`SidebarProvider`…`SidebarMenuSubButton` functions; `groupLabel`/`menuButton` at
lines 525/612 are private `const`s. Same shape for `button/css/button.js` (only
`export default function Button`). Mechanism: `scripts/bundle/registry.ts`
`applyStyleVariant` splices style-module text into the canonical. Build failure
log `/tmp/docs-build-09.log` (`MISSING_EXPORT "menu"`); resolution verified by
`cd docs && bun run build` exit 0 after the re-declaration.
