---
title: "hellajs-compiler returns null for JSX-free TS: TS-strip consumers need an esbuild fallback"
description: "hellajs-compiler's transform returns null (not stripped code) for any JSX-free input including .ts/.tsx, so build glue that must strip types from plain-TS sources needs its own esbuild/oxc fallback on the null branch."
tags: [hellajs-compiler, compiler, null-contract, esbuild, ts-strip, registry, build]
confirmed: 2026-10-30
---
# Why

The babel engine stripped types from every source it saw (`@babel/preset-typescript` ran unconditionally), so pre-migration glue could feed plain-TS files through the same transform as JSX files. The engine replaces that with a JSX sniff: no JSX in the input means null, and the internally-stripped code is discarded — a consumer that swaps babel for `transform` and throws on null breaks on its first JSX-free TS module. The consumer-side fix mirrors the vite wrapper's own null contract: JSX-free files fall through to esbuild's native TS handling. `scripts/bundle/registry.ts` does exactly this — `transform` first, and on null `esbuild.transformSync(code, { loader: "tsx" })` — which keeps registry dist output byte-equivalent in role to what a user's Vite build produces from the same text (wrapper-null files are transformed by Vite's esbuild pass).

# Evidence

`plugins/compiler/src/pipeline.mjs` (validate → `code.includes("<")` sniff → null on zero replacements) and `plugins/compiler/index.d.ts` ("or null when the input carries no JSX"). Failure observed as `[bundle] registry transform produced no code for tokens.ts` from `vp run coverage`'s ui build; after the esbuild fallback the unscoped gate exits 0 (4410/4410 tests). `esbuild` is a declared root devDependency; `oxc-transform` (the engine's own strip stage) is only transitively hoisted.
