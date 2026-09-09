---
type: decision
title: Router SSR is library territory — router({ url }) + synchronous init make the router server-runnable; no new primitive, no per-request rewrite for the sync path
description: Router SSR is library territory (supersedes 017) — router({ url }) plus synchronous init make the router server-runnable and composable with ssr/hydrate; no new primitive, no per-request rewrite.
tags: [arch, ssr, router, isomorphic]
timestamp: 2026-09-09
last_confirmed: 2026-09-09
triggers: [router-ssr, isomorphic-routing, router-url-option, synchronous-init]
supersedes: 017
---

> **Naming superseded 2026-08-22 (entry 045):** `ssrAsync`→`ssr.async`, `ssrStream`→`ssr.stream`, `docStream`→`doc` (stream overload) — the old names below are the pre-v2 API, kept for history.

# Why

017 concluded router SSR collapses to a docs pattern (meta-framework territory) on three *worth* arguments: servers route; the library/meta-framework split pairs an isomorphic router with a request→render bridge HellaJS lacks; `ssr` reads once and doesn't subscribe to reactivity. A 2026-07-14 design session (brain-idea) overturned the worth judgment: the moment the initial resolution is synchronous and a URL can be supplied, router SSR composes with the EXISTING primitives — `router({ url })` resolves the request URL server-side, `ssr`/`ssrAsync`/`ssrStream` serialize the tree, `hydrate` re-binds the same tree client-side, and the view-signal handler pattern `() => currentView(X)` is already isomorphic. On the client, omit `url` (the router reads `window.location`) and bind with `hydrate()`. No new primitive, no context/provider, no per-request rewrite for the sync path.

The crux: 017 conflated "a standalone `resolveRoute(config, url)` primitive isn't worth it" (true — a bare resolver is an orphan the user still wires) with "router SSR isn't a library feature" (false — wiring the EXISTING router to accept a URL + resolve synchronously is a one-option, one-deferral-removal change, and it unblocks real SSR). Shared-routing value (one route tree, no server/client drift, hydration agreement) is delivered by the library; request-scoped data and streaming-under-concurrency remain the meta-framework boundary (documented as a caveat; per-request router instances are future work).

# Evidence

- `packages/router/lib/types.d.ts`: `RouterConfig.url?: string` — "Resolve against this URL instead of `window.location`. Used for SSR, where there is no window."
- `packages/router/lib/router.ts`: `const initialPath = config.url ?? (hasWindow() ? (routerMode === "hash" ? getHashPath() : window.location.pathname + window.location.search) : "/");` and a direct `updateRoute()` (was `queueMicrotask(() => updateRoute())`). Init is now synchronous; `navigate()` already was.
- `packages/router/tests/ssr.test.ts`: 6 scenarios (synchronous resolution; `url` overrides `window.location`; path params; query string; handler fires once during `router()`; re-resolves url on each `router()` call in one process — added by 027). `bun coverage router` exits 0 (164 pass, 100% lines).
- `packages/router/docs/patterns/routing.mdx` (SSR sections; `ssr.mdx` renamed to `routing-ssr.mdx` 2026-08-27, merged into `routing.mdx` 2026-09-09, hydrate section dropped): Bun.serve recipes for `ssr`/`ssrAsync`/`ssrStream` + pure-handler & concurrency idioms; wrapper `docs/src/pages/learn/patterns/routing.mdx`.
- `plans/router/code/router-ssr/index.md`: the resolved design + the two-unit set.
- 017's still-valid sub-facts survive elsewhere: env-agnostic primitives (memory 005); `ssr` reads once / runs no effects (ssr-comparison.md §2). Only the "meta-framework territory, don't build it" verdict is overturned.