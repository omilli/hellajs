---
type: correction
title: Never write path globs (dir/*.ext) inside JSDoc block comments — the glob's */ terminates the comment early
description: A glob like `examples/*/tutorial.mdx` or `docs/**/*.mdx` inside a docstring embeds the comment terminator and breaks parsing; reword to prose (e.g. "the tutorial.mdx inside each examples/<name>/").
tags: [toolchain, scripts, docs]
timestamp: 2026-08-20
last_confirmed: 2026-08-20
triggers: [jsdoc-glob, block-comment-terminator, guard-script-docstring, scripts-docstring-edit]
---
# Why

This repo mandates dense JSDoc on every script function (`jsdoc-params` guard, `guides/scripts.md`), and guard docstrings naturally quote file globs when describing scan surfaces ("every `.mdx` under `examples/*/`"). Any glob whose `*` is followed by `/` closes the `/** … */` block early — everything after it becomes code. The failure is noisy but misdirected: bun's parse errors point at innocent-looking prose tokens lines later ("Expected \";\" but found \"dist\"", "Unexpected *"), so each occurrence costs a debug round-trip to trace back to the docstring. `tsc` and `eslint` would catch it too, but `bun <script>` runs before either on a guard edit, so it bites first. Reword globs as prose paths in comments: `docs/src/pages/`, "the `tutorial.mdx` inside each `examples/<name>/`", "every package's `docs/`" — never `dir/*/file`.

# Evidence

2026-08-20, editing `scripts/doc-links.ts` (adding the page-existence check): `**/*.mdx` in the header docstring → `error: Unexpected *` at scripts/doc-links.ts:27; after that fix, `examples/*/tutorial.mdx` in `collectScanFiles`' JSDoc → `Expected ";" but found "dist"` at the docstring tail. Rewording both globs to prose fixed it; `bun doc-links` then ran clean and full `bun lint` (tsc + eslint + guards) exited 0.
