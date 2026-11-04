---
title: Invoke vp as ./node_modules/.bin/vp — it is not on the agent shell PATH
description: Agent shells resolve bare `vp` inconsistently — some session shells carry the repo bin on PATH, others exit 127; run `./node_modules/.bin/vp check` (or the `npm run <script>` wrapper) directly for deterministic resolution.
tags: [vp, cli, path, lint, scripts]
confirmed: 2026-11-04
---

# Why

AGENTS.md §Scripts names `vp run <name>` as the canonical invocation, but the agent's bash shells resolve bare `vp` inconsistently — PATH varies per session shell, so a bare `vp run lint` can exit 127 (`vp: command not found`) even when an identical call resolved earlier in the same run. The explicit binary path is the only deterministic form.

# Evidence

- `vp run lint` in the repo-root shell: `exit 127 — /bin/bash: vp: command not found` (2026-10-30, baseline gate run).
- `./node_modules/.bin/vp check` and `npm run lint:guards --silent` in the same shell both exit 0 — the two commands `vp run lint` composes (AGENTS.md §Scripts lint row names them explicitly).
- Bare `vp` resolved in several session shells of one run (baseline + rerun gates all exit 0) then failed exit 127 in a later identical call (2026-11-04, ssr test sweep) — inconsistent PATH, not uniformly absent.
