---
type: fact
title: "doc-snippets resets .doc-snippets/ — never stage scratch files there"
description: "bun doc-snippets wipes and re-emits into .doc-snippets/; scratch logs staged inside vanish on the next run — keep baseline/captured logs outside that directory."
tags: [docs, doc-snippets, toolchain]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [doc-snippets-scratch, baseline-log-capture, guard-output-log]
---

# Why

The guard owns its emit directory: a `{ ...; } > .doc-snippets/x.log` capture survives only until the next `bun doc-snippets` invocation resets it, silently losing the very output the capture was for (exit status stays 0, so nothing surfaces the loss at the time).

# Evidence

Observed twice 2026-09-10 in the plans-core-audit-docs worktree: `unit03-baseline.log` and `t1.log` both absent immediately after a green `bun doc-snippets` run that was redirected into `.doc-snippets/`; root AGENTS.md §Scripts documents doc-snippets as "Emits into gitignored `.doc-snippets/`" (emit target, not scratch space).
