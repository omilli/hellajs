---
title: Treat minification as a bandaid and external-removal cleanup as permanent in dom bundle-size work
description: Bundle-size work on @hellajs/dom optimizes real code volume (minification/measurement fixes explicitly rejected as band-aids), and the MutationObserver external-removal auto-cleanup is a kept product promise, never a cut candidate.
tags: [dom, bundle-size, decisions, cleanup, bench]
confirmed: 2026-12-17
---

# Why

During the 2026-12-17 bundle-size session (bench `dist/main.js` 58,727 bytes unminified vs Solid ~27kb), the user set two standing constraints. First, wiring up terser/minification to shrink the reported number was rejected outright — "this is a bandaid over the real issue"; the target is actual shipped code volume, so proposals must cut real wiring, not measurement overhead. Second, cutting the external-removal auto-cleanup (the MutationObserver cleanup arm in `packages/dom/lib/internal/queue.ts` that disposes effects when user code removes nodes via `el.remove()`/`innerHTML = ""`) was rejected even though it is ~4kb — it is the product's flagship "effects are cleaned up automatically when removed from the DOM" promise (`docs/concepts/control-flow.mdx`). Re-proposing either wastes a decision round.

# Evidence

- User statements, 2026-12-17: "You should ignore terser options, this is a bandaid over the real issue"; "I dont want to drop the external-removal."
- `packages/dom/lib/internal/queue.ts` `ensureContainerObserver`/`collectRemovedNode` — the observer serves cleanup (kept), afterMount delivery (`docs/api/hook.mdx` promises "dynamically added nodes on the next microtask"), and overlay re-registration for moved nodes; all three arms stay.
- Baseline measurements (unminified bytes): bench bundle 58,727 / minified 21,762 / gzip 8,042; ForEach 11,481 of it; the approved reduction direction is feature-gating unused subsystems (hooks, error boundaries, `e:` direct events, raw, hydrate coupling) via injectable feature modules + babel-plugin-emitted imports, not removing behavior.
