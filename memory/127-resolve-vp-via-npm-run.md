---
title: Resolve vp via npm run or node_modules bin in agent shells
description: Bare `vp` is not on PATH in agent shells; invoke scripts as `npm run <name>` (or `./node_modules/.bin/vp`) instead.
tags: [scripts, tooling, shell]
confirmed: 2026-11-10
---

# Why

Root AGENTS.md §Scripts names `vp run <name>` as the canonical invocation, but agent
shells get no global vp install: the bare command fails with `vp: command not found`
after the harness has already loaded AGENTS.md, costing a round-trip per session that
trusts it.

# Evidence

`vp run lint:structure` → `/bin/bash: line 1: vp: command not found` (2026-11-10);
`npm run --silent lint:structure` and `./node_modules/.bin/vp check` both ran clean
immediately after in the same shell.
