---
title: Gate tree-shake greps on machinery-body names, never seam call-site keys
description: Bundle-size tree-shake gates that grep built artifacts for function names must sample names exclusive to the machinery's module bodies — an injection-seam refactor spells the machinery names at retained call sites (seam property keys), so a fully-successful split still matches.
tags: [tree-shake, bundle-size, injection-seam, grep-gates, rolldown]
confirmed: 2026-10-24
---
# Why

A bundle-gate pattern of the form `rg -c 'fnA|fnB|…' dist/bundle.js` (zero matches expected) silently over-samples after a seam split: the seam object's property keys ARE the machinery function names, and the retained guard arm spells them at every call site (`claims.claimFragmentRoots(peekClaimParent(), proto)` inside an `if (adopting())` arm of `packages/dom/lib/runtime.ts`). Property access text is irreducible under unminified output — renaming keys to dodge the grep contradicts the seam's single-object contract. Author the pattern from machinery-BODY-only names, or prove substance with markers that vanish with the module: module-state identifiers (`hydrateStack`), registrar names only the dropped module calls (`setClaims`), and private warn strings.

# Evidence

2026-10-24, `examples/bench/dist/main.js` (unminified rollup output) after splitting `packages/dom/lib/internal/adoption.ts` into a state half plus `internal/claims.ts` registering through `setClaims`: bundle 70,130 → 58,687 bytes; `rg -c 'adoptReactiveRegion|adoptDynamicRegion|swapSuspenseStage|adoptClaimFrame|gatherRegion|consumeRegion' dist/main.js` exits 1 (zero); the original 7-name pattern had exactly one hit — the `claims.claimFragmentRoots` call site; `rg -c 'hydrateStack|peekHydrateContext|deferredRegions|setClaims' dist/main.js` → 0.
