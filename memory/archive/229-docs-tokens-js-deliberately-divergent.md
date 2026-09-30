---
type: decision
title: docs tokens.js is deliberately divergent (dark-default) — add --dir docs --overwrite stomps it, and the tokens.js drift red is pre-existing
description: The vendored docs tokens.js is a deliberate dark-palette divergence; `add --dir docs --overwrite` clobbers it via theme deps, and the tokens.js drift-guard red is pre-existing, not a regression.
tags: [ui, docs]
timestamp: 2026-09-30
last_confirmed: 2026-09-30
triggers: [tokens-js-drift, add-dir-docs, dark-default-demos, drift-guard-red]
---
# Why
The docs demos default to dark by hardcoding the dark palette in the vendored
`tokens.js` instead of toggling a `dark` class. That makes the vendored file
byte-diverge from fresh `add theme` output by design, so
`tests/drift.test.ts > "tokens.js byte-matches the fresh add output"` fails at
that commit. Any `add <name> --dir docs --overwrite` run resolves
`registryDependencies: ["theme"]` recursively and overwrites the divergent file
with the light canonical — undoing the user's intentional state mid-session.

# Evidence
`git show --stat cc694a1e` ("docs: ui demos default dark") touches only
`docs/src/components/ui/{Demo,InstallSection}.astro` + the vendored
`tokens.js`; `git show cc694a1e:docs/src/components/ui/tokens.js` is the
old-format dark-only `vars({...})` while `registry/theme/tokens.js` (HEAD) is
light values + `css({ "@layer hella": { ".dark": {...} } })`. Repro diff of
fresh `add collapsible` output vs the vendored file (2026-09-30) confirms the
mismatch; `bun coverage ui` fails only that one drift case.
