---
title: Reproduce a staged ui registry compile through addComponent in a scratch app
description: The bundle's dist/registry/.src staging is transient, so debug spliced-output type errors by running the public addComponent API into a scratch dir whose package.json carries the peer deps.
tags: [ui, registry, bundle, splice, debugging, addComponent, checkPeers]
confirmed: 2026-10-29
---
# Why

`vp run bundle ui` stages spliced canonicals under `packages/ui/dist/registry/.src/`, runs tsc over them, and cleans the staging on failure — a TS error message citing `.src/<entry>/<style>/<file>.tsx` line numbers dangles by the time you look. The public `addComponent` splice (`applyStyleVariant` + `inlineTypes`, "one transform, two callers") produces the same standalone file, so it reproduces the exact bytes the staged compile saw.

The working recipe, from a scratch dir:

1. `hellajs.json` with `{"style":"css","lang":"ts","themeMode":"light","aliases":{}}` — `lang` accepts only `js`/`ts`, never `jsx`.
2. `package.json` with `"dependencies"` carrying every peer the copied file imports (`@hellajs/core`, `@hellajs/dom`, `@hellajs/css`, `@hellajs/headless` at minimum) — `checkPeers` throws on missing peers before any file is written.
3. `import('<repo>/packages/ui/dist/index.js').then((ui) => ui.addComponent(['<entry>'], { dir: '.', style: 'css', lang: 'ts', overwrite: true }))` — without `overwrite` a rerun silently skips existing files.

The output lands at `<scratch>/src/components/<entry>.tsx`, line-for-line comparable with the staged error positions.

# Evidence

2026-10-29: radio-group rebuild produced `TS2322` at `.src/radio-group/css/radio-group.tsx(163,85)` with the staging already cleaned; the `addComponent` reproduction showed line 163 was the `radioGroup({ ..., name })` forward, exposing the `unknown`-typed destructured `name` behind the error.
