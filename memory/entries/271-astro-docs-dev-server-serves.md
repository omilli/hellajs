---
type: decision
title: "Astro docs dev server serves stale dist/registry to SSR after `bun bundle ui` — touch the demo/page sources or restart; client bundle updates immediately"
description: "If docs SSR HTML shows the pre-rebuild registry shape while hydration warns about markers/mismatches, the Vite dev server cached the old dist module — restart before debugging."
tags: [docs, tooling]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [docs-dev-server-stale-registry, vite-cache-dist-registry, ssr-html-stale-after-bundle]
---
# Why
`docs/src/pages/ui/*` islands import `@registry/*` (`packages/ui/dist/registry/*`). After a
rebuild, the browser module graph picks up the new dist but the dev server's SSR-rendered HTML can
stay on the cached old module — the page then hydrates NEW code against OLD server HTML and floods
"[dom] hydrate: expected reactive-region marker, not found" warns that look like a registry bug
but are pure cache skew. `touch docs/src/demos/<name>-demo.tsx docs/src/pages/ui/<name>.astro`
refreshed the page module but did NOT refresh the cached dist module — a dev-server restart (or
clearing docs' Vite cache) is the reliable fix.

# Evidence
2026-09-27: after `bun bundle ui` for the accordion arrow-slot fix, curl of `/ui/accordion` kept
returning the old no-marker trigger HTML while the client warned about missing markers; playwright
counts stayed wrong until the discrepancy was recognized as cache skew (verified correct via a
scratch ssr→hydrate bun test instead).
