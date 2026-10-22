---
title: Pass bench flags as single --key=value tokens
description: scripts/bench.ts parseArgs only accepts --key=value in one argv token — space-separated flags ("--runs 5") fail with "unexpected argument" before any build runs.
tags: [bench, cli, scripts]
confirmed: 2026-10-22
---
# Why

`scripts/bench.ts` `parseArgs` scans each argv entry for `--` + `=` and throws `unexpected argument "<arg>" (expected --key=value or --headed)` for anything else. A space-separated invocation (`vp run bench --runs 5`) hands the script `--runs` and `5` as separate tokens, fails fast at parse time (no build cost), and the error names the token — easy to misread as a vp arg-forwarding bug when it is the bench script's own contract. The one flag-like exception is bare `--headed`.

# Evidence

`scripts/bench.ts` `parseArgs` (read 2026-10-22): `if (!arg.startsWith("--") || equals === -1) throw` — then a working run `vp run bench --label=proto-baseline --runs=5 --ops=create-1k,…` exits 0 while the space-separated form of the same command exits 1 pre-build.

# Ritual

Invoke the bench as `vp run bench --label=<label> --runs=<n> --ops=<comma-separated-ids>` — every option in one token; only `--headed` stands alone.
