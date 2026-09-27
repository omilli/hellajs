---
type: decision
title: "Pass bun script-mode flags via env vars — bun consumes recognized flags before the script's argv"
description: "`bun file.ts --apply x` and `bun -e ... --apply x` silently drop recognized flags from process.argv — gate scratch-script modes on an env var instead."
tags: [tooling]
timestamp: 2026-09-22
last_confirmed: 2026-09-22
triggers: [bun-cli-flags, script-mode-env, argv-dropped, scratch-script]
---
# Why

Bun parses CLI flags anywhere in the invocation — including after the script path — and recognized ones (`--write`, `--apply` both reproduced) never reach `process.argv`. A script gated on `process.argv.includes("--apply")` then silently runs in its default (often dry-run) mode while printing output that looks successful; the mode inversion cost three debug rounds in one session. Plain positional args pass through normally. The robust pattern: `FIX_APPLY=1 bun script.ts <files...>` with `const APPLY = process.env.FIX_APPLY === "1"` — env vars cannot be intercepted by the runner.

# Evidence

`bun -e 'console.log(JSON.stringify(process.argv))' .doc-snippets/fix-closes.ts --apply packages/...` → `[".../bun",".doc-snippets/fix-closes.ts","--apply","packages/..."]` (args intact via `-e`), but `bun .doc-snippets/fix-closes.ts --apply <file>` with the same `includes` check printed DRY-RUN on every run until the gate moved to `process.env.FIX_APPLY`. Session 2026-09-22 (`<//>` eradication run).
