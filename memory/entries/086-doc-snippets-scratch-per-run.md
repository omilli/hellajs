---
type: decision
title: "doc-snippets scratch is per-run — concurrent invocations are safe; never flatten it back to a shared dir"
description: doc-snippets scratch is per-run (run-<pid>-<suffix>/ dirs, dead runs pruned) — concurrent invocations are safe; never flatten it back to a shared dir (that wipe caused the ENOENT crash).
tags: [toolchain, doc-snippets]
timestamp: 2026-09-05
last_confirmed: 2026-09-05
triggers: [doc-snippets-crash, enoent-dot-doc-snippets, concurrent-audit-runs, doc-snippets-layout]
---

# Why

Before 2026-09-05 the tool wiped and reused one shared `.doc-snippets/` per invocation. Two overlapping runs (e.g. an audit's check plus another invocation) raced: the second run's opening `rmSync` deleted the first run's corpus between its tsc and its read loop → `ENOENT … open '.doc-snippets/tutorial/<doc>.tsx'` crash in `main`'s breadcrumb read (observed during the packages/css audit), or — worse — a silently emptied tier (tsc finds no config, parses zero diagnostics, exits clean): a hole in the audit with no signal. The crash is conditional (needs the overlap window), so solo re-runs never reproduce it — diagnose by mechanism, not by retry. Known cosmetic edge: a dir whose pid was reused by an unrelated live process lingers past its run; harmless (gitignored scratch).

# Evidence

- Mechanism repro (pre-fix): wipe `.doc-snippets/tutorial` mid-run → `ENOENT … open '.doc-snippets/tutorial/tsconfig.json'` thrown through `main`; same window at later timing reaches the `readFileSync` crash site; earlier timing silently zeroes the tier's findings.
- Eliminations: stale prior-run artifacts impossible (`main` opened with `rmSync(OUT_DIR)`); subdir-cwd invocation dies earlier at `collectDocs` (`ENOENT scandir <cwd>/packages`); script was byte-unchanged across the observation (`git log -- scripts/doc-snippets.ts`).
- Fix verified (post-fix, `scripts/doc-snippets.ts`): two simultaneous `bun doc-snippets` runs both exit 0 with identical full reports (`checked 94 docs, 637 blocks (0 strict, 47 tutorial findings)`) and coexisting live `run-*` dirs; a follow-up run prunes both dead dirs; diagnostic output byte-identical to the flat layout (`resolveDiagnosticFile` strips the run segment — memory 080's error-set diffing depends on that stability).
