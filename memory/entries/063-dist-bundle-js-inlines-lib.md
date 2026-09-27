---
type: decision
title: dist/bundle.js inlines lib — @hellajs/{pkg}/{file} subpath imports are separate module instances from /bundle imports
description: dist/bundle.js inlines lib — values from @hellajs/{pkg}/bundle plus internals from a {pkg}/{file} subpath read two module instances; keep test imports of the package under test on /bundle.
tags: [arch, testing, toolchain]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [subpath-import, module-instance, bundle-import, test-import-source]
---
# Why

`dist/bundle.js` is a rollup that inlines every `lib/` module; `dist/{file}.js` (the `./*` exports-map subpath target) is a separate compiled copy with its own module-level state. A test mixing the two silently observes the wrong instance — assertions on the subpath's state pass or fail against an empty/unrelated copy. A plan once prescribed importing the internal cache state from a `@hellajs/resource/{file}` subpath while resources under test came from `@hellajs/resource/bundle` — the scope-reap assertion would have inspected bundle-external cache state and **false-passed with or without the fix**. `dist/index.js` re-exports from `./resource.js`/`./resourceCache.js`/`./resetResource.js`, so bare-package and subpath imports DO share an instance — but neither shares with `/bundle`.

# Evidence

Re-verified 2026-09-26 against `packages/resource/dist/`: `bundle.js` carries inlined compiled copies (header comments `// packages/resource/lib/internal/core.ts` etc.; `rg -c 'cacheMap'` → 23 hits in `dist/bundle.js`, 22 in `dist/resourceCache.js`, 3 in `dist/resource.js` — distinct copies) and exports only `resetResource, resource, resourceCache`; `dist/index.js` re-exports from `./resource.js`/`./resourceCache.js`/`./resetResource.js`. Internal `cacheMap` lives in `lib/resourceCache.ts`/`lib/resource.ts` (no `cache.ts`; not exported from the dist copies). Consequence for tests: scope/entry counts via `resourceCache.map.size` (a `/bundle` value) remain the observable seam; internal `cacheMap` scope membership is not publicly observable and WeakRef release is the behavioral proxy (see 064).
