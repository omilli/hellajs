---
title: ComponentReturn weak-type rejects TemplateBuildFn returns
description: Passing a component fn that returns a flagged `TemplateBuildFn` to `component()` needs an `as ComponentFn` cast at the call site — `ComponentReturn`'s all-optional `HellaNode` arm triggers TS weak-type rejection, so widening the public signature remains an open decision for the imperative-emission units.
tags: [dom, typescript, weak-type, component, template-build-fn, imperative-migration]
confirmed: 2026-10-22
---
# Why

`ComponentReturn = HellaNode | (() => HellaNode)` and `HellaNode` is an all-optional interface, so TS weak-type detection rejects any object type sharing none of its property names. `Element` (and therefore `TemplateBuildFn = (() => Element) & { isTemplate: true; ... }`, whose `props`/`componentScope` DO overlap) is assignable through the `() => HellaNode` arm, but a fn returning `TemplateBuildFn` fails `(props: P) => ComponentReturn` with TS2345 when the fn is passed inline. Casting the fn to `ComponentFn` at the call site is the established idiom (`component.test.tsx` precedent, reused in `runtime.test.tsx`); `component()` itself casts internally (`as unknown as TemplateBuildFn`) and keeps its public signature untouched so no existing caller's typecheck changes.

# Evidence

`packages/dom/lib/types/nodes.d.ts`: `ComponentReturn` and the all-optional `HellaNode` (read 2026-10-22). `./node_modules/.bin/vp check` flags `component(Root, {})` with `TS2345: Argument of type '() => TemplateBuildFn' is not assignable to parameter of type '(props: {}) => ComponentReturn'`; the `as ComponentFn` cast form is green in `packages/dom/tests/{runtime,error-reset}.test.tsx` (2026-10-22).
