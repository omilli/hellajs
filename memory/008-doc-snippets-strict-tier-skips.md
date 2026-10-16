---
title: doc-snippets strict tier skips any block importing node or other non-hellajs bare specifiers
description: "EXTERNAL_IMPORT_RE in scripts/doc-snippets.ts treats every bare specifier except `@hellajs/*` as external (node:http, node:stream, express, hono, vitest, vite-plus) and drops the whole block from the strict corpus."
tags: [doc-snippets, docs, verification, node, external-imports]
confirmed: 2026-10-16
---
# Why

A doc block that statically imports a node builtin is NOT typechecked by `vp run doc-snippets`'s strict tier — it is skipped exactly like an express/hono example. Plans or reviews claiming "the strict tier typechecks the rewritten node:http examples" are wrong: the diagnostics disappear because the blocks left the corpus, not because they pass. Rewrite decisions should still prefer node builtins (zero npm dependency, correct for readers, `guides/docs.md` §Import Style mandates showing real imports), but verification credit must not claim strict-tier coverage for them.

# Evidence

Empirical probe (2026-10-16, worktree): appending a `import { createServer } from "node:http"` block to `packages/ssr/docs/patterns/ssr.mdx` and running `vp run doc-snippets` emitted no module code for it (`rg createSocket/createServer` over `.doc-snippets/run-*/strict/` empty). Source: `EXTERNAL_IMPORT_RE = /^import\s[^"']*from\s+["'](?!@hellajs\/)[^"']+["']/` at scripts/doc-snippets.ts with the skip `if (imports.some((statement) => EXTERNAL_IMPORT_RE.test(statement))) continue;`, documented in its header comment "Blocks importing externals".
