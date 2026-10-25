---
title: Import dom dist internals via the dist-less subpath
description: The dom package exports map "./*": "./dist/*.js" means @hellajs/dom/dist/internal/x.js double-maps to dist/dist/x.js.js (ENOENT) — the working specifier is @hellajs/dom/internal/x (no dist segment; drop the .js extension for bundler chains).
tags: [dom, imports, exports, subpath, dist]
confirmed: 2026-10-22
---
# Why

`packages/dom/package.json` declares `"./*": { "import": "./dist/*.js" }` alongside `"."` and `"./bundle"`. The `*` capture includes any `dist/` segment in the specifier, so `@hellajs/dom/dist/internal/tmpl.js` resolves to `./dist/dist/internal/tmpl.js.js` — a doubled path that exists nowhere. The intended form omits `dist`: `@hellajs/dom/internal/tmpl.js` → `./dist/internal/tmpl.js`. In rollup chains that append extensions to extensionless module requests (e.g. the bench example's typescript+node-resolve pair), the extensionless form `@hellajs/dom/internal/tmpl` is the most robust — both exports-map and legacy path resolution converge on `dist/internal/tmpl.js`.

# Evidence

`packages/dom/package.json` exports map (read 2026-10-22); rollup build of `examples/bench` failed with `Could not load packages/dom/dist/dist/internal/tmpl.js.js (imported by src/row-slots.ts): ENOENT` for the dist-prefixed specifier and `dist/internal/tmpl.js.js` for the dist-less-but-.js-suffixed one; the extensionless dist-less form built clean (`dist/main.js` created, bench run exit 0).
