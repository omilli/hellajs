---
title: Import-map @hellajs/core when a browser page loads dom dist
description: A static page importing packages/dom/dist modules must map "@hellajs/core" to "/packages/core/dist/index.js" via an import map and be served from the repo root.
tags: [profiler, dist, importmap, playwright, chrome, perf]
confirmed: 2026-10-17
---
# Why

The dist bundles treat `@hellajs/core` as an external bare specifier — `packages/dom/dist/internal/core.js` re-exports from `"@hellajs/core"`, which no browser can resolve. A scratch profiler page importing dom dist fails with `Failed to resolve module specifier "@hellajs/core"` (or silently times out waiting for the module graph). Core's own dist is self-contained (zero external imports), so mapping the specifier there completes the graph.

# Evidence

`rg -l 'from "@hellajs/core"' packages/dom/dist/` → `bundle.js`, `internal/core.js`; `rg -n 'from "[^./]' packages/core/dist/index.js` → no matches (self-contained). Working setup (verified 2026-10-17, Chrome 155.0.8059.79 headless): serve the repo root over http, page head carries `<script type="importmap">{"imports":{"@hellajs/core":"/packages/core/dist/index.js"}}</script>`, module script imports `/packages/dom/dist/index.js` plus the `dist/internal/*.js` modules it needs (same module instances as the barrel, since URLs match).
