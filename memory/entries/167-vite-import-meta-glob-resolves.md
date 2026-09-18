---
type: decision
title: Vite import.meta.glob resolves relative patterns against the module path, empty in mis-pathed astro virtual modules
description: In .astro frontmatter and script blocks, a relative glob pattern must count hops from the file's own directory; a wrong hop compiles silently to an empty object, never an error.
tags: [astro, vite, docs-site]
timestamp: 2026-09-17
last_confirmed: 2026-09-17
triggers: [import-meta-glob, astro-component, demo-glob, docs-site, empty-object]
---
# Why

`import.meta.glob` is resolved by Vite at transform time against the importing module's path. In Astro components both the frontmatter and the compiled `<script>` behave this way, and a pattern that climbs the wrong number of directories matches zero files WITHOUT failing the build or the dev server: the compiled output is `const demos = /* #__PURE__ */ Object.assign({})`, the page renders with empty markup and an empty `cssText()`-style collection, and nothing in the build log points at the glob. Always verify a new glob by fetching the transformed module in dev (`curl 'http://localhost:<port>/src/components/X.astro?astro&type=script&index=0&lang.ts'`) and checking the compiled `Object.assign` is populated, or by grepping the built HTML for content only the glob's modules can produce. Count hops from the importing FILE's directory (`docs/src/components/Demo.astro` + `../demos/*.ts` reaches `docs/src/demos/`; `../..` escapes to `docs/`).

# Evidence

Session 2026-09-17, unit 12 (`plans/ui/code/hellajs-ui/12-ui-demos-html-runtime.md`): `Demo.astro` with `import.meta.glob("../../demos/*.ts")` built green but every demo page shipped empty markup and `<style></style>`; the dev-transformed script module showed `const demos = /* #__PURE__ */ Object.assign({})`. Correcting to `../demos/*.ts` populated the glob; `cd docs && bun run build` then carried ssr'd markup + the inlined `@layer hella` sheet on all five `/components/*` pages, and the 10-check Playwright probe passed.
