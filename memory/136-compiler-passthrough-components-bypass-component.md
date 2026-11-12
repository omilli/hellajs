---
title: Compiler passthrough components (ForEach, Portal, Lazy) bypass the component() wrapper
description: "buildComponentCall wraps a JSX component position in component() for scope chaining unless the tag identifier is in PASSTHROUGH_NAMES = { ForEach, Portal, Lazy } - those emit a direct call and scope themselves internally, so prose claiming the compiler wraps EVERY component call overclaims."
tags: [compiler, dom, component, PASSTHROUGH_NAMES, scope, docs-claims]
confirmed: 2026-11-12
---
# Why

`buildComponentCall` (`plugins/compiler/src/builders/component.mjs`) wraps a component position in `component(tagCallee, props)` "for automatic scope management" only when the tag identifier is not in `PASSTHROUGH_NAMES` (`plugins/compiler/src/constants.mjs`: `new Set(["ForEach", "Portal", "Lazy"])`); passthrough tags emit `Tag(props)` directly. The three passthrough names are control-flow components that establish their own disposal scopes, so the user-visible behavior ("every component is scope-managed") holds, but the mechanism-level claim ("the compiler wraps every component call in `component()`") is false. Prose in dom docs and agent files must phrase it as "wraps component calls" (no "every"), or scope the claim to user-defined components.

# Evidence

Source read 2026-11-12: `plugins/compiler/src/builders/component.mjs:33-40` (passthrough check + `callExpression(identifier("component"), ...)` fallback) and `plugins/compiler/src/constants.mjs:5` (`PASSTHROUGH_NAMES`). The overclaim was caught in `packages/dom/docs/api/runtime.mdx` ("wraps every component call") and fixed to "wraps component calls"; `vp run lint` exited 0 after the fix (doc-links, doc-structure, em-dash all green, 312 mdx files).
