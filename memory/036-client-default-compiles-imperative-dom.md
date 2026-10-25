---
title: Client default compiles to imperative DOM emission; HellaNode is server-only currency
description: JSX client builds emit @hellajs/dom/runtime construction by default; mount/hydrate reject hand-built HellaNode input, and the AST survives only as the ssr/compiler contract.
tags: [babel, dom, ssr, hellanode, jsx, imperative, architecture, bench]
confirmed: 2026-10-23
---

# Why

Earlier attempts to ditch the HellaNode runtime (direct DOM-emission compile, then hoisted
shell templates with per-instance holes) were rejected on memory/cost grounds, and the
conclusion "the HellaNode is the runtime composition currency" hardened into a rule. The
imperative-client flip reverses it through a different mechanism than either rejected attempt: cached template
clones (one parsed prototype per static html string, `cloneNode(true)` per instance) plus
positional adoption for hydration — no per-instance shell allocation, no walker, and the
AST is no longer a runtime input at all. What broke the deadlock:

- The babel plugin's emission split became wrapper-owned per-environment config (vite
  resolves per build environment, rollup defaults `"dom"`, astro per Astro environment),
  dissolving the "no-options invariant conflicts with a dual target" objection.
- `@hellajs/ssr` keeps a pure HellaNode stringifier; the `"ast"` target is byte-identical,
  so the server pipeline is untouched.
- `mount`/`hydrate` accept flagged build fns only and throw on hand-built HellaNode input
  (`packages/dom/lib/mount.ts`, `packages/dom/lib/hydrate.ts`); hydration claims server
  nodes positionally through the construction calls themselves
  (`packages/dom/lib/internal/claims.ts`), preserving element identity.

The earlier rejections remain valid for THEIR mechanisms: do not re-propose per-instance
shell templates with holes (memory cost verdict stands). The imperative-client design differs (shared
template cache, no holes), and the flip decision supersedes the "keep the AST as runtime
currency" rule.

# Evidence

Source read 2026-10-23 (worktree on the imperative-migration set): `packages/dom/lib/runtime.ts`
(`template`/`fragment`/`mark`/`text`/`prop`/`child` compiler contract), `packages/dom/lib/mount.ts`
(hand-built rejection), `packages/dom/lib/internal/claims.ts` (positional claiming),
`plugins/babel/src/builders/imperative.mjs` (dom emission), `plugins/vite/index.mjs` +
`plugins/rollup/index.mjs` (flipped defaults). Verification: `packages/dom` suite 581/581,
babel suite 136/136, vite/rollup/astro suites green; `vp run em-dash` clean.
