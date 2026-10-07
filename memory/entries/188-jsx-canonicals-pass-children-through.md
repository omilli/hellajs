---
type: decision
title: "Jsx canonicals pass children through bare (`{props.children}`) or arrow-wrapped for dynamic children — the arrow is a reactivity choice, not a crash workaround"
description: "Since the concat emission (entry 272) every child-slot shape renders; the arrow slot remains canonical only when children are dynamic or compound (`() => props.children ?? fallback`)."
tags: [arch, ui, registry, contract]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [jsx-children-passthrough, canonical-children-binding, nested-array-children, function-slot-idiom]
---
# Why
Historical shape table (pre-272): bare member spread crashed on string/single-vnode children and
identifier bindings compiled to nested arrays that `appendToParent` silently dropped. Entry 272's
engine fix changed both halves: the babel pipeline emits `[].concat(children…)` for a bare member
(safe for every `HellaChildren` shape) and `appendToParent`/`hydrateSequence` splice nested array
children in order — so bare `{props.children}`, identifier bindings, and value slots all render.
What survives of this entry is the DYNAMIC rule: a value slot (bare member, binding, or compound
expression) evaluates ONCE at parent-node construction — children that change never re-render.
Canonical idiom: bare `{props.children}` for static passthrough (registry-wide, post-revert);
arrow slot `{() => props.children}` / `${() => props.children}` when children are reactive or a
compound expression (`{() => props.children ?? fallback}`) — a function child resolves
recursively through `resolveNode`. The popover `triggerChildren` binding and similar now render,
but keep the arrow there if the value can change per open/interaction.

# Evidence
- Post-fix compiled shape: `dist/registry/accordion/css/accordion.js` AccordionTrigger
  `children: [].concat(props.children, [{ tag: "svg" … }])` — string trigger renders one text
  child, hydration adopts positionally (scratch ssr→hydrate probe, 1 icon/trigger).
- Nested-array splice: `appendToParent` Array.isArray branch + `hydrateSequence` array recursion
  (render.ts / hydrate.ts this session); command/select grouped items render through
  `children: [members.map(…)]` again (ui suite 2836 pass).
- History: dropdown-menu/context-menu arrow-everywhere precedent (unit 10) was the pre-272
  workaround; 93 registry arrow slots reverted to bare in the same change.
