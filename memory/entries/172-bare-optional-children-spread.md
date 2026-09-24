---
type: correction
title: "Bare optional children crash: babel compiles `{props.children}` to `[...props.children]`, so an undefined child throws — arrow-wrap every optional child slot"
description: "Registry canonicals with optional children must render `{() => props.children}` — the transform's bare-member spread crashes on undefined, unlike the silently-dropping compound-child failure."
tags: [ui, registry, babel]
timestamp: 2026-09-19
last_confirmed: 2026-09-19
triggers: [optional-children, jsx-child-slot, props-children-spread, registry-canonical, children-spread-crash]
---
# Why

The ui AGENTS.md gotcha frames bare `{props.children}` as the safe auto-wrapped form and compound children as the hazardous one needing arrow-wrapping. The bare form's wrap is a SPREAD (`[...props.children]`), which crashes with "Spread syntax requires ...iterable not be null or undefined" whenever a caller omits `children` — a parity render of a part with no children trips it immediately. Any optional-child prop slot (`children?: HellaChildren`) needs the function-slot form `{() => props.children}` exactly like the html flavor's `${() => props.children}`; the html flavor was never exposed because it already uses function slots.

# Evidence

Session 2026-09-19, resizable registry entry: `assertStructuralParity(resizablePartVariants, { defaultSize: 50 })` crashed in `packages/ui/dist/registry/resizable/css/resizable.js` (`children: [...props.children]`, TypeError above). Changing both canonicals' bare `{props.children}` to `{() => props.children}` (two slots: ResizablePanel + ResizablePanelGroup) fixed the suite; `bun coverage ui` exit 0.
