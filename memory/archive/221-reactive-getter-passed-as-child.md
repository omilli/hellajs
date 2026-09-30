---
type: correction
title: "A reactive getter passed as a child INTO a component renders as text, not nodes: dynamic children need a plain element parent, an isDynamic render fn (ForEach/Transition), or a dynamic wrapper under a plain element - and component props are consumed as statically as their templates read them"
description: html`` fn children of a COMPONENT stringify instead of rendering; use plain-element parents or wrapper getters for dynamic lists, and check vendored prop consumption before wiring reactivity.
tags: [dom, contract, ui, docs]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [component-children-getter, dynamic-child-component, vendor-prop-reactivity, html-template-mount, demo-mount]
---

# Why

Two runtime facts bite demo/page mounts that compose vendored ui components:

1. **Fn children of a component are values, not slots.** babel passes component children through
   UNWRAPPED ("components may treat `props.children` as a value, not a function" -
   `plugins/babel/src/processors/children.mjs`), and `cloneWithValues` hands the raw fn to the component
   (`packages/dom/lib/internal/template.ts` dynamicComponent branch). The component's own
   `${() => props.children}` accessor then resolves through `mountChildren`, whose effect path calls
   `resolveValue` once and hands the result to `resolveNode` - and `resolveNode`'s function branch
   creates a reactive TEXT node (`packages/dom/lib/internal/render.ts`), so a getter (or a getter
   returning a node array) stringifies instead of rendering. Empirically: `<${PaginationContent}>${() =>
   pages.map(link)}</${PaginationContent}>` renders ZERO `<li>`s; the same getter under a plain `<div>`
   renders fine. Only `isDynamic` render fns (set by `ForEach`/`Transition`) take the node-insertion
   branch. Working patterns: static children; a static `.map()` array; `ForEach`; or the whole component
   wrapped in a plain-element getter (`<div>${() => landmark()}</div>`) so the landmark rebuilds on change.
2. **A component prop is only as reactive as its template reads it.** Vendored parts consume props in
   static ternaries at template-build time: `PaginationLink` bakes `isActive` into `aria-current`/class
   (`props.isActive ? linkVariants.outline : linkVariants.ghost`), `Field`'s `disabled`/`invalid`,
   `InputGroup`'s `disabled`, and `InputGroupInput`'s `ariaInvalid` are all static; `FieldError`'s
   `errors` iterates `props.errors` directly, so passing a getter throws instead of updating. Reactive
   passthrough works only where the raw value lands in an attribute slot (`DirectionProvider`'s `dir`
   flips reactively when handed a getter). Declared event props (`onclick` on Button, PaginationLink,
   InputGroupButton) forward through `e:click`; a plain `on*` attribute on a NATIVE element is a
   reactive prop, never an event (guides/docs.md §Website Wrapper Pages event-contract sentence).

Breaks if ignored: site demos and mdx examples teach mounts that render nothing or freeze their state
(the pre-migration pagination/item/field/direction ui pages shipped exactly these bugs: inert flip
buttons, dead row clicks, fn `errors`).

# Evidence

- `plugins/babel/src/processors/children.mjs` `filterEmptyChildren` - `isComponent ? expression :
  maybeReactive(...)`.
- `packages/dom/lib/internal/template.ts` `cloneWithValues` dynamicComponent branch - props resolved
  raw, children unwrapped to the fn itself.
- `packages/dom/lib/internal/render.ts` - `mountChildren` isDynamic branch (line ~275) vs the
  anchor+effect path; `resolveNode` function branch creates `textContent = toText(value())`.
- `packages/core/lib/scope.ts` - `scope()` collects effects; component render bodies never re-run.
- Empirical (HappyDOM, this session): dynamic array/single getter inside `PaginationContent` → 0 anchors
  rendered; same getter under `<div>` → renders; static `.map()` array inside `ItemGroup` → renders;
  `PaginationLink` `isActive` never moves on signal change (static ternary); wrapped-landmark rebuild
  (`<div>${() => landmark()}</div>`) updates `aria-current` on click. All seven ui demo mounts verified
  green after the fix (`bun test` smoke, 36 assertions, 7/7 pass).
