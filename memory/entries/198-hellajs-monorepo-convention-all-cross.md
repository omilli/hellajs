---
type: correction
title: HellaJS monorepo convention — all cross-package HellaJS deps are peerDependencies with carets; runtime deps are named exceptions only (css→csstype types-only, ui→esbuild CLI-runtime); test-only cross-pkg devDeps are workspace:*
description: "Cross-pkg HellaJS deps are peerDependencies with carets; runtime deps only as codified exceptions (css→csstype, ui→esbuild); test-only devDeps are workspace:*; ui devDeps typecheck template code."
tags: [arch, packaging, workspaces, config]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [add-dependency, cross-package-dep, peerdependency, devdependency, package-json-convention]
supersedes: 023
---
# Why

The all-peer convention for `@hellajs/*` refs holds across every package (verified 2026-09-26), but entry 023's two absolute claims have been overtaken by the source and are now misleading: (1) "devDependencies are null everywhere" — besides the 023-era dom→ssr `workspace:*` test-only devDep, `packages/ui` now declares `clsx` + `tailwind-merge` devDeps (not imported by ui's own code; they exist so the lint program typechecks the copied `cn.ts` and style modules with real types — `checkPeers` demands them of the USER at add time; never promote them to peers). (2) "css is the sole package with a runtime dep" — `packages/ui` now has `esbuild` as a real runtime `dependency`: the published artifact IS the CLI (`bin/hellajs-ui.js` → `dist/index.js`), `stripTypes` calls esbuild's `transformSync` at add time, so a devDep would dangle for `bunx @hellajs/ui`. Both exceptions are no longer folk convention: `guides/code.md` (§Config, "No external runtime dependencies") codifies the rule and names both — csstype as the canonical type-only `dependency` (public `.d.ts` needs it resolvable), and a CLI-artifact package's real runtime dep. Recalling this prevents: proposing `devDependencies`/`workspace:*` for a cross-pkg HellaJS RUNTIME dep (breaks uniformity), "fixing" ui's undeclared-import shape by adding `@hellajs/*` dependencies (peers are convention-declared and functionally inert — `lib/` never imports them; bundle externals keep them external in `dist`), promoting clsx/tailwind-merge to peers, or demoting esbuild to a devDep.

# Evidence

- `jq -c '{dependencies, devDependencies, peerDependencies}' packages/*/package.json` (2026-09-26): core all null; css `dependencies:{"csstype":"^3.1.3"}` + peer `{"@hellajs/core":"^1.0.6"}`; dom peer core + devDep `{"@hellajs/ssr":"workspace:*"}`; resource/router/store peer core only; ssr peer `{"@hellajs/dom":"^1.4.2"}`; ui peers core/dom/css `^1.0.0` (css optional via `peerDependenciesMeta`) + `dependencies:{"esbuild":"^0.27.2"}` + devDeps `{"clsx":"^2.1.1","tailwind-merge":"^3.7.0"}`. `rg '"@hellajs/' packages/*/package.json` shows cross-pkg refs only under `name`/`peerDependencies`/devDep — never in `dependencies`.
- css→csstype is types-only but public: `import type * as CSS from "csstype"` (`packages/css/lib/types.d.ts:1`); `CSS.Properties` in the public `CSSObject` mapped type (`types.d.ts:32`), `CSS.AtRules`/`CSS.Pseudos` in `CSSSelector` (`types.d.ts:22-23`); `export type * from "./types"` (`lib/index.ts:14`); csstype refs present in shipped `dist/types.d.ts` — consumers need it resolvable, so it must auto-install.
- ui→esbuild is runtime code: `import { transformSync } from "esbuild"` (`packages/ui/lib/internal/strip.ts:1`); rationale `packages/ui/AGENTS.md` §gotchas ("`esbuild` is the package's first and only runtime `dependency`"; "`clsx`/`tailwind-merge` are devDependencies, not peers"; "Peers are convention-declared, functionally inert").
- Rule now codified: `guides/code.md` "No external runtime dependencies" — exceptions: type-only deps backing public `.d.ts` (csstype canonical) and CLI-artifact packages' real runtime deps (ui's esbuild). 023's "not a stated rule in any guide" is obsolete.
