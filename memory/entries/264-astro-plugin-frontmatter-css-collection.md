---
type: fact
title: astro-plugin frontmatter CSS collection reaches only server-graph islands, never client:only ones
description: >
  Build-time style()/css() collection starts from the compiled .astro server module's imports, so only islands the server renders contribute classes to the page CSS; client:only islands' style() calls register at runtime in their client bundles.
tags: [astro-plugin, css, islands]
timestamp: 2026-10-04
last_confirmed: 2026-10-04
triggers: [astro-frontmatter-css, island-style-not-collected, client-only-style-runtime]
---

# Why

A shared theme module previously masked this: one server-rendered island importing it dragged every island's style() call into the collected page CSS. With styles co-located in each island module, only the server-rendered islands' classes fold into the page's style tag; `client:only` islands never join the compiled server module, so their rules ship only inside their client bundles and register on load. Docs and plans claiming "island classes are collected from the import graph" must scope that claim to server-rendered islands.

# Evidence

- plugins/astro/evaluate.mjs `extractFrontmatter` + `evaluateImports`: traversal starts at the compiled `.astro` module (enforce "post"), following its relative imports in order (imports evaluate before the page body — collected class precedes frontmatter rules).
- examples/astro-islands built 2026-10-04: dist/index.html splits by channel — the page's `<style id="hella-css">` (first in head, the element hydration adopts) carries the import-graph island classes; Astro's anonymous pipeline `<style>` carries only the page's frontmatter rules (body/#name-input/#greeting). Built from the shared-theme shape the tag carries all three theme classes; with styles co-located per island (uncommitted WIP shape) only `.h-counter-btn-aiytbh` rides the tag and the `tracker`/`note` hashes exist only inside `dist/_astro/*.js` client bundles.
