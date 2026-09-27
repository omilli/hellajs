---
type: decision
title: Probe cross-package reactivity from dist bundles only — mixing source and dist imports splits the reactive graph silently
description: Probe cross-package reactivity from dist bundles only — a core SOURCE import beside a dist-resolving target splits the reactive graph; effects never observe writes and counts false-negative silently.
tags: [arch, testing, core, bundling]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [runtime-probing-store, dist-vs-source-imports, effect-count-verification, cross-package-probes]
---
# Why

A probe that verifies reactivity by counting `effect()` runs must share ONE reactive graph with the code under test. In this monorepo, package internals import `@hellajs/core` (resolved by the bundler/workspace config to `packages/core/dist`), while an ad-hoc probe script that imports `./packages/core/lib/index.ts` (source) instantiates a SECOND, independent copy of the scheduler/graph. Writes through the store's signals (dist world) then never notify the probe's effects (source world), and every effect-count assertion reads a false negative — silently, because both worlds are internally consistent.

This exact trap produced wrong conclusions during the 2026-08-25 store critique: `update(draft => ...)` appeared not to re-fire effects subscribed to untouched `Date`/class-instance signals (1 run instead of 2), briefly suggesting `extractChanges` was innocent. Re-running the identical probe with `import { store } from "@hellajs/store/bundle"` + `import { effect } from "@hellajs/core"` (the resolution the test suite uses) showed the true behavior (2 runs — spurious rewrites confirmed). A second-order trap in the same family: `flush()` is also world-local — it drains the scheduler of its own module instance, never both worlds — so even correct import worlds need `flush()` before counting.

What breaks if ignored: correctness findings get falsified or confirmed on evidence from a split graph; plans inherit wrong behavioral claims; "verified empirically" becomes worse than unverified because it carries false confidence.

# Evidence

- Split world (store lib source importing `@hellajs/core`→dist, effect from source): `s2.update(d => { d.count = 1 })` left a `when`-subscribed effect at 1 run; direct `s2.when(new Date(2000))` ALSO left it at 1 run — the subscription was provably in another world. Run of 2026-08-25, `bun -e` from repo root.
- Unified world (`@hellajs/store/bundle` + `@hellajs/core`): identical scenario — untouched `when`/`pt` effects at 2 runs (spurious rewrite confirmed), touched-via-draft at 2 runs. Same session, immediately after.
- Dist-world evidence visible in the stack trace of the `update({ update: {...} })` crash: `packages/store/dist/bundle.js:201` — store internals execute from dist.
- Test-suite convention (AGENTS.md Testing): all `packages/` tests import from `dist/` bundles (`@hellajs/store/bundle`, `@hellajs/core`) — the probe world must match.
- Re-verified 2026-09-26 against the current tree: store's `dist/bundle.js` still imports `@hellajs/core` externally (→ `packages/core/dist` via the workspace symlink + exports map), and the result reproduces identically under the current store API (`update` is now `$update`; store properties are non-writable — direct `s.n = 1` throws "Attempted to assign to readonly property", so the original probe commands above no longer run as written). Split world (store dist + core source): effect at 1 run after `$update({ n: 1 })` + `flush()`; unified world (`@hellajs/core` dist): 2 runs. `bun -e` from repo root; note bare workspace specifiers don't resolve from `[eval]` — import the dist bundle by absolute path and let its own `@hellajs/core` import resolve from the bundle's location.
