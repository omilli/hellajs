---
title: SSR rejects dom-target builds; two-target harnesses compile component source at the ast target
description: A consumer-component hydration harness cannot bind the built registry module for its server arm — ssr() throws on flagged builds — so compile the component source with babel target "ast" for ssr and bind the built dist artifact only to the client arm.
tags: [ssr, dom, hydrate, registry, two-target, harness, testing]
confirmed: 2026-10-25
---
# Why

The built `dist/registry/**` artifacts are dom-target (flagged-build) currency. Calling one
returns a `mark`-ed build fn, and `ssr()` does not classify builds: `resolveDeep` calls any
non-isDynamic function, the build constructs real DOM under happy-dom, and the resulting
Element fails the HellaNode check — observed as `[ssr] ssr: node must be a HellaNode (object
with a tag), received function`. Under happy-dom the misclassification is silent garbage or a
throw; either way the server arm of a two-target harness cannot share the client arm's built
module. The Astro integration avoids this only because vite compiles island and registry
SOURCE per environment (ast on the server, dom on the client). A test harness reproducing the
docs-island shape must do the same: `transformSync` the component source with
`babel-plugin-hellajs` `{ target: "ast" }` (+ `@babel/preset-typescript` for typed registry
sources — `compileJsx` adds no preset), strip the compiled `export ` prefixes (the harness's
`runCompiledModule` evaluates via `new Function`, which cannot carry ESM export syntax), and
re-emit the export names as a plain object for the module map; the built dist registry module
binds only to the client arm `hydrate` consumes.

# Evidence

Probe 2026-10-25: a fixture binding `dist/registry/accordion/css/accordion` into both arms of
a two-target harness — `App()` returned `isTemplate: true`, `ssr()` threw "node must be a
HellaNode"; the same harness with the source compiled at `{ target: "ast" }` for the server
arm and the dist module on the client arm passed all scenarios
(`packages/ui/tests/accordion-hydrate.test.tsx`, 3/3). Source:
`packages/ssr/lib/ssr.ts` (`assertNode`, the function-child dispatch calling `resolveDeep`),
`packages/ssr/lib/internal/resolve.ts` (`resolveDeep` calls plain functions),
`scripts/bundle/registry.ts` (`transformRegistrySource` — registry dist compiles with
`{ target: "dom" }` + `presetTypeScript`).
