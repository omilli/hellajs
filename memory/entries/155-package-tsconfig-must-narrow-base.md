---
type: correction
title: "A package tsconfig must not narrow the base `types` array — the per-package declaration build (tsc --project) needs base's node/bun types, and registry typechecking in tsconfig.lint.json covers style modules only (canonicals are splice templates gated by the compile step's .d.ts)"
description: Overriding `types` in a package tsconfig drops base's `["node", "bun"]` and breaks `buildDeclarations` with TS2591 on `node:` imports; keep package tsconfigs extends+rootDir+include.
tags: [arch, tooling, typescript]
timestamp: 2026-09-17
last_confirmed: 2026-09-17
triggers: [ts2591-node-types, package-tsconfig-shape, declaration-build, types-array-override]
---
# Why

`scripts/bundle/declarations.ts` runs `bunx tsc --project <pkg>/tsconfig.json --emitDeclarationOnly` for every package. `compilerOptions.types` REPLACES the inherited array rather than extending it, so a package-level override that names anything but `node`/`bun` removes the global node type inclusion and every `import ... from "node:fs"` in lib fails TS2591 ("Cannot find name 'node:fs'"). The override is also misconceived for the ui package: the registry `.d.ts` splice gate runs `tsc` over staged files with `--ignoreConfig` + explicit flags (scripts/bundle/registry.ts), which never reads the package tsconfig. In-repo registry typechecking is owned by `tsconfig.lint.json` (`jsx: "preserve"` + registry includes) — since the style-module rework that covers STYLE MODULES + `cn.ts` + `tokens.js` only; the canonicals (`<name>.tsx`, `<name>-html.ts`) are splice templates referencing injection-injected names and are excluded from the lint program (eslint mirrors), their gate being the compile step's `.d.ts` emission over spliced variants. The breaking edit landed AFTER the unit's last green gate (dist mtime 21:25 vs tsconfig 21:28) — a late config tweak that skipped re-verification; a green baseline caught it at the next unit.

Recall when: a package build fails TS2591/TS2339 on node builtins, adding `types`/`jsx` to a package tsconfig "for the registry", or diagnosing a baseline that is red before any new edits.

# Evidence

- Red: `bun coverage ui` → `bunx tsc --project packages/ui/tsconfig.json --emitDeclarationOnly --outDir packages/ui/dist` fails TS2591 ×14 + TS2339 (`import.meta.dir`), packages/ui untracked so no VCS history; mtimes show tsconfig.json (21:28:38) postdates the last green dist/index.d.ts (21:25:13).
- Sibling shape: dom/css/router/primitives package tsconfigs are exactly `{extends, rootDir, include}` — no `types`, no `jsx`.
- Green: rewrote packages/ui/tsconfig.json to the sibling shape → `bunx tsc --project ... --emitDeclarationOnly --outDir packages/ui/dist` exit 0 emitting flat `dist/index.d.ts`; full `bun coverage ui` exit 0 (61 pass / 0 fail).
- Style-module rework (2026-09-17): `tsconfig.lint.json` excludes `packages/ui/registry/**/*-html.ts` + drops the `**/*.tsx` include; eslint ignores the same canonical globs; `bun coverage ui` + full `bun lint` exit 0 with canonical typechecking carried by `dist/registry` `.d.ts` emission.
