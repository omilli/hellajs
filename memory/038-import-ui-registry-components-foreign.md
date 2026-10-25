---
title: Import ui registry components from foreign-package tests via a relative dist path
description: Both bare-subpath forms fail from outside @hellajs/ui — "@hellajs/ui/dist/..." doubles through the exports map and "@hellajs/ui/registry/..." resolves in no condition set — so a cross-package probe imports the compiled component relatively (../../ui/dist/registry/...).
tags: [ui, imports, exports, subpath, dist, vite, testing]
confirmed: 2026-10-24
---
# Why

`packages/ui/package.json` declares `./*` with only `types` + `import` conditions mapping to
`./dist/*.js`. Two failure modes follow when a test in another package (e.g. `packages/dom/tests`)
imports a compiled registry component by bare specifier:

1. The dist-prefixed form `@hellajs/ui/dist/registry/alert/css/alert.js` maps the captured `*`
   (which includes the `dist/` segment) to `./dist/dist/registry/...js.js` — a doubled path that
   exists nowhere.
2. The dist-less form `@hellajs/ui/registry/alert/css/alert.js` is well-formed for the `import`
   condition, but resolvers that do not apply it (Node CJS `require.resolve`; vite's resolver from
   a foreign package context) find no matching condition and reject the subpath outright.

The sanctioned form is the one ui's own test suites already use: a relative path into the built
dist (`../../ui/dist/registry/<name>/<style>/<name>` from `packages/dom/tests`). The compiled
file's own bare imports (`@hellajs/dom/runtime`, `@hellajs/css`) resolve through the root
`node_modules` workspace links, so only the entry specifier needs the relative treatment.

# Evidence

Source read 2026-10-24: `packages/ui/package.json` exports block (`./*` → `types`/`import` only);
`packages/ui/tests/plainjs.test.ts` and `packages/ui/tests/helpers/variants.tsx` importing
registry artifacts via relative `../dist/registry/...` paths. Failure repro: vitest run of a
scratch `packages/dom/tests/probe.test.tsx` importing `@hellajs/ui/dist/registry/alert/css/alert.js`
then `@hellajs/ui/registry/alert/css/alert.js` — both "Failed to resolve import" from
vite:import-analysis; the relative `../../ui/dist/registry/alert/css/alert.js` form ran green
(1/1) against the same dist.
