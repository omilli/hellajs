---
type: correction
title: "Docs-site demo islands: host-element handlers need on:, spread-consuming data props need arrays, and green build exit hides island SSR errors"
description: "Demo wrappers: host-element JSX onclick is a prop SSR calls (use on:click); data props feeding children-spread consumers must be arrays; sweep build logs for [dom] errors — exit 0 hides broken islands"
tags: [docs-site, ssr, babel]
timestamp: 2026-10-02
last_confirmed: 2026-10-02
triggers: [astro-island, jsx-host-handler, demo-wrapper, ssr-props-resolve, docs-build-verify]
---
# Why

Three verified hazards bite any wrapper authored as JSX for a `client:load` island (the 04-demo-tail pattern; the docs-nav shell in site-foundation/09 inherits all three):

1. **Host-element event handlers must use the `on:` prefix** (`<a on:click={...}>`, never `onclick={...}`). The babel JSX transform puts only `on:`/`e:`/`hook:`/`error:`-prefixed keys in the runtime-only buckets; plain `onclick` on a host element is a node prop, and SSR's prop loop resolves every prop through `resolveValue` — functions get CALLED with undefined (`e.preventDefault()` of undefined = fatal build error). Component-attribute `onclick` (registry components) is unaffected — component props pass through unwrapped.
2. **Spread-consuming data props need array values.** `AccordionContent`/`CollapsibleContent`/`TabsContent` render item `content` through `[...props.children]`, so a single JSX element as the item's `content` throws "not iterable" (non-fatally — the page still builds). Pass arrays: `content: [<p/>]`. Leaf components that unconditionally spread (`Separator`, `Skeleton`) crash when `buildComponentCall` omits the `children` key on a childless call — give them `{[]}`.
3. **A green `bun run build` does not mean islands rendered.** Island SSR errors are caught and logged as `[dom] TypeError: …` lines while the page still emits and the build exits 0. Sweep the log for `\[(dom)\]|(ERROR)` and grep hero SSR content markers in `docs/dist/ui/<name>/index.html`; exit code + island counts alone marked a broken page green for three batches.

Related but distinct: 172 (registry-side fix — canonicals arrow-wrap optional children) and 249 (component render-prop children need the attribute form). This entry is the caller-side contract for wrapper authors.

# Evidence

Session 2026-10-02, unit 04-demo-tail (53 pages converted). Fatal: hover-card build crash `Cannot read properties of undefined (reading 'preventDefault')` — `packages/ssr/lib/ssr.ts` ssrImpl prop loop + `resolveValue` (resolve.ts: "calling it if it is a function") + `plugins/babel/src/processors/attributes.mjs` (only `on:`/`e:` prefixes reach the on-bucket). Non-fatal: `/ui/accordion` logged `props.children is not iterable` behind exit 0 from batch 1 (registry `accordion.js` AccordionContent `children: [...props.children]`); separator/skeleton same via `separator.js:27`/`skeleton.js:22`. Slider fatal: `rangeStyle`'s `Math.min(...values())` on a bare-number accessor — `slider.d.ts` types `value?: number[] | (() => number[])`. All fixed wrappers build with zero `[dom]` lines and SSR content markers present (`/tmp/docs-final-04.log`).
