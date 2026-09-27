---
type: decision
title: "Jsx canonicals pass children through as the bare member `{props.children}` or arrow-wrapped — never a local identifier binding"
description: The babel transform spreads bare member children but WRAPS identifier bindings into a nested array (`children: [binding]`), which appendToParent silently skips - a bound passthrough renders nothing.
tags: [arch, ui, registry, contract]
timestamp: 2026-09-19
last_confirmed: 2026-09-27
triggers: [jsx-children-passthrough, canonical-children-binding, nested-array-children, appendtoparent-skip]
---
# Why
The registry jsx transform has three child-slot shapes: bare member `{props.children}` compiles to
`children: [...props.children]` (flat spread - caller must pass an array or string, crashes on a
single vnode); an identifier binding `{itemChildren}` compiles to `children: [itemChildren]` (nested
array); an arrow `{() => props.children}` compiles to a function child. `appendToParent`
(`packages/dom/lib/internal/render.ts`) handles strings, functions (reactive), and vnode objects -
an ARRAY child matches no branch and is silently dropped. So the nested-array shape renders empty
with no error, and the spread shape throws on single-vnode children. The only shape correct for
arbitrary `HellaChildren` (string, vnode, or array) is the arrow-wrapped function slot, which
`resolveNode` resolves recursively (arrays included) - the same slot the html flavor always uses.
Delivered precedent: dropdown-menu/context-menu canonicals (unit 10) use `{() => props.children}` in
every part; popover's composed-root `triggerChildren` binding is the latent broken shape (renders
empty when children are passed) and predates this lesson.

# Evidence
- Compiled: `dist/registry/dropdown-menu/css/dropdown-menu.js` pre-fix root had
  `children: [...props.children, () => ...Portal]` (member spread) vs `children: [itemChildren]`
  post-binding (nested) - read this session.
- `appendToParent` child branches (render.ts ~252-345): isString / isFunction / isObject(tag|raw|Node)
  / isNumber - arrays fall through all branches and render nothing (read this session).
- Empirical: `DropdownMenuContent({ children: "Raw" })` via the binding shape mounted an empty div;
  after switching every passthrough to `{() => props.children}` the full suite (204 menu tests)
  went green and coverage hit 100% lines on all four compiled flavors.
