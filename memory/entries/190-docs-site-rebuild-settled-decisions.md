---
type: decision
title: Docs-site rebuild settled decisions — dist/registry demo islands, dogfooded dark-only chrome, static cssText head, URL map holds
description: Docs rebuild contract — demos import dist/registry via client:load (vendoring dies), chrome dogfoods registry+css with the ported palette (dark-only, no toggle), SSR cssText head, URLs unchanged.
tags: [docs-site, arch]
timestamp: 2026-02-14
last_confirmed: 2026-02-14
triggers: [docs-site rebuild, dist/registry, demo islands, chrome dogfood, cssText head, palette port, dark-only]
---
# Why
User-directed `idea` session (2026-02-14), recorded because plan files are never committed (merge contract) and these decisions govern a multi-slice rebuild:
1. **Demos import `packages/ui/dist/registry/<name>/css/*`** through a `@registry/*` alias under `astro-plugin-hellajs` `client:load` wrapper islands — not vendored `add` output, not canonicals (canonicals carry `declare const` style placeholders and cannot run un-spliced; verified `registry/button/button-html.ts`). Kills vendoring, the `add --dir docs` sync, drift guard, `hella.ui.json`; `install-sources` gains a 4th variant (css-html) replacing the vendored `?raw`.
2. **Full dogfood, zero tailwind** — chrome from registry components, prose from `@hellajs/css`; tailwind/daisyUI/typography exit atomically last (13 live `alert alert-*` class attrs across 11 package-docs/tutorial files are the entire live content blast radius — verified by fence-stripped probe).
3. **Palette continuity, dark-only** — current palette (global.css `:root`: `#38EBFF` primary, `hsl(222.2 47.4% …)` navy bases, Mulish) ports onto the hella token names; NO light/dark toggle ever; registry runs on `tokens.dark.js`.
4. **URL map holds** — learn/reference/ui/plugins slugs unchanged (inbound links survive).
5. **Chrome styles = static `cssText()` head** — SSR ships styled, zero flash; "On This Page" TOC is server-rendered (today's MainLayout client-side "minimal headings extractor" script is the flash root cause).
6. **Thin slices with user merge gates** — nothing ported uncritically; each plan slice carries "Design decisions — surface before building" and the worker presents forks before implementing (explicit user directive).

# Evidence
Session source reads: `plugins/astro/AGENTS.md` (renderer contract, exclusive-use, `client:*` hydration), `plugins/vite/index.mjs` (extension filter skips `.astro`/`.mdx`), `packages/ui/AGENTS.md` (dist/registry byte-faithful claim; marker placeholders), `docs/src/global.css` (`:root` palette), `docs/src/layouts/MainLayout.astro` (client TOC extractor). Plan sets: `plans/docs/misc/demo-pipeline/` (worker batch) + `plans/docs/misc/site-foundation/` (manual, one unit per instance with review between) — ephemeral per merge contract; this entry is the durable record.
