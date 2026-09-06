---
type: decision
title: A hand-rolled isDynamic test component used as `<${Dyn}>` in an html`` template must be a PROPS-CALLABLE FACTORY — the template invokes Dyn(mergedProps) at build time, so a bare `(parent) => …` fn fails with "parent.appendChild is not a function"
description: A hand-rolled isDynamic component used as <${Dyn}> in html`` must be a props-callable FACTORY — cloneWithValues invokes Dyn(mergedProps) at build time; a bare (parent) => … fn throws.
tags: [testing, dom, html-template, isdynamic]
timestamp: 2026-08-21
last_confirmed: 2026-08-21
triggers: [isdynamic-test-component, html-dynamic-component-factory, appendchild-is-not-a-function, cloneWithValues-props-call]
---

# Why

`<${Comp}>` in an `html\`\`` template compiles to `{ dynamicComponent: N, props, children }`; at instantiation `cloneWithValues` calls `Comp(mergedProps)` (packages/dom/lib/internal/template.ts, dynamicComponent branch) and uses the RESULT as the child fn. The babel path and `appendToParent` later invoke that result with the DOM parent. A test component that conflates the two layers (authoring the parent-fn as the component itself) gets `props` where it expects `parent` and dies inside `cloneWithValues` — the error signature (`TypeError: parent.appendChild is not a function` at cloneWithValues in the stack) is the recognizer. A bare parent-fn only works as a reactive child's value (`${() => toggle()}` resolving to the fn), never via `<${Dyn}>`.

# Evidence

- `packages/dom/lib/internal/template.ts` `cloneWithValues` dynamicComponent branch: `return (componentFn as RenderFn).isDynamic ? (componentFn as ComponentFn)(resolvedProps) : component(...)` — the props call at build time.
- Failing → passing pair, 2026-08-21: `packages/dom/tests/hydrate-mismatch.test.ts` "warns and renders an isDynamic child into an empty region when its markers are missing" — bare-fn Dyn threw through cloneWithValues; the factory shape passes.
- Sibling shape that stays legal: `tests/reactive-dynamic-children.test.ts` hands the bare isDynamic fn to a reactive child (`${() => toggle()}`), which never routes through cloneWithValues's props call.
