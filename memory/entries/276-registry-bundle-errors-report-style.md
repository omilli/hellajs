---
type: decision
title: "Registry bundle errors report style-spliced line numbers, not source lines"
description: "babel/tsc failures under bun bundle ui quote the applyStyleVariant-spliced virtual file — resolve the failing construct by symbol search, never by source line number."
tags: [ui, registry, debugging]
timestamp: 2026-10-08
last_confirmed: 2026-10-08
triggers: [bundle-failure, registry, style-splice, babel-error]
---
# Why

`scripts/bundle/registry.ts` runs babel over the canonical AFTER `applyStyleVariant` splices the style module into the `@hella:styles` region (css ≈ +190 lines; tailwind inlines utility strings that lengthen lines massively), and the declaration gate runs tsc over the staged `.src/**` copies. Both stages therefore cite worktree-root-shaped paths (`/<wt>/command.tsx`) and line/column offsets that do not exist in `packages/ui/registry/<name>/<name>.tsx`. Chasing the printed line number costs multiple wasted reads (this session: a "'return' outside of function (900:2)" for a 716-line source that was really a doubled `};` from a partial edit).

# Evidence

`bun bundle ui` errors like `Build failed for ui: /…/command.tsx: 'return' outside of function. (900:2)` while `wc -l packages/ui/registry/command/command.tsx` = 716; the real defect located by `rg -n "props\." <file>` and a python brace-depth scan instead of the quoted offset. Diagnosis ritual: read the error's PHRASE (not line), `rg` the named construct in the canonical, `bunx tsc --ignoreConfig … <canonical>` for type errors (tsc DOES read the unspliced source), python brace-depth scan for structure breaks.
