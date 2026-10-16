---
title: "Vitest 5 coverage: include lists every matching file loaded or not"
description: Setting coverage.include makes the report list every file matching the globs (0% rows for unloaded ones — there is no coverage.all option in Vitest 5), so scope the include globs themselves to what the run measures; narrow js-only dist includes emit no lib placeholder keys at all.
tags: [discovery, vitest, coverage, vite-plus]
confirmed: 2026-10-16
---
# Why

Tuning the coverage gate's artifact set by widening/narrowing globs behaves differently from bun and from older Vitest docs: vitest 5.0.4 has no `coverage.all` option (removed from `CoverageOptions`; `--coverage.all=false` parses but is silently ignored), so any file matching `coverage.include` appears in the report even when never loaded — as an all-zero placeholder row. Consequence: scope a run by narrowing the include globs to the target workspace, never by post-filtering a wider table — sibling dists that test helpers load stay uninstrumented and absent from the report when the globs do not match them. Under the narrow js-only dist include set (`dist/*.js` + `dist/internal/*.js`) the earlier `lib/*.ts` placeholder-key emission no longer occurs (0 keys in summary and table); a broad `dist/**/*.{js,mjs}` include was what produced it, and it needed renderer-side filtering that no longer exists.

# Evidence

Probes run against vp test (vitest 5.0.4) in the vite-plus migration worktree, 2026-10-16: `--coverage.include=packages/*/dist/bundle.js` alone → exactly 8 rows (all packages' bundles, loaded or not); a broad `dist/**/*.{js,mjs}` include → 144 `lib/*.ts` keys, every one `lines.covered === 0` while its dist twin carried the real number, and `--coverage.exclude=packages/*/lib/**` left them present. Re-probed 2026-10-16 after the gate moved to stock text reporting with the narrow per-scope includes: scoped core and ui runs and the repo-wide set all show zero `/lib/` keys in the json-summary and the text table. Unloaded include-matches still render as 0% rows (observed: `plugins/astro/client.mjs` at 0% on a scoped astro run).
