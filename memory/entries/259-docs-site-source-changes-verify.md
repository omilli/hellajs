---
type: decision
title: Docs-site source changes verify with `bun run build` inside docs/ — repo lint gates exclude docs/src entirely
description: The only executable gate for docs/src TS is `cd docs && bun run build`; `bun lint`'s tsc omits docs/src from tsconfig.lint.json and eslint ignores docs/.
tags: [docs, verification]
timestamp: 2026-02-11
last_confirmed: 2026-02-11
triggers: [docs-site-source, verification-gate, site-module-edit]
---
# Why
An agent reflexively running `bun lint` after editing docs-site source gets green output and false confidence — tsc's include list (tsconfig.lint.json) names packages/plugins/scripts/utils paths only, and eslint answers "File ignored because of a matching ignore pattern". The docs build is a real gate: it executes every css()/style()/vars() module in the SSR process (structural violations throw, e.g. css()'s top-level-declaration and conditional-at-rule guards) and renders all pages.
# Evidence
tsconfig.lint.json `include` array has no `docs/**` entry; `bunx eslint docs/src/styles/preflight.ts` → "File ignored..."; `cd docs && bun run build` → 181 pages, exit 0, preflight text present in the built `site-head` (2026-02-11, preflight port session).
