---
type: decision
title: "doc-snippets' signature-only skip is a PER-LINE regex — a line-initial `<` or a bare `=` on any line flips the whole block into strict checking"
description: isExecutableBlock judges per line; a line-initial `<P extends ...>` or a bare `=` on a continuation line flips the whole block into strict checking — wrap offending tokens onto a shielded line.
tags: [docs, toolchain, doc-snippets]
timestamp: 2026-09-15
last_confirmed: 2026-09-15
triggers: [doc-snippets-skip, type-block-transcription, ts2391-doc-snippets, generic-call-signature, api-type-block]
---

# Why

`scripts/doc-snippets.ts` `isExecutableBlock` evaluates one line at a time: `type `/`interface `/`declare `-prefixed lines and `}`-closings are non-executable, everything else falls through `EXECUTABLE_RE` (`^<` matches any line starting with a generic call signature) and `ASSIGN_RE` (any bare `=` after arrow/`<...>` stripping — e.g. `T extends Record<string, unknown> = Record<string, never>` on a continuation line). The `type ` prefix only shields ITS OWN line. So a "signature-only" block written verbatim from source with (a) the `$update`-style overload `<P extends Record<string, unknown>>(...)` on its own line, or (b) `type Store<` split across lines, becomes checkable — and then fails hard: TS2391 (overload `function` declarations without implementation), TS2304 (the block's imports are stripped/discarded, so `Signal`/`PartialDeep`/`SignalArray` etc. vanish), and TS7006 cascades into later blocks sharing the emitted module (broken local `store` shadow types every downstream `draft` param). The skip is not semantic — it is incidental line shape. Verbatim transcription of such blocks must wrap the offending tokens onto a preceding line that starts with a shielded token (`$update: { <P extends ...>`, `type Store<T ... = ..., R ...> = {` on one line); content tokens stay byte-identical, only wrapping changes.

# Evidence

Verified 2026-09-15 in the store-docs-audit unit 01 run (worktree wt/plans-store-audit-docs): `bun doc-snippets` after verbatim transcription exited 1 with `.doc-snippets/strict/packages_store_docs_api_store_mdx.ts` TS2391/TS2304×5/TS7006×3; after the two re-wraps it exited 0 with block count and findings byte-identical to baseline (`checked 96 docs, 660 blocks (0 strict, 67 tutorial findings)`). Per-line replication of the predicate against the block confirmed exactly the two offending lines. Predicate source: `scripts/doc-snippets.ts` lines 184-194, 91 (`EXECUTABLE_RE`), 82-89 (`stripArrows`/`ASSIGN_RE`).
