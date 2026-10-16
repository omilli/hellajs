---
title: npm install standalone examples before vp lint type-checks them
description: "examples/** sits inside the vp lint type-check surface; a fresh clone or worktree needs `npm install` inside each standalone example or `vp run lint` fails on their unresolvable imports."
tags: [examples, npm, vp-lint, typecheck, worktree, install]
confirmed: 2026-10-16
---
# Why

`typeCheck: true` in the root `vite.config.ts` lint block makes `vp check` type-check `examples/**` — files the old tsc lint gate never covered. Examples are NOT root workspaces: each installs standalone from its committed `package-lock.json` (npm canonical since the de-bun; root `workspaces` = `packages/*, plugins/*`), so a fresh clone (CI, component worktrees — the root seed install does not reach them) leaves `hono`/`@hono/node-server` etc. unresolvable and the gate red with TS2307/TS7006. Run `npm install` inside the failing example dirs; the committed locks make it deterministic. Never install `@hellajs/*` inside an example — it would shadow the root-walk-up links with stale registry copies.

Note the shape: `examples/ssr-islands` and `examples/ssr-routing` ship no tsconfig of their own (five of seven siblings do), so tsgolint discovers the root `tsconfig.json` for their files — root strict + `noUncheckedIndexedAccess` apply, and index-signature param access needs `!` where the router guarantees the param.

# Evidence

Post-de-bun state (2026-10-16): `fd package-lock.json` → root + docs + all 9 examples, `fd bun.lock` → 0; `npm install` inside `examples/counter` exit 0 with `@hellajs/*` resolving via root walk-up. The pre-npm era of this fact (bun install + `bun.lock`) is gone; the type-check surface and the standalone-install requirement are unchanged.
