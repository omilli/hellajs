---
title: Type JSX-position components as () => JSX.Element, never ComponentFn
description: "A JSX element position (`<mod.App />`) requires the component's return type assignable to the `JSX.Element` intersection - `ComponentFn`'s `ComponentReturn` union return reds TS2786 - so annotate the component `() => JSX.Element` and drop the `ComponentFn` import."
tags: [dom, JSX, TS2786, ComponentFn, ComponentReturn, JSX.Element, fences, skills-check]
confirmed: 2026-11-12
---
# Why

`JSX.Element` is the intersection `HellaNode & RenderFn & TemplateBuildFn` (`packages/dom/lib/index.ts`), and a JSX element position (`<mod.App />`, `<SomeFn />`) accepts only component types whose return type is assignable to that intersection. `ComponentFn` (`packages/dom/lib/types/nodes.d.ts`) returns `ComponentReturn = HellaNode | TemplateBuildFn` - the union, not the intersection - so `<mod.App />` where `App: ComponentFn` reds TS2786 (`'mod.App' cannot be used as a JSX component`) under skills-check's snippet typecheck. Annotating the component `() => JSX.Element` fixes the element position (its return IS the intersection) while staying assignable to `ComponentFn` (fewer params OK; the intersection is a member of the union), so runtime-only consumers keep working. Distinct trap from arrow-vs-element in `TemplateBuildFn` slots: that one is about values assigned to a flagged-build slot; this one is about the component type itself sitting in JSX position.

# Evidence

`vp run lint` red with `.skills-snippets/dom-best-practices_mount-async-roots.tsx(20,11) TS2786: 'mod.App' cannot be used as a JSX component` on a fence using `<mod.App />` with `loadApp(): Promise<{ App: ComponentFn }>`; retyped to `Promise<{ App: () => JSX.Element }>` and dropped the `ComponentFn` import, gate exited 0 (210 blocks, 0 findings, 2026-11-12). Types read at `packages/dom/lib/index.ts` (`JSX.Element` intersection) and `packages/dom/lib/types/nodes.d.ts` (`ComponentFn`, `ComponentReturn`).
