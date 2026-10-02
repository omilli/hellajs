---
type: decision
title: Identify and kill stale port-3000 listeners before example smoke tests
description: A leftover port-3000 listener from a prior unit's smoke test crashes the new server (EADDRINUSE) and curls hit the wrong app — check `ss -tlnp` ownership, kill the stale pid, keep assertions strict.
tags: [verification, examples]
timestamp: 2026-10-02
last_confirmed: 2026-10-02
triggers: [example-smoke-test, port-collision, hono-node-server, stale-listener]
---
# Why

Every `examples/*` smoke test serves on port 3000, and plan units run sequentially in shared worktrees — a prior unit's un-killed `node src/server.js` survives into the next unit. The new server then dies with `EADDRINUSE :::3000` while the backgrounded launch looks fine, and the curls execute against the STALE server: a lax check (e.g. `rg -q 'id="app"'` alone) can tick green against the wrong app. The fix ritual: `ss -tlnp | rg ':3000'` → read the pid's `/proc/<pid>/cmdline` and `cwd` to confirm it is a leftover example server (not a user process) → `kill <pid>` → re-run the smoke test. Only kill what you started or what provably belongs to a completed unit's smoke test; anything else is an operator question.

# Evidence

Unit 02 of plans/ssr/docs/hono-node-servers (ssr-routing Hono port), 2026-10-02: first smoke run exited 1 with no output; `/tmp/u02-server.log` showed `Error: listen EADDRINUSE ... port 3000`; `ss -tlnp` + `/proc/42948/cmdline` (`node src/server.js`, cwd `examples/ssr-islands`) identified a stale unit-01 server started at 11:36. After `kill 42948` the full smoke test passed all four checks; `<title>SSR Routing</title>` had correctly failed against the islands server, so no false tick landed.
