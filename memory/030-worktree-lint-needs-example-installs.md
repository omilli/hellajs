---
title: Worktree lint needs standalone installs for ssr examples; seed covers root only
description: `vp run lint` inside a component worktree fails typechecking examples/ssr-islands and examples/ssr-routing (`Cannot find module 'hono'`) until `npm install` runs inside each example dir — the worktree seed's install covers the root workspace only.
tags: [worktree, lint, bootstrap, examples, ssr]
confirmed: 2026-10-21
---

# Why

The plans-core-code-alien-signals-rebase worktree (seeded via
`.agents/skills/worker/scripts/worktree.mjs new`) failed `vp run lint` with
`typescript(TS2307): Cannot find module 'hono' / '@hono/node-server'` in
`examples/ssr-islands/src/server.tsx` and `examples/ssr-routing/src/server.tsx`. The examples
are not root workspaces: they install standalone with committed lockfiles, and hono lives in
their own node_modules, which the seed does not create.

# Fact

When a worktree run's gate includes `vp run lint` (or anything typechecking the examples),
run `npm install` inside `examples/ssr-islands` and `examples/ssr-routing` (and any other
example the lint include reaches) before the first lint. The installs are pure restores —
committed lockfiles unchanged, zero git delta. Same class as the docs/ bootstrap rule in the
worker skill; examples were just not on its derived green-set list.
