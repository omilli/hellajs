---
type: decision
title: Package-boundary rule — no workspace split for bundle size; headless behavior functions live flat on @hellajs/dom (primitives dissolved, unpublished window)
description: Tree-shaking covers pure-function exports (no module-scope side effects in dom/lib), so only consumer seams justify a packages/* split; primitives dissolved flat into dom, unpublished window.
tags: [arch, packaging, api-contract]
timestamp: 2026-09-17
last_confirmed: 2026-09-17
triggers: [primitives, new-package-proposal, package-split, tree-shaking, absorb-workspace, focus-trap, roving-tabindex]
---

# Why

The zero-dep "Radix split" rationale for a standalone `@hellajs/primitives` was discarded in an idea session (2026-09-17): its only designed consumer (`@hellajs/ui` registry) always pairs behaviors with dom, the standalone plain-JS consumer was speculative, and tree-shaking covers the bundle cost. A packages/* split now needs a real consumer seam, not a shipping-size argument. Sequencing mattered: primitives was never published (404) — dissolving pre-publication avoids any deprecation surface; the standing ui worktree was reworked instead of publishing-then-deprecating.

# Evidence

- `npm view @hellajs/primitives` → 404 while `@hellajs/dom` → 1.4.2 (2026-09-17): clean dissolution window, no shim needed.
- `rg '^(document|window|globalThis)\.' packages/dom/lib/*.ts` → empty: no module-scope side effects, so unused barrel re-exports drop under Rollup/Vite/esbuild; `sideEffects: false` on dom extends it to webpack (the four functions import only `internal/focusables` — core never enters their graph).
- User decisions on the three forks (flat top-level exports; docs folded into dom, comparison rows into dom-comparison.md; merge-before-set sequencing). Contract: `plans/dom/code/dissolve-primitives/`.
