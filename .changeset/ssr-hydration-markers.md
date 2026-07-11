---
"@hellajs/ssr": major
"@hellajs/dom": major
---

ssr + hydration switched to explicit `<!--[-->…<!--]-->` comment markers (Vue-style). **Breaking.**

`ssr()` now wraps every dynamic region (reactive child, ForEach/Transition/Portal/Lazy, nested fragment) in `<!--[-->…<!--]-->` markers; `hydrate()` reads those `Comment` nodes to locate each region and adopts it in place. This replaces the marker-free cursor-walk design.

**Why:** the marker-free walker carried a recurring complexity tax — coalesced-text rebuild, an adoption limit for reactive getters resolving to isDynamic components, and undiagnosable ForEach count divergence. Markers eliminate all three and shrink the hydrate walker.

**Migration:** server HTML must now include the markers — generate it with `ssr()` rather than hand-building it. If you parse or snapshot `ssr()` output, expect `<!--[-->…<!--]-->` around dynamic regions. `@hellajs/dom`'s `hydrate()` server-HTML contract changes accordingly (marker-bearing HTML required).
