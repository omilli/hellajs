---
type: correction
title: bun passes argv flags after the script path through intact — only bun -e without a file target consumes recognized flags
description: Gate scratch-script modes on process.argv freely for `bun <file> <flags>`; only `bun -e <code> <flags>` drops recognized flags — use an env var there.
tags: [tooling, bun]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [bun-cli-flags, argv-gating, scratch-script, bun-e-mode]
supersedes: 174
---
# Why

Supersedes 174: bun 1.3.3 (repo CI pins `bun-version: latest`) no longer consumes recognized flags placed after a script path — everything from the file target onward lands in `process.argv` verbatim, recognized flag or not. Env-var gating for file scripts adds plumbing with nothing to defend against. The consumption surface that survives is `bun -e <code> <flags...>` with no positional file: bun's own parser stays active there and recognized flags vanish from argv, while plain positionals survive. So the fix for `-e`-mode scratch checks is either an env-var gate or inserting the target file as a positional (`bun -e '...' script.ts args...` switches bun into run mode and args flow through).

# Evidence

Reproduced 2026-09-27, bun 1.3.3: `bun mem-verify.ts --apply x` → argv `[..., "mem-verify.ts", "--apply", "x"]` intact; same for `--smol`, `--conditions=dev`, `--define.FOO=1`, `--preload ./utils/happydom.js`, and the `bun run <file>` form. Contrast: `bun -e 'console.log(JSON.stringify(process.argv))' --apply packages/core` → `[".../bun","packages/core"]` — `--apply` consumed; and `bun -e '...' mem-verify.ts --apply x` → args intact from the file positional onward.
