---
type: decision
title: Plugin tests import babel plugin modules — never pass string plugin names, which resolve from process.cwd()
description: String plugin names in babel options resolve from process.cwd(); bun hoists workspace deps only under plugins/<p>/node_modules, so root-invoked tests fail — import the module.
tags: [plugins, testing, bun]
timestamp: 2026-09-18
last_confirmed: 2026-09-18
triggers: [cannot-find-module-plugin-syntax-jsx, babel-string-plugin-name, cwd-plugin-resolution, parse-sync-plugin-string, module-types-declaration]
---
# Why

`@babel/core` resolves string plugin/preset names against `dirname = context.cwd` (config-chain.js:58), and bun does not hoist workspace-only deps to the root `node_modules` — `@babel/plugin-syntax-jsx` exists only under `plugins/babel/node_modules`. So `plugins: ["@babel/plugin-syntax-jsx"]` works when cwd is `plugins/babel` but throws a misleading `ResolveMessage: Cannot find module ... from '.bun/@babel+core.../plugins.js'` when tests are invoked from the repo root (`bun test plugins/babel` — the standard and CI invocation). Passing the imported module object skips string resolution entirely, matching how `tests/helpers.ts` passes `babelHellaJS` and how `index.mjs` uses `inherits: jsxSyntax`.

# Evidence

- `node_modules/.bun/@babel+core@7.29.7*/node_modules/@babel/core/lib/config/config-chain.js:58` — `dirname: context.cwd`; root `node_modules/@babel/` holds only `core` + `preset-typescript`.
- Repro confirmed both ways this session: root cwd → ResolveMessage; `plugins/babel` cwd → pass. Fix (module import in `tests/tag-callee.test.ts`) verified: `bun test plugins/babel/tests` from root → 246 pass, 0 fail.
- The module has no type declarations and no `@types/babel__plugin-syntax-jsx` on npm (E404) — typed via ambient `declare module` as `import("@babel/core").PluginItem` in `plugins/babel/tests/module-types.d.ts`, picked up by the lint include glob `plugins/*/tests/**/*.ts`.
