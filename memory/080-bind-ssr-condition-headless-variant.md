---
title: Bind the ssr-condition headless variant in ui hydrate tests whose server arm compiles a factory-backed paste
description: "A registry paste that renders through @hellajs/headless factory members must bind `../../headless/dist/ssr/index.js` (not the bare specifier's dom build) as `@hellajs/headless` in the hydrate harness's server-arm module map, or `ssr()` rejects the members' TemplateBuildFn returns."
tags: [ui, headless, hydrate, ssr-condition, runCompiledModule, registry, factories, ast-target, tests]
confirmed: 2026-01-27
---
# Why

The ui hydrate harness compiles the docs live-set source at the `ast` target and stringifies it with `ssr()`. An ast-compiled paste delegates to its headless factory members by emitting `component(Trigger, {...})` lazy wrappers; the ssr walker calls them during stringify. The bare `@hellajs/headless` specifier resolves under the `import` condition to the dom build (`dist/index.js`), whose compiled members return `TemplateBuildFn` — a function — so `ssr()` fails with `[ssr] ssr: node must be a HellaNode (object with a tag), received function`. The docs site never hits this because the astro integration's `configEnvironment` hook adds the `ssr` export condition to server environments, resolving `@hellajs/headless` to `dist/ssr/` (the ast-compiled variant whose members return HellaNode). The vitest harness cannot select conditions per import, so the server arm must import the ssr build by direct dist path and bind it under the `"@hellajs/headless"` key of `runCompiledModule`'s module map (which throws `no module bound` for any unmapped import, so the binding is also what lets a paste's new headless import compile at all). The client arm keeps the dom build through the bare specifier resolved from the built registry module.

# Evidence

2026-01-27 accordion rebuild: adding `import { accordion } from "@hellajs/headless"` to `packages/ui/registry/accordion/accordion.tsx` and regenerating `docs/src/components/ui/accordion.tsx` (`vp run docs-ui`) made all three `packages/ui/tests/accordion-hydrate.test.tsx` cases fail with the `received function` error at the `container.innerHTML = ssr(...)` line. Binding `import * as headlessNs from "../../headless/dist/ssr/index.js"` into the server arm's module map took the suite green (3 passed) with `vp run coverage ui` exit 0 (69 files, 1886 tests).
