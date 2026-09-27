---
type: correction
title: Pass babel.types (from @babel/core) into plugins/babel JSDoc t params — a direct @babel/types default import still fails TS2741/TS2345, structurally, not from instance skew
description: Test args to plugins/babel JSDoc t params must be babel.types; a direct @babel/types default import fails TS2741/TS2345 — structural namespace mismatch, not the old instance skew.
tags: [babel, toolchain, types]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [babel-types-jsdoc-param, plugin-test-types-argument, ts2345-babel-namespace, ts2741-default-property]
supersedes: 110
---
# Why

`plugins/babel/src` types every `t` param as `@param {typeof import("@babel/core").types} t` (repo convention; the guides are silent on it). That type resolves through `@types/babel__core` → `@types/babel__generator`, whose `index.d.ts` opens with `import * as t from "@babel/types"` — so the param type is the FULL module namespace of `@babel/types`, including its `default` export. A test argument built from `import types from "@babel/types"` is the default-export value and lacks `default`, so TS2741/TS2345 reject it — a structural namespace mismatch, not the two-instance version skew entry 110 described. Superseded facts: bun.lock now pins a single `@babel/types@7.29.8`, and under bun's isolated linker every resolution chain (`@babel/core`'s types via `@types/babel__generator`, direct test imports) realpaths to the same `node_modules/.bun/@babel+types@7.29.8` store entry — the 7.28.2-nested-vs-7.28.6-hoisted skew cannot recur while this lock holds. The prescription survives unchanged: pass `babel.types` from `@babel/core` (existing tests already do); keep direct `@babel/types` imports for assertions only.

# Evidence

- Probe (temp `plugins/babel/tests/skew-probe.ts`, removed after the run): `bun x tsc -p tsconfig.lint.json --noEmit` → `error TS2741: Property 'default' is missing in type 'typeof import(".../node_modules/.bun/@babel+types@7.29.8/node_modules/@babel/types/lib/index")' but required in type 'typeof babel.types'` plus TS2345 at `getTagCallee(types, ...)` — both error sides cite the SAME 7.29.8 store path (2026-09-26).
- `rg -o '"@babel/types@[^"]*"' bun.lock` → single `"@babel/types@7.29.8"`; `node_modules/.bun/@types+babel__generator@7.27.0/node_modules/@babel/types` is a symlink into that same store entry; `@types/babel__generator/index.d.ts:1` is `import * as t from "@babel/types"`.
- Convention sites: `plugins/babel/src/utils/babel.mjs:5` plus 10+ siblings (`builders/ast.mjs`, `builders/component.mjs`, `builders/vnode.mjs`, `transformers/component.mjs`, `processors/*.mjs`); tests pass `babel.types` (`plugins/babel/tests/tag-callee.test.ts:28`, `processor.test.ts:222`) and use the direct `types` import only for assertions (`tag-callee.test.ts:29`).
- `tsconfig.lint.json` still includes `plugins/*/src/**/*.mjs` and `plugins/*/tests/**/*.ts`.
