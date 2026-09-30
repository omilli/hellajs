---
type: fact
title: "import.meta.url in docs-site frontmatter code points at the bundled SSR chunk under astro build — anchor fs paths to process.cwd(), never the module URL"
description: "Astro frontmatter site code is bundled into SSR chunks; import.meta.url names the chunk's location, not the source — anchor docs/-relative paths to process.cwd() (always docs/ for astro commands)."
tags: [toolchain, docs-site, astro, vite-bundling, fs-paths]
timestamp: 2026-09-30
last_confirmed: 2026-09-30
triggers: [astro-frontmatter-paths, import-meta-url, ssr-chunk-location, docs-site-cache, anchor-fs-paths]
---
# Why

`docs/src/utils/highlight.ts` (shiki disk cache) first resolved its cache file via `join(dirname(fileURLToPath(import.meta.url)), "../../.cache/shiki.json")`. That is correct when the module executes from source (a `bun -e` probe wrote `docs/.cache/shiki.json` as expected) but wrong under `astro build`: Vite bundles frontmatter-imported site TS into the SSR prerender chunk, so `import.meta.url` names the chunk's location — the cache write landed somewhere ephemeral outside the tree (exhaustive `fd -H -t f shiki.json` over the worktree found nothing after two full builds; output was correct, the cache was silently never persisted). `process.cwd()` is the stable anchor: every sanctioned invocation — `astro dev`, `cd docs && bun run build`, `bun -e` probes — runs with cwd = `docs/` (root AGENTS.md §Scripts form), and cwd is independent of where the bundled chunk executes from. Breaks again if ignored: any future site-code feature that reads/writes project files from frontmatter (caches, generated-content reads) silently writes outside the repo under build while working fine under a source-mode probe.

# Evidence

2026-09-30, unit 02 of plans/docs/misc/install-sources-raw: `bun -e` probe importing `./src/utils/highlight.ts` created `docs/.cache/shiki.json` (source-mode `import.meta.url`); `rm -rf .cache` + `astro build` ×2 left zero `shiki.json` in the worktree (`fd -H -t f shiki.json` empty) with highlighted output still correct — the write went to the chunk's location. After switching to `join(process.cwd(), ".cache/shiki.json")`: cold build exit 0 wrote 363 entries, warm build exit 0 stayed at 363 entries (warm path served hits), `cmp` of `dist/ui/button/index.html` between builds exit 0.
