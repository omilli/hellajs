---
type: fact
title: Built dist HTML never contains import.meta.glob source paths — built-page rg DoDs target content markers
description: "Vite resolves eager import.meta.glob at build time: source paths never survive into dist HTML, so page-render rg DoDs must match runtime-surviving content, never source-path strings."
tags: [docs-site, vite, verification]
timestamp: 2026-10-02
last_confirmed: 2026-10-02
triggers: [built-page-grep, demo-pipeline, install-sources, verification-dod, import-meta-glob]
---
# Why

An eager `import.meta.glob` (with or without `query: "?raw"`) is resolved by Vite at build time into direct module imports; the glob's source paths exist only in source and intermediate transform output, never in `docs/dist/**` HTML. A built-page DoD shaped like `rg -c "<source path>" docs/dist/ui/<name>/index.html` is structurally unsatisfiable — it fails on every correct build, including unmodified baseline pages, and would send a worker chasing a nonexistent regression. When a DoD must prove a built page renders glob-fed content, match runtime-surviving strings: rendered element/attribute markers (`data-install`), user-visible copy, or content only the globbed modules can produce. Related but distinct: 167 (a wrong-hop glob silently matches zero files — pattern resolution), 226 (built-page greps false-positive on registry comments — content selection). This entry is the third leg: even a correct, populated glob leaves no path trace in output.

# Evidence

Verified 2026-10-02, worktree plans-docs-misc-demo-pipeline, unit 02 of plans/docs/misc/demo-pipeline: `rg -l "generated/install" docs/dist/` → 0 files (181 pages built, exit 0), while the same pattern matches in `docs/src/` (InstallSection.astro's four eager `?raw` globs). The intent "built page still renders install sources" verified via content markers on the same page: `rg -c "data-install"` = 6, `rg -c "add button"` = 2, inlined variant sources `rg -c "HellaChildren"` = 8 — identical to untouched `docs/dist/ui/dialog/index.html`. The vite transform filter (`plugins/vite/index.mjs` `id.endsWith(".tsx")`) also confirms `?raw` query ids bypass the hellajs transform, so raw-string modules are never JSX-compiled.
