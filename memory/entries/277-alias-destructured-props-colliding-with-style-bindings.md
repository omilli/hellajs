---
type: decision
title: "Alias destructured behavior props that collide with style-module binding names"
description: "applyStyleVariant's tailwind inliner substitutes style-binding names inside destructuring patterns, and destructured props shadow same-named style maps in tsc — alias the local either way."
tags: [ui, registry]
timestamp: 2026-10-08
last_confirmed: 2026-10-08
triggers: [rest-attrs, destructure, style-splice, tailwind-variant]
---
# Why

The rest-attrs recipe destructures every behavior prop in the signature (`{ …behavior, class: cls, ...attrs }`). transform.ts's `matchKind` classifies identifiers inside `{...}` contexts as refs (destructuring patterns are textually indistinguishable from object literals), so `substituteLiterals` replaces a destructured name that equals a style-module binding (`trigger`, `content`, `item`, `header`, …) with the inlined utility string — inside the parameter pattern — producing a syntax error at babel parse time. Aliasing the local (`trigger: triggerSlot`) keeps the user-facing prop name intact while dodging the substitution; renaming the local with a suffix also clears the `(?<![\w$."'-])name(?![\w$-])` ref regex.

# Evidence

`bun bundle ui` failed: `collapsible.tsx: Unexpected token (87:139)` with the signature rewritten to `{ open, defaultOpen, onOpenChange, "inline-flex items-center gap-2 …", "grid grid-rows-[0fr] …", class: cls, ...attrs }` (packages/ui/lib/internal/transform.ts, matchKind/substituteLiterals). Alias fix in registry/collapsible/collapsible.tsx + collapsible-html.ts → bundle exit 0, `bun coverage ui` exit 0.

Second mechanism (unit 04, both flavors, css and tailwind): a destructured prop shadowing a keyed-map binding is a plain tsc failure even where the inliner never rewrites it — button-group/field's `orientation[orientation ?? "…"]` map lookup resolved to the prop (`TS18048 'orientation' is possibly 'undefined'` + `TS7015`), since the destructured local shadows the spliced `declare const orientation: Record<string, string>` function-wide. Same alias fix (`orientation: orient`) in all four files → bundle exit 0. Keyed maps (`orientation`, `variants`, `sizes`) collide exactly like string-utility bindings; expect the collision whenever a prop shares its style module's map name.

Re-verified across unit 07's five composites (2026-10-08): five more collisions (`day`, `month`, `label`, `empty`, `chips` × List+Content), all caught only at `bun bundle ui` after the edit was written. Pre-flight that works: before choosing destructure names, list the component's style bindings once — `rg "declare const|export const" <name>-css.ts <name>-tailwind.ts` — and alias any prop sharing a name (`day: dayProp`, `chips: chipsSlot`).
