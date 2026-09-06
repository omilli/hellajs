---
type: decision
title: tsconfig.lint.json has an explicit include list — a new .ts outside its globs silently skips bun lint's typecheck gate
description: "tsc in `bun lint` checks only tsconfig.lint.json's include globs — a new .ts under .agents/ (or any uncovered path) passes lint untypechecked; add its path to include or the gate is vacuous."
tags: [tooling, lint, config]
timestamp: 2026-09-06
last_confirmed: 2026-09-06
triggers: [tsconfig-include, agents-ts-script, lint-typecheck-skip, new-skill-script]
---
# Why

The include list is allow-by-glob: `packages/*/lib|tests`, `plugins/*/src|tests|index.d.ts`, `scripts/**`, `utils/**`, `commitlint.config.ts` are enumerated; `.agents/**` is not. eslint ignores `.agents/**` by design (eslint.config.mjs), so tsc is the ONLY lint surface a skill script has — a `.ts` file not in `include` gets zero static checking while every gate reads green (`bun lint` exits 0 without ever opening the file). Unit 02's plan premise asserted tsc "has no include/exclude and DOES sweep `.agents/**`" — false at authoring time, and the DoD would have been vacuously satisfied had the include line not been added.

# Evidence

- `tsconfig.lint.json` `include` array (10 globs; `".agents/skills/memory/memory.ts"` appended 2026-09-06, plan `plans/root/config/memory-optimization/02-bun-port-migration.md` port task).
- `package.json` `"lint": "tsc -p tsconfig.lint.json --noEmit && eslint . && bun lint:guards"` — the tsc stage is project-scoped, not tree-wide.
- `eslint.config.mjs` global `ignores: [".agents/**", ...]`.
- Post-include `bun lint` exit 0 with `memory.ts` typechecked under `strict` + `noUncheckedIndexedAccess`.
