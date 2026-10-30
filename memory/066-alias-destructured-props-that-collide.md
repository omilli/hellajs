---
title: Alias destructured props that collide with registry style-module names
description: "In a ui registry canonical, a bare identifier line matching a style-module export name (e.g. a destructured `month,`) is literal-substituted by the tailwind splice; rename the binding (`month: monthProp`)."
tags: [ui, registry, tailwind, splice, applyStyleVariant, transform, bundle]
confirmed: 2026-10-30
---
# Why

`applyStyleVariant` (packages/ui/lib/internal/transform.ts) moves every style-module string declaration whose name never "binds locally" into a literals map, then `substituteLiterals` rewrites matching identifiers across the canonical's non-marker lines. A destructured function parameter on its own line (`  month,`) reads as a ref position (line-start, `,` follower), so the style module's `month` class string replaces the parameter name in BOTH the destructuring and every call site: the spliced tailwind file fails babel with `Unexpected token` pointing at the class string inside the parameter list. The css flavor keeps all declarations and never substitutes, so the collision only bites `vp run bundle ui`'s tailwind variant.

# Evidence

2026-10-30: the rebuilt calendar registry took `month` as a bare destructured prop; `vp run bundle ui` failed with `"flex w-full flex-col gap-4",` inside the `Calendar({...})` parameter list. Renaming to the alias form `month: monthProp` (matching the pre-rebuild template) fixed the bundle; the transform's `matchKind` classifies `name:` at line start as noise, so aliased keys survive. Checked 2026-10-30 against packages/ui/lib/internal/transform.ts (`substituteLiterals`, `inlineStringDecls`, `matchKind`).
