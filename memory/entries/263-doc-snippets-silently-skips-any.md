---
type: fact
title: doc-snippets silently skips any fenced block importing a relative or other non-@hellajs specifier
description: >
  EXTERNAL_IMPORT_RE (scripts/doc-snippets.ts) skips whole blocks whose imports are not @hellajs/*, so tutorial error-set diffs can shrink or grow when relative imports (e.g. "../theme") are removed from code blocks, independent of type health.
tags: [doc-snippets, tutorials, verification]
timestamp: 2026-10-04
last_confirmed: 2026-10-04
triggers: [doc-snippets-error-set-diff, tutorial-typecheck-noise, relative-import-in-tutorial-block]
---

# Why

Tutorial-tier "zero NEW doc-snippets findings" comparisons (memory 080/113's error-set method) assume the checked-block set is stable. It is not: `extractBlocks` drops any block with an import matching `/^import\s[^"']*from\s+["'](?!@hellajs\/)[^"']+["']/`. Removing relative imports from a tutorial's blocks (e.g. deleting a shared `../theme` module) newly admits previously-skipped blocks into the concatenated module, surfacing duplicate-declaration findings (TS2451, and TS2393/TS2323 for repeated `export default function Name` declarations) that were always structurally present but never checked.

# Evidence

- scripts/doc-snippets.ts:81 `EXTERNAL_IMPORT_RE`; :221 the skip in `extractBlocks`; :330-331 export-bearing blocks hoist to module scope (collisions surface).
- astro-islands tutorial 2026-10-04: pre-edit run emitted only 3 blocks (plain Counter + two theme blocks — every component block imported "../theme" and was skipped, 6 findings); post-edit (co-located styles, only `@hellajs/*` imports) 6 blocks emitted, 18 findings, exit 0 strict-clean. Verified by swapping HEAD's tutorial in and inspecting `.doc-snippets/run-*/tutorial/` emitted modules.
