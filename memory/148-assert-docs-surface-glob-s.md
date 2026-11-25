---
title: Assert a docs-surface glob's file set; `**` without recursive=True skips depth-0 files like docs/index.mdx
description: "Python glob.glob('packages/*/docs/**/*.mdx') without recursive=True treats ** as *, so every packages/*/docs/index.mdx (depth 0) sits silently outside the probe, counter, and generator, and a baseline measured with the same glob cannot reveal the hole."
tags: [docs, probe, glob, recursive, index.mdx, sweep, plan]
confirmed: 2026-11-25
---
# Why

A docs sweep's probes (class counters, refiners, candidate generators) share one SURF glob. When it silently omits nine files, every count and every `files=0` DoD is true of a smaller corpus than the contract names: the index docs are never touched, and the plan's own baseline check cannot surface the gap because author and verifier ran the same glob.

# Evidence

`python3 -c "import glob; print(len(glob.glob('packages/*/docs/**/*.mdx')), len(glob.glob('packages/*/docs/**/*.mdx', recursive=True)))"` printed `183 192` (2026-11-25); the difference was exactly the nine `packages/*/docs/index.mdx` files. A bare `the portaled Toaster` on `packages/headless/docs/index.mdx` was a live identifier-in-prose hit the generator never listed, and `packages/css/docs/index.mdx` carried two re-links the counter never saw.
