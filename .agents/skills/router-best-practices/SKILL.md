---
name: router-best-practices
description: >
  Best practices for @hellajs/router reactive routing: router, route, navigate, href, resetRouter. Use when code imports @hellajs/router - configuring routes with router({ routes }) (nested children, :param / :param? / * patterns, meta, redirects, notFound, base, mode), reading route() (path, params, query, crumbs, active, pending), navigate(path, { params, query, replace, force, scroll, meta }), guards and hooks (before, after, leave, global hooks), history/hash/memory modes, scroll, interception, resetRouter. Silent failure modes: flat routes match in insertion order so generics shadow specifics, route maps cached by identity make in-place mutation invisible, guards must return verdicts instead of calling navigate, a Promise guard defers the commit with route().pending true, leave guards run on back/forward, route() is pre-commit inside before hooks, wildcards insert raw while :param values encode. Use ONLY for @hellajs/router routing - data fetching to resource-best-practices, SSR to ssr-best-practices.
---

# router-best-practices

Grounded rules for `@hellajs/router`: `router()` registers a route map and resolves synchronously, `route()` is the reactive signal holding the current match (`path`, `params`, `query`, `handler`, `meta`, `crumbs`, `active`, `pending`), `navigate()` drives history with typed param substitution, `href()` builds URLs without touching history, and `resetRouter()` is the factory reset. Resolution follows a strict pipeline (redirects -> nested -> flat -> notFound) with lifecycle hooks (`before`/`after`/`leave` route hooks plus global `hooks`) guarding every navigation. Every rule is derived from the package source and its test suite; each rule file cites the symbols and tests that pin it.

## When to Apply

- Any code importing `@hellajs/router` or configuring routes with `router({ routes })`.
- Reading the current route from `route()` - params, query, crumbs, `active()` link state, or the `pending` flag.
- Programmatic navigation with `navigate()` and its options (`params`, `query`, `replace`, `force`, `scroll`, `meta`), or URL building with `href()`.
- Writing guards or lifecycle hooks: route-level `before`/`after`/`leave`, global `hooks`, async guards.
- Choosing history/hash/memory modes, base paths, scroll behavior, or link interception.

Not for: data fetching keyed off the route (`resource-best-practices`), server rendering and hydration (`ssr-best-practices`).

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Categories

| Prefix | Category | Impact |
|---|---|---|
| cfg | Route configuration | HIGH |
| nav | Navigation and URLs | HIGH |
| hook | Lifecycle hooks and guards | CRITICAL |
| mode | Modes, scroll, and interception | MEDIUM |
| reset | Reset and re-init | LOW |

## Rules

### Route configuration (cfg)

- `cfg-resolution-order` - Trust the resolution order: redirects, nested, flat, notFound
- `cfg-flat-order-specific-first` - Order flat routes specific-first; only nested routes are sorted
- `cfg-optional-params` - Mark optional segments with :param? and read them as possibly absent
- `cfg-wildcard-capture` - Capture rest paths with * and insert wildcard values raw
- `cfg-nested-params-inherit` - Nest routes with children; params flow parent to leaf
- `cfg-meta-inheritance` - Turn on inheritMeta to cascade meta; leaf replaces by default
- `cfg-fresh-routes-object` - Reconfigure routes with a fresh object, never in-place mutation

### Navigation and URLs (nav)

- `nav-encode-params` - Pass params through options, never string interpolation
- `nav-href-builder` - Build anchor hrefs with href(), not template strings
- `nav-active-predicate` - Drive nav highlighting with route().active(), not path equality
- `nav-crumbs` - Render breadcrumbs from route().crumbs, not path splitting
- `nav-navigate-options` - Pick the right navigate options: replace, scroll, meta
- `nav-base-path` - Keep patterns base-free; set base once in router config

### Lifecycle hooks and guards (hook)

- `hook-guard-verdict-contract` - Return verdicts from guards, never navigate() inside them
- `hook-async-guards` - A Promise-returning guard blocks with route().pending
- `hook-arity-full-signature` - Declare the full (params, query) signature
- `hook-leave-guards` - Guard departures with leave; override with force
- `hook-before-reads-old-route` - route() is pre-commit inside before hooks
- `hook-execution-order` - Plan around the fixed hook order

### Modes, scroll, and interception (mode)

- `mode-history-hash-memory` - Choose the mode deliberately; memory is URL-less
- `mode-scroll-behavior` - Configure scroll priority once, override per route or navigation
- `mode-intercept-links` - Let intercept handle same-origin anchors
- `mode-ssr-url` - Resolve server routes with the url option
- `mode-atomic-writes` - Treat route() as one atomic commit

### Reset and re-init (reset)

- `reset-router-teardown` - Reset between tests with resetRouter
- `reset-reinit` - Reconfigure by calling router() again

Full rule text, incorrect/correct examples, and source references: `AGENTS.md` in this folder (compiled from `rules/` by `vp run skills-build`).
