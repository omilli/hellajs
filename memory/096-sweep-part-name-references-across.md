---
title: Sweep part-name references across four sites beyond the plan files
description: Registry part-removal work must also delete stale assertions in add.test.ts and compile.test.ts and reword Tabs-style prose examples in the package AGENTS.md and cli.mdx; part-name rg sweeps cannot demand exit 1 because `<XContent />` mdx section tags keep the name.
tags: [ui, registry, parts, sweep, blast-radius, stale-assertions]
confirmed: 2026-10-31
---
# Why

A registry part removal that edits only the canonical, tests, and docs pages still goes red: the add-CLI and compile-shape tests assert the removed exports exist, and prose examples name them. Missing these sites means a failed coverage gate mid-unit and an unsatisfiable sweep DoD; knowing the full site list up front turns the removal into one pass.

# Evidence

Removing the tabs parts (`packages/ui/registry/tabs/tabs.tsx`, 2026-10-31) required four edits outside the canonical/tests/docs Files: `packages/ui/tests/add.test.ts` (tabs dropped from both multi-part add tests, stale `cn(...)`/`[part, cls]` assertions deleted), `packages/ui/tests/compile.test.ts` (tabs dropped from the multi-part artifact loop), `packages/ui/AGENTS.md` (pass-through example enumeration), `packages/ui/docs/concepts/cli.mdx` (keyed-map example) — `vp run coverage ui` failed on the first two until fixed. The precedent is the merged accordion unit (commit feb085fe): same extra-file shape, and its merged state keeps `AccordionContent` in `docs/src/pages/ui/accordion.astro` and `docs/src/pages/headless/accordion.mdx` — the mechanical `<XContent />` mdx section-tag convention (every page under `docs/src/pages/ui/` names its docs import `<PascalName>Content`), so `rg '<Part>...' packages/ui docs/src` exits 0 with those tags even on a complete sweep; the honest sweep evidence is zero matches outside those tag lines.
