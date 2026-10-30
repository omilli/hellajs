---
title: Invoke vp as ./node_modules/.bin/vp — it is not on the agent shell PATH
description: Agent shells cannot resolve bare `vp`; run `./node_modules/.bin/vp check` (or the `npm run <script>` wrapper) directly instead of trying `vp run <name>` first.
tags: [vp, cli, path, lint, scripts]
confirmed: 2026-10-30
---

# Why

AGENTS.md §Scripts names `vp run <name>` as the canonical invocation, but the agent's bash shell does not carry `node_modules/.bin` on PATH — a bare `vp run lint` exits 127 (`vp: command not found`) and costs a failed round-trip before the working form is used.

# Evidence

- `vp run lint` in the repo-root shell: `exit 127 — /bin/bash: vp: command not found` (2026-10-30, baseline gate run).
- `./node_modules/.bin/vp check` and `npm run lint:guards --silent` in the same shell both exit 0 — the two commands `vp run lint` composes (AGENTS.md §Scripts lint row names them explicitly).
