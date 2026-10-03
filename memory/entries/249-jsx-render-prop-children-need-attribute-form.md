---
type: decision
title: Pass render-prop children as an explicit attribute in JSX (`children={fn}`) — block-function children arrive array-wrapped
description: The babel transform arrays JSX component children (`children: [fn]`); a render-prop component calling `props.children(state)` needs the children-as-attribute form.
tags: [arch, babel, docs, contract]
timestamp: 2026-10-02
last_confirmed: 2026-10-02
triggers: [jsx-function-children, render-prop-component, astro-island-wrapper, sidebar-provider, docs-demo-conversion]
---
# Why

A component whose `props.children` must be CALLED (render prop) breaks under JSX block children:
`<SidebarProvider>{(state) => ...}</SidebarProvider>` compiles to `children: [fn]`, and the provider's
`children: [() => props.children({...})]` vnode calls the ARRAY — `TypeError: props.children is not a
function` the moment the island server-renders (astro renderer SSRs every `client:load` island during
build). The accommodation is the form the package docs already use for prop-children
(`<HoverCard children={<p/>}/>` idiom): pass the function as an explicit attribute,
`<SidebarProvider children={(state) => ...} />` — `buildComponentCall` only arrays actual JSX
children, and component attributes pass through unwrapped (`maybeReactive` is component-exempt).
Recall before converting any docs demo or site page that renders a render-prop component in JSX:
docs-misc demo-pipeline unit 03 hit this on the sidebar island; `site-foundation/09` (docs-nav shell)
and demo-pipeline 04 (~53 more page conversions) inherit it. Scope note: this is the CONSUMER-side
consequence of the shape entry 028 recorded (ssr walkers must iterate arrays) — 028 stays scoped to
the walker fix; this entry owns the authoring rule. SidebarProvider is the only render-prop component
in the registry (every other `children` prop is `HellaChildren`), so plain JSX block children remain
correct everywhere else.

# Evidence

- Build failure: docs worktree `plans-docs-misc-demo-pipeline`, unit 03 — `bun run build` exit 1,
  `TypeError: props.children is not a function` at `SidebarProvider.children` under island SSR
  (`/ui/sidebar` prerender).
- `plugins/babel/src/builders/component.mjs` `buildComponentCall` — always
  `t.arrayExpression(children)` when JSX children exist; `plugins/babel/src/processors/attributes.mjs`
  — `if (!isComponent) value = maybeReactive(t, value)` (component attribute values untouched).
- `packages/ui/dist/registry/sidebar/css/sidebar.js` — provider vnode `children:
  [() => props.children({open, setOpen, mobile, openMobile, setOpenMobile, onToggle})]`.
- Fix verified: `children={(state) => ...}` attribute form → `bun run build` exit 0, 181 pages;
  sidebar island SSR-renders ("Acme Inc" in `docs/dist/ui/sidebar/index.html`).
