---
type: decision
title: Bare `bun audit` invokes bun's builtin and shadows package scripts - the audit runner is `bun audits`
description: bun's builtin `audit` subcommand wins over a same-named package.json script, so the package audit runner must stay `bun audits`.
tags: [scripts, cli]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [rename-audits, bun-audit-builtin, script-shadowing, audits-runner]
---

# Why

The package audit runner (`scripts/audits.ts`, wired as the `audits` package.json script) was nearly named `audit`. A probe in a scratch dir with `{"scripts":{"audit":"echo SCRIPT-AUDIT-RAN"}}` showed `bun audit` prints the builtin's banner (`bun audit v1.3.3 … error: Lockfile not found`) — the builtin shadows the script, and the intended invocation is unreachable without `bun run audit`. `audits` has no builtin counterpart and the repo-wide token was clean, so the bare invocation works.

# Evidence

- Scratch-dir probe (2026-09-10 session): `bun audit` ran the builtin, script output never appeared; `bun audits <pkg>` resolves the package.json script.
- `scripts/audits.ts` + root `AGENTS.md` §Scripts `audits` row landed via plans/agents/config/audit-split; renaming to `audit` would silently break the documented bare invocation.
