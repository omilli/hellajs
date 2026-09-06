---
type: decision
title: "route().path carries the query string (pathname + search) — tests and docs must expect the ?suffix, not the bare pathname"
description: route().path carries the query string (pathname + search) at every producer — tests and doc examples must expect the ?suffix; active() and crumbs strip it themselves.
tags: [arch, router, testing]
timestamp: 2026-08-14
last_confirmed: 2026-08-14
triggers: [route-path-query, routeinfo-path-shape, router-test-assertion, base-path]
---
# Why

`route().path` is built as `pathname + search` at every producer: `router.ts` init (both the `url`-option parse and the `window.location` read) and `internal/resolve.ts commitMatch`/`updateRoute`'s notFound write all pass the query-carrying string through as `path`. Consumers that need the bare pathname strip it themselves (`route.ts activeFn` does `route().path.split("?")[0]`; crumbs slice from `pathWithoutQuery`). Nothing in AGENTS.md or the docs states this shape, so a test author naturally asserts the bare path and fails one cycle on a URL with a query.

# Evidence

- Failing assertion this session: `expect(route().path).toBe("/users/7")` → received `"/users/7?q=1"` (packages/router/tests/base-path.test.ts, url-option case, fixed to expect the suffixed form; `bun coverage router` 205 pass after).
- `packages/router/lib/router.ts` — `initialPath = parsedInitial.pathname + parsedInitial.search` (url branch) and `window.location.pathname + window.location.search` (history branch).
- `packages/router/lib/internal/resolve.ts` — `commitMatch(... currentPath ...)` → `route(buildRouteInfo({ path: currentPath }))`; `currentPath` includes the query throughout `updateRoute`.
- Pre-existing corroboration: `packages/router/tests/history.test.ts` popstate test asserts `route().path` === `"/test?q=hello"`.
