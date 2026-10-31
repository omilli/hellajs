---
title: Drop to vp check --fix when a format fix is needed
description: `vp run lint` does not forward `--fix`; run `./node_modules/.bin/vp check --fix` directly, then re-run `vp run lint` for the gate.
tags: [lint, formatting, vp, oxfmt, fix]
confirmed: 2026-10-31
---
# Why

A red lint from a formatting issue (long lines, quoting, array collapse) suggests `vp run lint --fix`, but the `lint` script never forwards the flag: the run exits 1 with files unchanged and a second full lint wasted. The fix path is the underlying static-check binary the script wraps.

# Evidence

`vp run lint --fix` exited 1 and left the flagged file unmodified; `./node_modules/.bin/vp check --fix` exited 0 and reformatted only the flagged file; the follow-up `vp run lint` exited 0 (2026-10-31). `vp check` is oxfmt format check + oxlint + tsgolint plus the `lint/hellajs.js` JS-plugin rules, per root AGENTS.md §Scripts (lint row).
