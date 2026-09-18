---
type: decision
title: "HellaJS monorepo convention — all cross-package HellaJS deps are peerDependencies with carets; devDependencies are null everywhere; css is the sole package with a runtime dep (csstype — see Evidence)"
description: "Monorepo: cross-package HellaJS RUNTIME deps are peerDependencies with carets; test-only cross-pkg deps are devDependencies workspace:* (dom→ssr, 169); css's csstype is the sole runtime dep."
tags: [arch, packaging, workspaces, config]
timestamp: 2026-09-18
last_confirmed: 2026-09-18
triggers: [add-dependency, cross-package-dep, devdependency, peerdependency, package-json-convention]
---
# Why

A plan proposing to declare a cross-pkg dep asserted "mirror the sibling convention (workspace:* or ^version)" — but the actual convention is peerDependencies-only. Recalling this prevents proposing `devDependencies`/`workspace:*` for a cross-pkg HellaJS dep (which would be the first such entry and break uniformity), and prevents a wasted round-trip discovering the convention at execution time. The convention is observed, not a stated rule in any guide/AGENTS.md — if a future task wants it enforced as a rule, that's a brain-feedback config proposal, not a memory fact.

Tension resolved 2026-09-18 (169): the convention has a slot for a TEST-only cross-pkg dep after all — `devDependencies` with `workspace:*`, first occupied by dom→ssr after bun's link-only-declared-edges behavior broke the undeclared arrangement. css's csstype is the sole legitimate runtime dep: `CSS.Properties` flows into the public `CSSObject` type shipped in `dist/types.d.ts`, so consumers need it resolvable to type-check `css({...})` — it must be an auto-installed dependency, not a devDep or peer (Evidence carries the full derivation).

# Evidence

- **css → csstype is the ONE legitimate runtime dep** (re-verified 2026-07-28): `packages/css/package.json` declares `dependencies: {"csstype":"^3.1.3"}`. NOT a convention violation — `import type * as CSS from "csstype"` (`lib/types.d.ts:1`) erases at runtime, but `CSS.Properties`/`CSS.AtRules`/`CSS.Pseudos` flow into the PUBLIC `CSSObject`/`CSSSelector` types (`types.d.ts:25,32`), re-exported via `export type * from "./types"` (`index.ts`) and shipped in `dist/types.d.ts` (verified present). Consumers need csstype resolvable to type-check `css({...})`, so it MUST be a `dependency` (auto-installed) — NOT `devDependency` (would break consumer type-checking) or `peerDependency` (forces manual install). `import type` is a runtime red herring; what matters is the public `.d.ts`.
- `jq -c '{devDependencies, peerDependencies}' packages/{router,ssr,css,store,resource,dom}/package.json` (2026-07-17) → every `devDependencies: null`; every cross-pkg dep under `peerDependencies` with a caret (ssr: `{"@hellajs/dom":"^1.4.2"}`; others: `{"@hellajs/core":"^1.0.6"}`).
- `rg '"@hellajs/' packages/*/package.json` → cross-pkg refs appear ONLY in the `name` and `peerDependencies` fields, never in `dependencies`/`devDependencies`.
