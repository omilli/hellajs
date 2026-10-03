---
type: decision
title: Astro dynamic head CSS needs is:inline set:html, and cssText peeks per page
description: Per-page SSR demo CSS lands via `<style is:inline set:html={demoCss} />` in MainLayout's head; Astro strips is:inline in output, and cssText() is a peek so Astro's shared server process stays safe.
tags: [docs-site, astro, css]
timestamp: 2026-05-04
last_confirmed: 2026-05-04
triggers: [astro style tag, demo FOUC, cssText head, MainLayout demoCss, set:html]
---
# Why
The ui pages compute `const demoCss = cssText()` after their wrapper imports and
pass it to MainLayout, which conditionally renders the head style — that is the
FOUC fix the site-foundation rewrite must preserve. Two non-obvious mechanics:
without `is:inline`, Astro processes component `<style>` tags (bundled/scoped)
and a dynamic `set:html` style is not writable that way; `is:inline` emits it
verbatim, and Astro strips the attribute from dist HTML (probe the `<style>`
body, not the tag). `cssText()` is a peek, never a drain
(packages/css/lib/cssText.ts), so Astro's shared server process rendering many
pages cannot starve later pages; observed build output scoped each page's
inline style to its own wrappers' styles plus the token sheet — no cross-page
union.
# Evidence
docs build in the demo-pipeline worktree: `dist/ui/button/index.html` carries a
46KB head `<style>` (no `is:inline` attr in output) containing
`:root{--background:oklch…}` and `h-demo-stack`, with `astro-island` hydration
intact; cssText JSDoc states "A peek, never a drain". Build exit 0 over 181
pages.
