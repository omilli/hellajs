---
type: correction
title: "bun -e children reading Bun.stdin.stream() never exit while the parent holds the pipe open - use process.stdin.once + process.exit"
description: "A bun child whose stdin pipe stays open hangs forever reading Bun.stdin.stream(); use process.stdin.once(\"data\") plus an explicit process.exit(0)."
tags: [arch, bun, spawn, daemon]
timestamp: 2026-09-11
last_confirmed: 2026-09-11
triggers: [supervised-child, bun-spawn-stdin, stdin-pipe-open, echo-child-script]
---
# Why

`Bun.stdin.stream()` registers a live read on stdin that holds the child's event loop open as long as the pipe has not reached EOF. A supervisor (`RunSupervisor`, `PiRpc`-style drivers) keeps `stdin: "pipe"` open across the child's life so it can write later lines, so the stream never ends and a child that finished its script still never exits — `proc.exited` never resolves, exit callbacks never fire, and watchers time out. `process.stdin.once("data", ...)` fires per line without holding a pending stream read, and the explicit `process.exit(0)` guarantees exit regardless of any held handle.

# Evidence

Verified 2026-09-11 building `scripts/remote/probe.ts` (remote-control daemon set):
- Hanging form (parent holds pipe, writes after 500ms, reads child output): child prints marker + echo but `proc.exited` never resolves, parent killed by timeout — `bun -e` driver with `Bun.spawn([...], { stdin: "pipe", stdout: "pipe", stderr: "pipe" })` and child `'const c = await Bun.stdin.stream().getReader().read(); console.log(...)'`.
- Working form: child `'process.stdin.once("data", (chunk) => { console.log("E:" + chunk.toString().trim()); process.exit(0); })'` exits with code 0 under the same held-open pipe.
- `bun remote --probe` passed only after this switch (first run failed with `no exited frame with code 0 within 15000ms`).
- Contrast: with an EOF-ing parent (`echo ping | bun -e ...`) the `Bun.stdin.stream()` form exits fine — the hang needs the open pipe, which is exactly the supervision case.
