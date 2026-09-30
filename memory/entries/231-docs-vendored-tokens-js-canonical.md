---
type: decision
title: "Docs vendored tokens.js is canonical dark via `themeMode: \"dark\"` config — no hand divergence, drift guard keeps it exact"
description: "Docs' vendored tokens.js is the dark-default registry artifact via `docs/hella.ui.json` `themeMode: \"dark\"`; every sync `add` re-emits it byte-identically — never hand-edit it or wave a drift red."
tags: [ui, docs]
timestamp: 2026-09-30
last_confirmed: 2026-09-30
triggers: [tokens-js-drift, add-dir-docs, dark-default-demos, theme-mode-config, drift-guard-byte-match]
supersedes: 229
---
# Why
The docs demos are dark through configuration, not divergence:
`docs/hella.ui.json` sets `themeMode: "dark"`, so `add`/sync emits
`registry/theme/tokens.dark.js` content as the vendored `tokens.js`, and
`tests/drift.test.ts` byte-matches it under the same fixture config. The old
stomp scenario (`add --dir docs --overwrite` clobbering a hand-diverged dark
file) is structurally gone — the CLI now writes exactly what the site wants.
A drift red on `tokens.js` means real divergence (hand edit or config loss),
never a pre-existing failure to wave through.

# Evidence
`bun packages/ui/bin/hellajs-ui.js add theme --dir docs --overwrite` produced
`cmp -s packages/ui/registry/theme/tokens.dark.js
docs/src/components/ui/tokens.js` byte-identical (2026-09-30, worktree
plans-ui-code-dark-default-tokens); `bun coverage ui` exit 0, 2771 pass
including both drift tests under the `themeMode: "dark"` fixture;
`rg -l 'demo-frame dark' docs/src` exits 1 (60 frames de-classed);
`cd docs && bun run build` exit 0, 168 pages.
