---
type: decision
title: bun links only DECLARED dependency edges — undeclared cross-package test imports fail wholesale; dom→ssr is a devDependency (workspace:*), the monorepo's first
description: bun 1.3.3 materializes node_modules links only for declared deps (peer-only edges get none) — test-only cross-pkg imports must be devDependencies; dom→ssr is the first, user-confirmed.
tags: [workspaces, packaging, testing, bun, env]
timestamp: 2026-09-18
last_confirmed: 2026-09-18
triggers: [dom-ssr-devdep, workspace-linking, bun-install-symlink, cross-package-dep, node-modules-resolution, undeclared-test-import, devdependency-convention]
supersedes: 022
---
# Why

022 (superseded) kept dom's `@hellajs/ssr` test import undeclared on the assumption "in-repo `bun install` links the workspace so `bun coverage dom` is green". That assumption died with bun 1.3.3's linking behavior: `node_modules/@hellajs/` symlinks exist ONLY for workspaces that are declared dependency edges of some workspace — peer-only edges (astro's `@hellajs/ssr: "*"` peer) get NO link, and undeclared workspaces (ssr, store, ui) get none either. Result: every dom test file importing `tests/helpers.ts` failed wholesale as "Unhandled error between tests: Cannot find module '@hellajs/ssr/bundle'" — 21 file-level failures (bun counts one per file), 261 pass / 21 fail, coverage collapsed to 66% purely from never-run tests.

Resolution options weighed with the user (2026-09-18, twice — once generically, once against the root-devDep alternative): peerDependency is semantically wrong (dom is client-side; a peer tells consumers to install a server package — 022's correct core); ROOT-workspace devDep preserves the packages/* null-devDep uniformity but declares the edge away from its consumer; dom devDep `workspace:*` declares it where it is consumed. User chose dom devDep, knowingly breaking the all-peer uniformity — the convention (023) now reads: cross-package RUNTIME deps are peerDependencies with carets; test-only cross-pkg deps are devDependencies with workspace:*.

bun nests the link at `packages/dom/node_modules/@hellajs/ssr` (not root) — resolution walks up from the importer, so nesting is fine.

# Evidence

- Empirical (2026-09-18): `ls node_modules/@hellajs/` → core, css, dom, resource, router only (all true dep edges); ssr/store/ui absent. `bun test packages/dom/tests/hydrate.test.ts` → 0 pass / 1 fail, `Cannot find module '@hellajs/ssr/bundle' from 'packages/dom/tests/helpers.ts'` — while `packages/ssr/dist/bundle.js` exists and the `./bundle` exports subpath is correct (resolution failure, not file failure).
- Manual `ln -s ../../packages/ssr node_modules/@hellajs/ssr` → same test 23 pass / 0 fail (root cause proven).
- Fix: `packages/dom/package.json` gained `devDependencies: {"@hellajs/ssr": "workspace:*"}` + `bun install` (link nested at `packages/dom/node_modules/@hellajs/ssr`) → `bun coverage dom` exit 0: 475 pass / 0 fail, lint green.
- No package.json ever declared a real ssr dep before (git log -S '"@hellajs/ssr"' over packages/*/plugins/* → only ssr's own creation + astro's peer block), so this was always one fresh `bun install` away from breaking — the Sep 18 reinstall is what surfaced it.
