---
title: ssr lib comments cite ssr test files with stale .ts extensions
description: The parity-invariant comments in packages/ssr/lib (ssr.ts, internal/walk.ts, ssrStream.ts) cite tests/helpers.ts and tests/*-*.test.ts without the x; every ssr test fixture is .tsx, so a fix sweep must cover lib comments, not just ssr-comparison.md.
tags: [ssr, docs-drift, citations, parity-comments, audit-docs]
confirmed: 2026-11-03
---
# Why

The ssr package's stale test-citation drift lives in two surfaces, and fixing only the user-facing one leaves the agent-facing half rotten: `ssr-comparison.md` cites `tests/helpers.ts` / `tests/ssr-async.test.ts` / `tests/hydrate-integration.test.ts` (actual files all `.tsx`), while the SAME stale paths sit inside parity-invariant comments in `lib/` source. The lib copies are out of audit-docs scope (source files belong to audit-code) and so survive any docs-only citation fix; an agent later "confirming" the parity contract from the comment walks to a nonexistent `tests/helpers.ts`.

# Evidence

Probe 2026-11-03: `rg -o 'tests/[A-Za-z0-9.-]+\.tsx?' packages/ssr/lib | sort | uniq -c` shows 7 stale `.ts` citations across 3 files: `lib/ssr.ts` (parity comment: `tests/ssr-async.test.ts`, `tests/ssr-stream.test.ts`, `tests/helpers.ts`), `lib/internal/walk.ts` (same trio in the mirrored comment), `lib/ssrStream.ts` (`tests/ssr-suspense.test.ts`). Actual fixtures: `fd -e tsx . packages/ssr/tests` — `helpers.tsx`, `ssr-async.test.tsx`, `ssr-stream.test.tsx`, `ssr-suspense.test.tsx`; no `.ts` test files exist. Detection pattern (the naive `[a-z-]+\.ts` misses `.test.ts` paths): `rg -n 'tests/[A-Za-z0-9.-]+\.ts([^xA-Za-z0-9-]|$)'`.
