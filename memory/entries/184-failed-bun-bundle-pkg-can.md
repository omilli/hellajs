---
type: decision
title: "A failed `bun bundle <pkg>` can leave dist/registry pruned; recover with `bun clean <pkg>` before rebuilding, and probe compiled-dist behavior by patching dist directly (bundle regenerates it)"
description: After a bundle failure, run `bun clean <pkg>` before rebuilding: a plain rebuild can report success while skipping pruned dist dirs, and compiled-dist probes are safe because bundle regenerates them.
tags: [testing, ui, build]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [failed-bundle, pruned-dist, clean-rebuild, compiled-dist-probe, discrimination-evidence]
---
# Why
`scripts/bundle/registry.ts` rm's the whole `dist/registry` tree before compiling, so a bundle run that fails mid-compile leaves it missing or partial; the next plain rebuild's `isCacheValid` check hashes only source files + git status (never dist) and the cached shortcut only requires `dist/bundle.js` to exist, so it can treat the damaged tree as current, printing "Successfully built" without restoring it — tests then fail with "Cannot find module '../../dist/registry/…'" and the failure reads as a source problem when the dist is simply gone. Recovery is `bun clean <pkg> && bun bundle <pkg>`. Related technique: for a discrimination probe (guides/tests.md: a bug-encoding scenario must FAIL against the pre-fix code), patch the COMPILED `dist/registry/**.js` directly (the hook/effect shape is plain JS there) instead of hand-editing canonical source — any bundle regenerates dist, so the probe leaves no residue. Editing canonicals with sed/python for a probe risks unmatched multi-line shapes and a broken compile.

# Evidence
- This session (2026-09-20, unit 03 of plans/ui/code/ui-shadcn-components): after two failed `bun bundle ui` runs, `bun bundle ui` printed "Successfully built ui" yet `packages/ui/dist/registry/native-select/` was absent; `bun test packages/ui/tests/native-select.test.ts` failed with "Cannot find module '../../dist/registry/native-select/css/native-select'". `bun clean ui && bun bundle ui --quiet` restored it and the suite ran.
- Discrimination probe on the same unit: stripping the `hooks: { afterMount: … }` block from `dist/registry/native-select/*/{native-select,native-select-html}.js` (python, exact-shape regex) made the new mid-list `value` test fail in all four flavors; restoring dist via clean+rebuild made all 46 pass.
