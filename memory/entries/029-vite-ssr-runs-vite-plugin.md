---
type: decision
title: "Vite SSR runs vite-plugin-hellajs on the server entry — ssrLoadModule('/src/server.tsx') transforms server-side JSX to HellaNode; a configureServer middleware streams the SSR HTML"
description: vite-plugin-hellajs transforms the Vite SSR pipeline too — ssrLoadModule of a .tsx server entry yields HellaNode JSX; a configureServer middleware streams it, dodging Bun's React JSX runtime.
tags: [arch, ssr, dom, jsx, vite, plugin]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [vite-ssr, jsx-server-entry, ssrloadmodule, vite-plugin-server, configure-server-ssr]
---

> **Naming superseded 2026-08-22 (entry 045):** `ssrAsync`→`ssr.async`, `ssrStream`→`ssr.stream`, `docStream`→`doc` (stream overload) — the old names below are the pre-v2 API, kept for history.

# Why

The documented SSR precedent (the SSR sections of `packages/router/docs/patterns/routing.mdx`, merged 2026-09-09 from `routing-ssr.mdx`; no separate wrapper) uses
`html` + `Bun.serve` — the `html\`\` parser is DOM-free and runs at runtime, so the server entry
needs NO build plugin. But a JSX server entry (`<App />`) is NOT a HellaNode until a build plugin
transforms it; running it through a runtime that supplies its own JSX (Bun's React runtime) silently
compiles to `createElement` and emits `[object Object]` or a React error — wrong output, not a loud
one (the React-runtime silent-failure trap). The clean path is Vite SSR: route the server entry
through Vite so `vite-plugin-hellajs`'s `transform` hook (which does NOT gate on the `ssr` flag) runs
server-side too. This is the novel path (units 01/02 use `html`; the streaming example uses JSX on
both entries to showcase the plugin/SSR-build path), and it's the foundation any future
JSX-server-entry or meta-framework SSR would build on.

Recall this when building an SSR app with a JSX server entry, or wiring `vite-plugin-hellajs` for SSR.
The server entry exports a `render()` (not a top-level `Bun.serve`; current example is a single Dashboard page, so it takes no URL), and the dev/prod split is:
`npm run dev` (Vite dev server + the middleware) for streaming; `vite build` (client) +
`vite build --ssr` (server) for production.

# Evidence

- `plugins/vite/index.mjs` — `viteHellaJS()` returns `{ name, enforce: "pre", async transform(code, id) }`
  transforming `.tsx/.ts/.jsx/.js` (skipping `node_modules`); no `ssr` flag check, so it runs in both
  pipelines. Confirmed empirically: a dev middleware `ssrLoadModule('/src/server.tsx')` produced
  HellaNode-derived HTML (`<!--[-->…<!--]-->` markers + `<template>` staging), not a React error.
- `examples/ssr-streaming/vite.config.js` — the `configureServer(server)` middleware: skips
  `/@`-prefixed, `/src`-prefixed, `/node_modules`-prefixed, and file-extension URLs to Vite; for app
  routes does `const { render } = await server.ssrLoadModule('/src/server.tsx'); const stream =
  render(url); res.writeHead(200, …); for await (const chunk of stream) res.write(chunk); res.end();`.
- `examples/ssr-streaming/src/server.tsx` (rewritten from the pre-v2 router example) —
  `export function render(): ReadableStream<string>`, no argument and no router; returns
  `doc({ lang, mount: '#app', head: { title, meta, styles: [styles], scripts: [{ type: 'module',
  src: '/src/client.tsx' }] }, body: ssr.stream(<Dashboard />) })` — the `doc` stream overload
  assembles shell → streamed body chunks → closing tags.
- `examples/ssr-streaming/src/client.tsx` — no router; `hydrate(<Dashboard />, '#app')` with no
  `.flush()` (afterMount fires automatically during hydrate); staged `<template>` swaps happen
  inside hydrate (β model now carried by memories 032/033).
- Historically confirmed empirically (2026-09-09, pre-rewrite router example): the dev middleware's
  `ssrLoadModule` produced HellaNode-derived HTML (`<!--[-->…<!--]-->` markers + `<template>`
  staging), not a React error. Current tree: `bunx tsc --noEmit` in the example fails TS2307 on
  `@hellajs/ssr` only because root `node_modules/@hellajs` lacks the `ssr` symlink (partial install;
  the lockfile lists `packages/ssr`) — environmental, not a source change.
- Depends on the fixes in memory 028 (ssr array-children) and, for the pre-rewrite router example,
  027 (router re-resolution); composes with memory 018 (router SSR), 197 (SSR readiness),
  032/033 (staged-Suspense streaming; carries 015's model).
