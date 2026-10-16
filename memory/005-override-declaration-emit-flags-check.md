---
title: Override declaration-emit flags in check-only tsconfigs extending tsconfig.base.json under TypeScript 7
description: "TypeScript 7 fires TS6424 (declaration-emit serialization) even under `noEmit` when `declaration`/`emitDeclarationOnly` are inherited — a check-only tsconfig extending tsconfig.base.json must set both to `false`."
tags: [typescript, tsconfig, ts6424, doc-snippets, false-positive, vite-plus]
confirmed: 2026-10-16
---
# Why

`tsconfig.base.json` sets `declaration: true` + `emitDeclarationOnly: true` (the repo ships d.ts everywhere). TypeScript 6 let a corpus tsconfig suppress that entirely with `noEmit: true`; the TS7 native engine still runs declaration-emit **serialization analysis** for JS inputs under `noEmit`, so any `.js` module with multiple `module.exports` assignments errors TS6424 ("Multiple 'module.exports' assignments cannot be serialized for declaration emit") even though nothing is ever emitted. Restructuring the flagged content (e.g. splitting legit multi-config doc examples) is wrong — the fix is flag-level: the check-only config overrides `declaration: false, emitDeclarationOnly: false`. `scripts/doc-snippets.ts` `writeTierConfig` does exactly this (its generated tier config extends the base); future check-only tsconfigs (generated or hand-written) extending the base need the same pair.

# Evidence

Isolated repro in the vite-plus worktree: scratch `.js` with two `module.exports` + tsconfig extending `tsconfig.base.json` with `noEmit: true` → `bunx tsc -p … --noEmit` reported TS6424 on both lines; adding `"declaration": false, "emitDeclarationOnly": false` to compilerOptions → exit 0, no new diagnostics. Fixing it live: `bun doc-snippets` went 4 strict TS6424 (all in `docs/src/pages/plugins/babel.mdx`) → exit 0 with `0 strict, 93 tutorial` after the `writeTierConfig` override; tutorial finding set byte-identical pre/post.
