---
title: Measure pointer-leave latency with in-page event instrumentation, not Node-side timers
description: Playwright hide-latency probes anchor on a page-injected pointerleave listener + MutationObserver and poll by element id; interpolated mouse.move steps fire leave before any Node timer starts, and page.evaluate cannot return live elements.
tags: [playwright, probe, timing, mouse, tooltip, hover, docs-site, measurement]
confirmed: 2026-10-30
---
# Why

A naive hide-latency probe (Node timestamps around `mouse.move`, then poll) mis-measures by 50-300ms in both directions. Two mechanisms: (1) `mouse.move` with `steps: N` interpolates, and the `pointerleave` fires during an early step, so a Node-side `Date.now()` taken after the awaited move already trails the real leave; (2) `page.evaluate` serializes returned DOM elements to empty objects (`el.getAttribute is not a function`), so snapshot helpers must query by a stable attribute (generated id) instead of passing element handles. Threshold DoDs like "hides within 250ms" vs "exceeds 400ms" are undecidable under the naive anchor.

# Evidence

Confirmed 2026-10-30 probing the docs site tooltip page (`/ui/tooltip/`, astro dev on a worktree port). Naive probe: pointerleave-to-detach read 261ms. Instrumented probe (page-injected `document.addEventListener("pointerleave", ..., true)` filtered to `data-slot='tooltip-trigger'`, a `MutationObserver` on `data-state` attributes and childList, single-step un-interpolated `mouse.move` away, polling by the content's generated `hella-tooltip-content-N` id): pre-fix leave-to-closed-flip 300.4ms, leave-to-unmount 550.9ms; post-fix 0.7ms and 183.6ms. The 300ms pre-fix flip matches `hoverIntent`'s `closeDelay ?? 300` default (`packages/headless/lib/utils/hoverIntent.ts`); the 550ms unmount adds the exit machine's 250ms `setTimeout(finishExit, 250)` fallback (`packages/headless/lib/tooltip.tsx`), which only runs because the unstyled content defines no `animationend` to fire earlier.
