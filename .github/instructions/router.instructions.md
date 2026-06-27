---
applyTo: "packages/router/**"
---

<router-package-instructions>
  Reactive client-side router over `@hellajs/core` signals. Strict resolution pipeline (redirects → nested → flat → notFound), lifecycle hooks, parameter inheritance, History/hash modes, scroll control, and same-origin link interception. Barrel: `lib/index.ts`.

  ## Public exports (`lib/index.ts`)

  | Export | Source | Role |
  |---|---|---|
  | `router` | `router.ts` | Init: registers routes/hooks/redirects/notFound/mode/scroll/inheritMeta, binds listeners, returns initial `RouteInfo` (handler `null` until microtask). |
  | `route` | `state.ts` | Reactive signal holding the current `RouteInfo` (`path`, `params`, `query`, `handler`, `meta`, `crumbs`, `active`). |
  | `navigate` | `navigate.ts` | Programmatic nav: `:param`/`*` substitution, query serialize, history push/replace. |
  | `resetRouter` | `resetRouter.ts` | Factory-reset: sets all 8 config signals to defaults, detaches listeners. Does NOT touch the URL. |
  | `type *` | `types.d.ts` | `RouterConfig`, `RouteInfo`, `RouteWithHooks`, `NavigateOptions`, `Redirect`, `ScrollBehavior`, `HistoryMode`, `Crumb`, `ExtractParams`. |

  ## File map

  | File | Responsibility |
  |---|---|
  | `router.ts` | Config → state signals; initial-path detection (hash vs history); popstate/hashchange + click listeners with composed cleanup; `queueMicrotask(() => updateRoute())`. |
  | `state.ts` | 8 config signals (`routes`, `hooks`, `redirects`, `notFound`, `mode`, `scrollBehavior`, `previousPath`, `inheritMeta`) + the `route` signal + shared `activeFn`. |
  | `navigate.ts` | `:key` → `encodeURIComponent`, `*` → raw insert, strip unmatched `:param`, query string, → `go()`. |
  | `match.ts` | `parseQuery`, `matchPattern` (segment/wildcard extraction), `matchNestedRoute` (recursive, specificity-sorted, params spread-merged), `matchRoute` (flat). |
  | `hooks.ts` | `executeHook` (arity dispatch + try/catch + promise.catch), `executeGlobalHook` (no args). |
  | `utils.ts` | `EMPTY_OBJECT`/`EMPTY_CRUMBS`, `buildRouteInfo`, `hasChildren`, `getHashPath`, `sortRoutesBySpecificity`, `go`, `updateRoute`, `tryRedirect`, `tryMatchRoute`. |
  | `internal/matched.ts` | `handleScroll`, `extractHandler`/`Meta`/`InheritMeta`/`Scroll`/`RouteHooks`, `executeRouteWithHooks`. |
  | `internal/core.ts` | Re-exports `signal`, `isFunction`, `isString`, `isPlainObject`, `hasWindow` from `@hellajs/core`. |

  ## Resolution pipeline (`utils.ts:115` `updateRoute` → early-exit at first hit)

  | # | Phase | Source | Match rule | Evidence |
  |---|---|---|---|---|
  | 1 | Global redirect | `redirects[].from` | Exact equality on path **without query** | `utils.ts:158,164` |
  | 2 | String redirect | `routes{k: string}` | `matchRoute` (flat pattern, non-nested) | `utils.ts:177-187` |
  | 3 | Nested route | `routes{k: RouteWithHooks with children}` | `matchNestedRoute`, sorted by specificity | `utils.ts:216-227` |
  | 4 | Flat route | `routes{k: RouteValue}`, object entry order | `matchRoute`, first hit wins | `utils.ts:282-312` |
  | 5 | notFound | `notFound` config | string → `go(str, {replace:true})`; fn → set handler + call | `utils.ts:130-145` |

  - **Specificity sort** (`utils.ts:69`): non-wildcard before wildcard, then deeper segment-count before shallow. Applied recursively at **every** nesting level (`match.ts:102`).
  - **Flat routes are NOT sorted** — list specific patterns before generic ones in the routes object.
  - **Global redirects ignore query** (`/login?ref=1` matches `from: ["/login"]`); string redirects use full `matchRoute`.

  ## Lifecycle hook order (`internal/matched.ts:140` `executeRouteWithHooks`)

  `global.before → parent.before → child.before → handler → child.after → parent.after → global.after`

  - Nested `before` runs top-down; nested `after` runs bottom-up (LIFO). Flat routes run `routeBefore → handler → routeAfter`, wrapped by global hooks.
  - Each nested level's hook receives that level's **cumulative inherited params** + query; the handler receives leaf params/query.
  - All execution via `executeHook`/`executeGlobalHook`: errors caught and logged as `[router] <prefix>:`, promise reactions `.catch`-logged — **navigation never blocks**.

  <non-obvious>
    **Init is deferred** — `router()` ends with `queueMicrotask(() => updateRoute())` and returns `route()` with `handler: null` until the microtask fires (`router.ts:113,115`). Read resolved state inside `effect()`, not from the return value.

    **Atomic route writes** — `navigate`/`popstate`/`hashchange` all funnel through `updateRoute` → a single `route()` write; `path`/`params`/`query`/`handler`/`meta`/`crumbs` always describe the same match. The init pre-write (`router.ts:36-41`) is the only non-atomic write, guarded by `if (!route().handler)` so it is skipped on re-init.

    **Arity dispatch** — `executeHook`: params non-empty → `(params, query)`; params empty + `fn.length >= 2` → `(undefined, query)`; otherwise → `(query)` (`hooks.ts:24-30`). Declaring `(params, query)` is the only signature that reliably receives query on static routes.

    **Wildcard capture has no leading slash** — `/files/*` + `/files/docs/readme.md` → `params["*"] = "docs/readme.md"` (`match.ts:77`). `navigate` inserts `*` **raw** (not encoded), unlike `:param` values which ARE `encodeURIComponent`'d (`navigate.ts:23,27-29`).

    **Unmatched `:param` is stripped** — `navigate("/users/:id", {params:{wrongKey}})` → regex removes `:id` → `/users/` (`navigate.ts:31`).

    **Meta cascade is leaf-only by default** — `inheritMeta: false` (default) replaces meta at each nested level, final = leaf meta. `inheritMeta: true` merges parent→child (child wins on conflict). Per-route `inheritMeta` overrides global: `false` = boundary (drops ancestors above, its own meta still flows down), `true` = opt-in when global is false (`utils.ts:234-249`). Inline `navigate({meta})` merges over the resolved route meta and wins on conflict.

    **Listener cleanup on re-init** — calling `router()` again removes the prior popstate/hashchange **and** click handler via the composed `cleanupListener` (`router.ts:46,105-109`).

    **Scroll no-op on init** — `previousPath` is seeded with `initialPath` (`router.ts:43`), so the deferred first `updateRoute()` sees `from === to` and skips (`matched.ts:20-22`). **Scroll priority**: inline `navigate({scroll})` > route-level `scroll` > global `scrollBehavior`; `false` at any level disables; `"auto"`/`"preserve"` skip `scrollTo`; custom fn returning `null` skips.

    **`intercept` defaults true** — same-origin `<a>` clicks route through `navigate()`. Skipped when: already `defaultPrevented`, modifier keys, `target !== "_self"`, `download`, non-http(s), cross-origin, malformed href. Hash mode requires the hash start with `#/` (`router.ts:67-101`).

    **`active()` ancestor semantics** — shared `activeFn` reads `route().path` reactively, strips query, respects segment boundaries via `matchPattern(isNested=true)`; `/admin` is NOT active at `/administrators` (`state.ts:59`, `active.test.ts`).

    **`crumbs` parent-to-leaf** — each crumb `{segment: pattern key, path: cumulative URL (query excluded), params: inherited through that level}`; `notFound` resolution → empty array (`utils.ts:253-264`). Use `crumb.path` for hrefs, `crumb.segment` for label lookup.

    **`notFound: string` is a redirect** — triggers `go(notFound, {replace:true})` then re-resolves (`utils.ts:132-134`).

    **Malformed routes tolerated** — string children values, `children: null`, non-function/non-object route values, and `routes: null` all resolve to `handler: null` rather than throwing (`routing.test.ts`, `errors.test.ts`).
  </non-obvious>

  ## Performance

  - **`EMPTY_OBJECT` / `EMPTY_CRUMBS` reuse** — frozen singletons returned for param-less/query-less routes and notFound crumbs (`utils.ts:19,25`).
  - **`hasParams` flag** — defers params object allocation until a `:segment` or `*` actually matches (`match.ts:57,83`).
  - **Single shared `activeFn`** — one closure attached to every `RouteInfo` via `buildRouteInfo`; reads path dynamically instead of rebuilding (`utils.ts:32-41`).
  - **Early exits** — redirect checks run before nested matching; first nested/flat hit returns immediately.
  - **Single `route` signal** — all routing state co-located; no per-route subscriptions.

  ## Testing

  - Run `bun check router` (lint + bundle + test) or `bun coverage router`; coverage instruments `dist/bundle.js`, not `lib/`.
  - Shared helpers in `tests/helpers.ts`: `setupRouterEnv` (resetTestState + setupContainer + `history.replaceState`), `expectLoggedError` (asserts `[router]` prefix against `suppressConsole` output).
  - One behavior per file: `routing`, `hooks`, `redirects`, `specificity`, `history`, `hash-mode`, `navigate-options`, `intercept`, `errors`, `inherit-meta`, `meta`, `crumbs`, `active`, `scroll`, `url-encoding`, `atomicity`. Follow `guides/tests.md` — `mock()` from `bun:test`, explicit imports from `@hellajs/core`/`@hellajs/router/bundle`/`../../../utils/test-helpers.js`, `flush()` is sync.
</router-package-instructions>
