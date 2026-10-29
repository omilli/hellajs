---
title: Route headless behaviors, foundations, and full-parity part factories to @hellajs/headless layered over dom
description: The 14 behavior functions left @hellajs/dom in a clean break; @hellajs/headless (deps core + dom) hosts them, the modal() foundation, and Base UI-style part factories with full Radix parity that the ui registry pastes consume as styled wrappers; sidebar is the layout exception (modal rebuild, no factory).
tags: [headless, behaviors, foundations, parts, factories, ui, layering, package-architecture]
confirmed: 2026-01-28
---

# Why

The 14 behavior functions (`trapFocus`, `onEscape`, `onOutside`, `rovingTabIndex`, `anchorPosition`, `computeAnchorPosition`, `hoverIntent`, `menuTypeahead`, `onDrag`, `onSwipe`, `onPinch`, `onLongPress`, `onDoubleTap`, `layerDismissal`) made up 42% of dom's api reference surface while importing nothing from its renderer — and the ui registry's copy/paste templates froze real orchestration logic into every paste (combobox 932 lines, dropdown-menu 941, command 692). Only a behavioral runtime tier removes that mass; wiring foundations alone cannot.

Resolved decisions (user-confirmed):
- **Clean break**: dom dropped the behavior exports entirely; no re-export shim. Throw prefixes re-prefixed `[dom]` → `[headless]`.
- **Layering**: `core → dom → headless → ui`. headless depends on `@hellajs/core` + `@hellajs/dom` (foundations use dom's `registry.addEffect(node, fn)` for node-scoped disposal; parts render via the dom-target babel transform). Audience is HellaJS users only.
- **Components tier — full Radix parity**: headless ships every part per component (behavioral AND presentational) via camelCase factories returning part sets; registry pastes become styled wrappers. Identity: headless renders structure, never styles; the raw behaviors + foundations stay exported as the lower tier and escape hatch.
- **State sharing**: factory closures (no context primitive, no per-part signal props). **State contract**: controlled-or-internal — options take signal getters when passed, create internal signals when omitted (the registry's value/onValueChange contract). **Naming**: `const Popover = popover(…)` → `<Popover.Trigger>` (camelCase factory, TitleCase binding; `plugins/babel/src/builders/imperative.mjs` `isComponentNode` treats JSXMemberExpression as a component regardless of case).
- **Sidebar exception**: layout isn't behavior and has no Radix precedent — sidebar.tsx rebuilds on the landed `modal()` foundation with NO factory; its ~25 layout parts stay paste-side.
- **Phasing**: one plan set per cluster, authored against landed code, hardest-consumer-designed: 1) dialog family via `modal()` — landed; 2) popover family parts (`popover`, `menu`, `menubar`, `tooltip`, `hoverCard`) — landed; 3) select family (`combobox()`, `select()`, `command()` over an internal listbox engine; sidebar modal rebuild) — planned at `plans/headless/code/select-family/`; 4) stragglers + registry-wide finalization (tabs, toggle-group, radio-group, slider, sonner — keep-raw-or-foundation per component).

# Evidence

- Behavior decoupling verified pre-move: `rg '^import'` over the 14 files showed only `internal/focusables` (self-contained), type-only imports, sibling behaviors, and `@hellajs/core` utils — zero renderer imports.
- Disposal mechanism: `packages/dom/lib/component.ts` `component()` wraps renders in `scope()`; `packages/core/lib/effect.ts` captures returned cleanups; `packages/dom/lib/registry.ts` `registry.addEffect` drains on node cleanup.
- Paste-shrink proof (merge 6ca7b3b6): dropdown-menu 941 → 434 lines, popover 220 → 173, tooltip 220 → 117; residual `disposeWirings` templates after cluster 2 = exactly combobox, select, command, sidebar.
- Factory conventions as landed: `packages/headless/lib/popover.tsx` (exit machine, module-counter ids, anchoredLayer engine, controlled-or-internal open).
- SSR: JSX-bearing `@hellajs/*` packages ship an `ssr` export condition + the astro integration's `configEnvironment` hook adds it to server environments (see memory/055) — new `.tsx` sources ride both.
- KB hazard observed: a memory entry written uncommitted in the main tree during a worker/merge cycle can be lost (the original entry recording these decisions vanished across merges 5290c08d/6ca7b3b6); re-verify authored entries after every `bun merge`.
