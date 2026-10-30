---
title: "Verify ui registry demos with playwright against a worktree-local astro dev server on a unique port"
description: "Interactive ui-registry verification on the docs site: install docs/node_modules in the worktree, launch `astro dev --port 45NN` per unit (the daemon collides otherwise), drive system Chrome via playwright `chromium.launch({ channel: 'chrome' })` from scratch scripts in packages/ui/tests/.tmp/."
tags: [ui, docs-site, playwright, astro, worktree, verification]
confirmed: 2026-01-16
---
# Why

Registry demo defects (hydration failures, invisible portaled panels, clipped viewports, padding) are only observable by driving the real site; unit suites exercise compiled parts in happy-dom and never catch docs-site integration breaks (nested-button SSR parse fixups, unset css vars, demo-frame layout). Three operational traps make naive probing wedge: astro 7 daemonizes `astro dev` (a stale daemon serves 500 `FailedToLoadModuleSSR` until `astro dev stop`), worktree seeds install only the root workspace so `docs/` lacks `node_modules` until `npm install` runs there (same class as the examples rule), and parallel unit worktrees collide on the default 4321 port.

# Evidence

Diagnosing the ui demo defect set (dead dropdown hydration, popover trigger emptied by the HTML parser's nested-button fixup, 2px navigation-menu viewport from unset `--radix-navigation-menu-viewport-*` vars, sheet/drawer zero padding, fixed sidebar hidden under docs chrome): every root cause reproduced only through a playwright probe of the running site; the pre-existing dev daemon returned `FailedToLoadModuleSSR` 500s until `astro dev stop` + fresh start; `chromium.launch({ channel: "chrome" })` is the repo's own pattern (`scripts/bench/driver.ts`). Probes as `.mjs` scripts under `packages/ui/tests/.tmp/` (gitignored, `lint.ignorePatterns` exempt) run with bare `node` and deleted after. Confirmed 2026-01-16.
