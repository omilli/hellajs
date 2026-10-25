---
title: Import registry explicitly in JSX test files that call it inside closures
description: In `.test.tsx` files, import `registry` from `@hellajs/dom` plainly whenever test code calls it; relying on the JSX transform's injected binding fails, and an aliased import collides with the injected name.
tags: [dom, tests, vite-plugin-hellajs, jsx-transform, registry, injected-imports]
confirmed: 2026-10-22
---
# Why

The `vite-plugin-hellajs` JSX transform injects its own `registry` (and sibling runtime) imports into compiled `.test.tsx` modules. A test that never imports `registry` but calls it inside a closure (e.g. a build-function callback invoked after module init) sees the injected binding as `undefined` at call time. Importing it under an alias (`registry as domRegistry`) trips `Identifier 'registry' has already been declared` because the dedupe only matches the plain name. The plain explicit import dedupes cleanly and is defined everywhere.

# Evidence

In `packages/dom/tests`: a scratch probe importing only `mount, peekState` failed with `Cannot read properties of undefined (reading 'addEffect')` at its own `registry.addEffect` call (injected binding undefined); the same probe with `registry as domRegistry` failed to parse (`already been declared`); the plain `import { ..., registry } from "@hellajs/dom"` in `runtime.test.tsx` is green under `./node_modules/.bin/vp test packages/dom/tests/runtime.test.tsx` (8/8), including `registry.addEffect` calls inside build-fn closures (read 2026-10-22).
