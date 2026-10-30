---
title: Never create a test file whose basename collides with an existing test file
description: A new spec whose basename duplicates an existing spec (slider.test.tsx beside slider.test.ts) makes tsgolint report a misleading TS2307 on the new file's first @utils import; the fix is removing one of the two files, and a log with only formatting issues never reached type-checking.
tags: [tsgolint, typecheck, tests, vite-plus, diagnostics, TS2307, basename-collision]
confirmed: 2026-02-27
---
# Why

tsgolint's program breaks module resolution for one of two same-basename spec files, and the surfacing diagnostic is a lie: `TS2307: Cannot find module '@utils/test-helpers.js'` anchored at the new file's import line. Chasing it as a paths/tsconfig problem costs ~20 wasted probe round-trips; the actual fix is deleting one of the colliding files. Two related traps while diagnosing: (1) `vp check` runs formatting BEFORE type-checking, so any run whose log shows only formatting issues never type-checked anything — such a run is not evidence of a clean type-check; (2) when test inventorying, never list with a truncated `ls | head -N` — an alphabetically-cut listing hid an existing `slider.test.ts` and caused the collision in the first place (`fd '<surface>.test'` over all packages is the safe probe).

# Evidence

Reproduced 2026-02-27 in packages/ui/tests: adding `slider.test.tsx` beside the tracked `slider.test.ts` made `vp run lint` fail with exactly one error, `TS2307` at the `.tsx` file's line-2 `@utils/test-helpers.js` import — while byte-identical imports in every sibling spec type-checked clean, and reducing the new file to bare imports still reproduced. `rm packages/ui/tests/slider.test.tsx` → `vp check` exit 0 (`Found 0 errors`), reproducible across runs. The `Found N errors` summary lines anchor per-file and give no dedup/grouping hint toward the basename clash.
