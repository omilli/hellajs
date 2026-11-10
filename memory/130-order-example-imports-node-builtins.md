---
title: Order example imports node-builtins externals hellajs then extensionless relatives
description: "Canonical examples/** import order: `node:` builtins, then external packages (hono, esbuild, vite), then `@hellajs/*` alphabetically, then extensionless relative imports; `import type` on its own line."
tags: [examples, imports, convention, tutorials]
confirmed: 2026-11-10
---
# Why

Examples had three competing styles (core→dom→css in counter/todo, alphabetical-with-`.tsx`-extensions in blog, `.js`-suffixed relatives in ssr-routing/client), and tutorials byte-mirror these files, so drift multiplies into Complete-Code parity churn. One canonical order keeps every example and its tutorial aligned: `node:` builtins first, external packages second, `@hellajs/*` third (alphabetical: core < css < dom < resource < router < ssr < store), extensionless relative imports last (alphabetical within the group), with type-only imports on a separate `import type` line — never inline `type X` inside a value import (guides/code.md §Imports rule, applied to examples in the 2026-11-10 sweep). Extensionless relatives are safe everywhere in examples: Vite apps resolve them natively, and the esbuild-bundled SSR examples resolve them via esbuild's default `resolveExtensions` (`.tsx` first); `allowImportingTsExtensions: true` in every example tsconfig means either style typechecks, extensionless is the chosen one.

# Evidence

2026-11-10 examples sweep: `rg -n '^import' examples/*/src` before showed the three styles; after, all 9 apps follow the order. `node build.mjs` in examples/ssr-islands + examples/ssr-routing exit 0 with extensionless `./app`/`./theme` specifiers; `vite build` green in blog/todo/counter/theme-switcher/ssr-streaming and `astro build` green in astro-islands; `npm run lint` (tsgolint over examples/**) exit 0; `node ./scripts/doc-structure.ts` clean (tutorial Complete-Code parity against the reordered files).
