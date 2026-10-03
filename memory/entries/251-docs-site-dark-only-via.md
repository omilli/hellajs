---
type: decision
title: Docs site is dark-only via dist/registry — island modules import @registry/theme/tokens.dark.js; no docs-side tokens copy exists
description: The ui demos import the registry's built dark tokens directly; docs/hella.ui.json, vendored tokens.js, and the drift guard are deleted — a dark-value change lands with bun bundle ui alone.
tags: [ui, docs]
timestamp: 2026-10-02
last_confirmed: 2026-10-02
triggers: [tokens-js, dark-default-demos, registry-tokens, docs-demos, bundle-ui]
supersedes: 231
---
# Why

The docs demos run the registry's built output directly: each
`docs/src/demos/<name>-demo.tsx` island imports
`@registry/<name>/css/<name>.js` plus `@registry/theme/tokens.dark.js` and
mounts via `client:load` through the `astro-plugin-hellajs` renderer. The
docs-site vendoring layer is deleted — no `docs/src/components/ui/`, no
`docs/hella.ui.json` `themeMode` config, no
`packages/ui/tests/drift.test.ts` byte-matcher. Dark values change by
editing `packages/ui/registry/theme/tokens.dark.js` and running
`bun bundle ui`: nothing to re-vendor, nothing to re-byte-match. The old
hand-divergence/clobber scenario is structurally impossible — the site no
longer holds a tokens copy at all.

# Evidence

2026-10-02, worktree plans-docs-misc-demo-pipeline unit 05 of
plans/docs/misc/demo-pipeline: `rg -l '@registry/theme/tokens.dark'
docs/src/demos` matches all 59 island modules; `fd . docs/src/components/ui`
exits 1; `test ! -f docs/hella.ui.json` passes; `bun coverage ui` exits 0
with `drift.test.ts` removed from the suite (no test references the vendored
dir); `cd docs && bun run build` exits 0 with the css-html tab rendered from
the generated `docs/src/generated/install/css-html/` dir.
