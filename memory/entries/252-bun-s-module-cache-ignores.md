---
type: fact
title: "Bun's module cache ignores URL queries — query-busting cannot re-execute an imported module graph; isolate per-collection in a fresh child process"
description: "import('./x.tsx?p=a') and import('./x.tsx?p=b') are the SAME instance under bun; per-collection isolation needs one subprocess per collection, not in-process reset+bust."
tags: [toolchain, bun, module-cache, scripts]
timestamp: 2026-10-03
last_confirmed: 2026-10-03
triggers: [query-busting, module-cache, dynamic-import-isolation, reset-and-reimport, per-page-collection]
---
# Why

Plans that assume `?key=value` query-busted dynamic imports re-execute a module graph under bun are built on a false premise: bun strips the query for the fs lookup and keys the module cache by the resolved path without it, so every "fresh" import returns the first instance. Any module-level registration (`style()`, `vars()`, signal creation) in that graph then runs exactly once per process no matter how often you re-import or `resetCss()` — collections after a reset see only the never-imported modules. The executable alternative that actually isolates: spawn `bun <script> --collect <args>` per collection (fresh module registry per process), sequenced in-process for determinism. Loader customization still works per child (`Bun.plugin` onResolve/onLoad run fine at runtime).

# Evidence

Probe this session (worktree plans-docs-misc-demo-pipeline, unit 07 of plans/docs/misc/demo-pipeline): `await import("./docs/src/demos/button-demo.tsx?p=button")` vs the same path with `?p=dialog` gave `a.ButtonDemo !== b.ButtonDemo === false`; after `resetCss()`, re-importing a previously imported wrapper and calling `cssText()` returned tokens-only text (the wrapper and demo-kit registrations never re-ran), while a fresh child process collecting the same page produced the full 3.1KB+ sheet. Shipped as `scripts/gen-demo-css.ts` (parent enumerates + spawns, child registers the `@registry` alias + babel transform via `Bun.plugin`, imports wrappers, prints `cssText()`); recorded as resolution 5 in the unit plan.
