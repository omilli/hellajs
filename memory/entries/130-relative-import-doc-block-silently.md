---
type: decision
title: "A relative import in a doc block silently skips doc-snippets strict checking — EXTERNAL_IMPORT_RE matches './x' specifiers"
description: doc-snippets' EXTERNAL_IMPORT_RE treats any non-@hellajs specifier (including relative './styles') as external and skips the whole block; dropping the import re-enables strict coverage.
tags: [docs, guards, doc-snippets]
timestamp: 2026-10-08
last_confirmed: 2026-10-08
triggers: [doc-snippets-skip, relative-import-doc-block, block-count-delta, import-style-enforcement]
---

# Why

`scripts/doc-snippets.ts` `EXTERNAL_IMPORT_RE` (`/^import\s[^"']*from\s+["'](?!@hellajs\/)[^"']+["']/`) exists to exempt config-example blocks importing real externals (vite/astro/express). Its negative lookahead only whitelists `@hellajs/*`, so a relative specifier like `'./styles'` — doc-internal notation a block uses for "comes from a shared module" — also matches, and `extractBlocks` then `continue`s past the whole block. Consequences:

- The violation is worse than a style breach: the block exits ALL strict-tier typechecking, so stale syntax (e.g. an `html` tagged literal in a `jsx` fence) survives green indefinitely — the guard never sees it.
- Conversely, rewriting such a block import-free does not just satisfy §Import Style; it ADDS the block to the checked set. The doc-snippets "checked N docs, M blocks" count increments (+1 in this run: 661 → 662) and the block must now pass strict TS — `btnClass`-style identifiers resolve via the doc-wide import/declaration union, so a shared-module binding declared in an earlier block of the same doc typechecks with no import line needed.

Detection: compare the block count across the edit (stash-swap re-run) — a delta means coverage changed, not just text.

# Evidence

- Source: `scripts/doc-snippets.ts` (EXTERNAL_IMPORT_RE at the constants block; `extractBlocks`' `imports.some((statement) => EXTERNAL_IMPORT_RE.test(statement))` skip; doc-wide union via `splitImports`/`mergeImports`).
- Empirical, 2026-10-08, worktree plans-css-audit-docs, unit `plans/css/audit/docs/01`: pre-fix `bun doc-snippets` printed "96 docs, 661 blocks"; post-fix (block 2 of css.mdx `### Separated CSS Authoring` rewritten import-free pure JSX) printed "96 docs, 662 blocks", strict tier clean — the new block is checked and passes (`<button class={btnClass}>Click</button>` resolves `btnClass` from block 1's `export const btnClass = style(...)` in the same doc).
