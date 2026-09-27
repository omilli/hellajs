---
type: decision
title: "Two @babel/types type instances exist under bun.lock — JSDoc params typed via @babel/core nominally reject top-level @babel/types test args (TS2345); typechecked tests pass babel.types"
description: Top-level @babel/types and the nested @types/babel__generator copy are distinct type instances; .ts tests calling plugin src functions pass babel.types, not the @babel/types import.
tags: [babel, toolchain, types]
timestamp: 2026-08-09
last_confirmed: 2026-08-09
triggers: [babel-types-instance-skew, jsdoc-tightening-ts2345, plugin-test-types-argument, babel-core-types-vs-babel-types]
---
# Why

Tightening `{any}` JSDoc in `plugins/babel/src` to the repo convention `@param {typeof import("@babel/core").types} t` makes repo-wide tsc (`bun lint`) reject test arguments built from `import types from "@babel/types"` — `@babel/core`'s types resolve through `@types/babel__generator`, which pins its OWN nested `@babel/types` (7.28.2) next to the hoisted top-level one (7.28.6); the two namespaces are structurally different versions, so the argument fails TS2345 ("Argument of type 'typeof .../@babel/types' is not assignable to parameter of type 'typeof .../@types/babel__generator/node_modules/@babel/types'"). Runtime is a single object — the nested copy is a `@types/` artifact with no code; `@babel/core`'s `.types` IS the top-level `@babel/types` — so swapping the test argument to `babel.types` is behavior-identical.

Recall this before: typing Babel `t` params in plugin JSDoc, writing `.ts` tests that call `plugins/babel/src` functions directly (getTagCallee, processAttributes, processComponentAttributes), or diagnosing TS2345 "two @babel/types" errors after a JSDoc-tightening pass. The skew exists in every checkout sharing `bun.lock` (main tree included) — it will resurface at merge if fixed only in a worktree.

# Evidence

- `node_modules/@babel/types/package.json` version 7.28.6; `node_modules/@types/babel__generator/node_modules/@babel/types/package.json` version 7.28.2 — verified in BOTH the worktree and the main tree (same `bun.lock`).
- Unit D run (plans/plugins/babel/code/audit-fixes): baseline `bun lint` red with 5x TS2345 at `getTagCallee(types, ...)` (tag-callee.test.ts) and `processComponentAttributes(types, ...)` (processor.test.ts); green after passing `babel.types` (both files already import `babel from "@babel/core"` or gained it).
- `tsconfig.lint.json` includes `plugins/*/src/**/*.mjs` (JSDoc consumed as types by `.ts` importers) and `plugins/*/tests/**/*.ts` (the only typechecked consumers).
