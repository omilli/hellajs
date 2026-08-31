<router-package-instructions>
  Reactive client-side router over `@hellajs/core` signals. Strict resolution pipeline (redirects → nested → flat → notFound), lifecycle hooks, parameter inheritance, History/hash/memory modes, scroll control, and same-origin link interception. Barrel: `lib/index.ts`.

  ## Public exports (`lib/index.ts`)

  | Export | Source | Role |
  |---|---|---|
  | `router` | `router.ts` | Init: registers routes/hooks/redirects/notFound/mode/base/scroll/inheritMeta/url, binds listeners, resolves the initial route synchronously and returns the matched `RouteInfo`. |
  | `route` | `route.ts` | Reactive signal holding the current `RouteInfo` (`path`, `params`, `query`, `handler`, `meta`, `crumbs`, `active`). |
  | `navigate` | `navigate.ts` | Programmatic nav: `:param`/`:param?`/`*` substitution, query serialize, history push/replace. |
| `href` | `href.ts` | Typed URL builder: same `:param`/`:param?`/`*`/query semantics as `navigate` via shared `buildPath`; returns the string, no history touched. |
  | `resetRouter` | `resetRouter.ts` | Factory-reset: resets all config signals + `route()` to defaults, detaches listeners. Does NOT mutate the URL. |
  | `type *` | `types.d.ts` | `RouterConfig`, `RouteInfo`, `RouteWithHooks`, `Handler` (full `(params: Params, query: Params) => unknown` signature; runtime dispatch is arity-based), `NavigateOptions`, `Redirect`, `ScrollBehavior`, `HistoryMode`, `Crumb`, `ExtractParams`. |

  ## File map

  | File | Responsibility |
  |---|---|
  | `router.ts` | Config → state signals (validates + normalizes `base`, throwing on non-`'/'`-prefixed values); initial-path detection (`url` override / hash vs history / memory → `/`; base stripped from every read); popstate/hashchange + click listeners with composed cleanup (none attached in memory mode); synchronous `updateRoute()` on return. |
  | `state.ts` | 9 config signals (`routes`, `hooks`, `redirects`, `notFound`, `mode`, `base`, `scrollBehavior`, `previousPath`, `inheritMeta`). |
  | `route.ts` | The `route` signal (current `RouteInfo`) + the shared `activeFn` ancestor-match predicate. |
  | `navigate.ts` | Path validation + option unpack; delegates substitution to `internal/path.ts buildPath`, then `go()`. |
| `href.ts` | The `href` export: validation + `internal/path.ts buildPath`, returns the built URL string — no history, no resolution. |
  | `match.ts` | `parseQuery`, `matchPattern` (segment/optional/wildcard extraction), `matchSegments` (recursive aligner, `:name?` consume-first backtracking), `matchNestedEntry` (single-entry chain resolver), `matchNestedRoute` (specificity-sorted loop over entries, params spread-merged), `matchRoute` (flat). |
  | `hooks.ts` | `executeHook` (arity dispatch + try/catch + promise.catch), `executeGlobalHook` (`(to, from)` paths). |
  | `utils.ts` | `EMPTY_OBJECT`/`EMPTY_CRUMBS`, `hasChildren`, `getHashPath`, `stripBase`, `sortRoutesBySpecificity`. Leaf module — no internal imports. |
  | `internal/resolve.ts` | Resolution pipeline: `RouteVerdict` + hop counter (`updateRoute`), `tryRedirect`, `tryMatchRoute` → `matchNestedPhase`/`matchFlatPhase` via shared `commitMatch` + `mergeRouteMeta`, `buildRouteInfo`, `go` (guard-aware history commit, `base`-prefixed in history mode; memory mode commits none). |
  | `internal/matched.ts` | `handleScroll`, `extractHandler`/`Meta`/`InheritMeta`/`Scroll`/`RouteHooks`, `runGuardsNested`/`runGuardsFlat` (shared global-before prologue; the global hook receives `(toPath, route().path)`), `executeRouteWithHooks` (threads `(to, from)` into `global.after`). |
| `internal/path.ts` | `buildPath` — the single substitution truth (`:param` → `encodeURIComponent`, absent `:param?` strips token + preceding slash, `*` → raw insert, strip unmatched, query serialize); shared by `navigate` + `href`. |
  | `internal/core.ts` | Re-exports `signal`, `isFunction`, `isString`, `isPlainObject`, `hasWindow` from `@hellajs/core`. |

  ## Resolution pipeline (`internal/resolve.ts` `updateRoute` → early-exit at first hit)

  | # | Phase | Source | Match rule | Evidence |
  |---|---|---|---|---|
  | 1 | Global redirect | `redirects[].from` | `matchRoute` pattern per entry (query ignored); captured params substitute into `to` via `buildPath` | `resolve.ts tryRedirect` |
  | 2 | String redirect | `routes{k: string}` | `matchRoute` (flat pattern, non-nested) | `resolve.ts tryRedirect` |
  | 3 | Nested route | `routes{k: RouteWithHooks with children}` | `matchNestedRoute`, sorted by specificity | `resolve.ts matchNestedPhase` |
  | 4 | Flat route | `routes{k: RouteValue}`, object entry order | `matchRoute`, first hit wins | `resolve.ts matchFlatPhase` |
  | 5 | notFound | `notFound` config | string → `go(str, {replace:true})`; fn → set handler + call | `resolve.ts updateRoute` |

  - **Specificity sort** (`utils.ts sortRoutesBySpecificity`): non-wildcard before wildcard, then deeper segment-count before shallow. Applied recursively at **every** nesting level (`match.ts matchNestedRoute`).
  - **Flat routes are NOT sorted** — list specific patterns before generic ones in the routes object.
  - **Global redirects ignore query** (`/login?ref=1` matches `from: ["/login"]`); string redirects use full `matchRoute`.

  ## Lifecycle hook order (`internal/matched.ts` `runGuards` → `executeRouteWithHooks`)

  `global.before → parent.before → child.before → handler → child.after → parent.after → global.after`

  - `runGuardsNested`/`runGuardsFlat` run `before` hooks (global + nested top-down / flat) and short-circuit on the first non-pass verdict (`false`, throw, or redirect string); the shared commit step runs the handler + `after` hooks only on a pass. Global `before`/`after` receive `(to, from)` paths — `to` = incoming path incl. query, `from` = `route().path` pre-commit (`matched.ts runGlobalBefore` reads it before the signal write; `executeRouteWithHooks` receives the pre-write `from` via `commitMatch`).
  - Each nested level's hook receives that level's **cumulative inherited params** + query; the handler receives leaf params/query.
  - **Sync** `before` return values can block: `false`/throw cancels, string redirects. **Async** `before` (`Promise`) cannot block — treated as proceed, rejection `.catch`-logged.

  <non-obvious>
    **Base path is strip-on-read / re-add-on-commit** — `base: "/app"` is stripped at every URL read (`url` option, history-mode init, popstate, intercepted clicks) and re-added on every history-mode commit (`go()`, popstate guard-restore). Everything inside the pipeline — patterns, matching, `route().path`, `active()`, `crumbs`, `navigate()` targets — stays logical (base-free); no-base behavior is byte-identical (empty base → identity). Hash mode ignores `base` (the router never touches the pathname); trailing slashes normalize away (`"/app/"` → `"/app"`); a non-`'/'`-prefixed value throws at config time (`router.ts`, `internal/utils.ts stripBase`).

    **Init is synchronous** — `router()` resolves the initial route inline (direct `updateRoute()`) and returns the resolved `RouteInfo` (`handler`/`params`/`query`/`path` set on return). `navigate()` was already synchronous; init now matches. SSR callers pass `url` (no `window`); `config.url` overrides `window.location` for the initial resolution, so `route()` is already resolved when `router()` returns — no microtask, no `handler: null` window.

    **Atomic route writes** — `navigate`/`popstate`/`hashchange` all funnel through `updateRoute` → a single `route()` write; `path`/`params`/`query`/`handler`/`meta`/`crumbs` always describe the same match. The init pre-write (`router.ts` init guard) is the only non-atomic write, skipped on client re-init (`!route().handler`); an explicit `config.url` (SSR) always re-resolves.

    **Arity dispatch** — `executeHook`: params non-empty → `(params, query)`; params empty + `fn.length >= 2` → `(undefined, query)`; otherwise → `(query)` (`hooks.ts executeHook`). Declaring `(params, query)` is the only signature that reliably receives query on static routes.

    **Optional `:name?` segments** — a `:name?` segment matches-or-skips (consume-first backtracking, `match.ts matchSegments`); a skipped optional leaves no params key, and `?` in a pattern always means optional — `matchPattern` never splits a pattern at `?` (`match.ts`). Optional segments count as ordinary segments in the specificity sort, and `ExtractParams` yields them as optional keys (`types.d.ts`).

    **Wildcard capture has no leading slash** — `/files/*` + `/files/docs/readme.md` → `params["*"] = "docs/readme.md"` (`match.ts matchPattern`). `navigate`/`href` insert `*` **raw** (not encoded), unlike `:param` values which ARE `encodeURIComponent`'d (`internal/path.ts buildPath`).

    **Unmatched `:param` is stripped** — `navigate("/users/:id", {params:{wrongKey}})` → regex removes `:id` → `/users/` (`internal/path.ts buildPath`). An absent `:param?` instead strips together with its preceding slash (`"/users/:id?"` → `/users`) so optional tokens collapse cleanly.

    **Meta cascade is leaf-only by default** — `inheritMeta: false` (default) replaces meta at each nested level, final = leaf meta. `inheritMeta: true` merges parent→child (child wins on conflict). Per-route `inheritMeta` overrides global: `false` = boundary (drops ancestors above, its own meta still flows down), `true` = opt-in when global is false (`resolve.ts matchNestedPhase` — meta fold). Inline `navigate({meta})` merges over the resolved route meta and wins on conflict.

    **Listener cleanup on re-init** — calling `router()` again removes the prior popstate/hashchange **and** click handler via the composed `cleanupListener` (`router.ts resetListeners`).

    **Memory mode is URL-less and listener-less** — `mode: "memory"` seeds the initial path from `url` (parsed) or `/`, never reads `window.location`, attaches no popstate/hashchange/click listeners, and `go()` performs no history commit (`router.ts` init, `internal/resolve.ts go`). `route()` advances only via `navigate()`; browser back/forward are no-ops (no entry stack — no `back()`/`forward()` exports).

    **Scroll no-op on init** — `previousPath` is seeded with `initialPath` (`router.ts` previousPath seed), so the first `updateRoute()` sees `from === to` and skips (`matched.ts handleScroll`). **Scroll priority**: inline `navigate({scroll})` > route-level `scroll` > global `scrollBehavior`; `false` at any level disables; `"auto"`/`"preserve"` skip `scrollTo`; custom fn returning `null` skips.

    **`intercept` defaults true** — same-origin `<a>` clicks route through `navigate()`. Skipped when: already `defaultPrevented`, modifier keys, `target !== "_self"`, `download`, non-http(s), cross-origin, malformed href. History mode also skips hrefs differing from the current URL only by hash (in-page anchors stay native). Hash mode requires the hash start with `#/`; plain hash changes (`#section`) are ignored by the hashchange handler (`router.ts` clickHandler).

    **`active()` ancestor semantics** — shared `activeFn` reads `route().path` reactively, strips query, respects segment boundaries via `matchPattern(isNested=true)`; `/admin` is NOT active at `/administrators`. Root `/` is exact-only (a zero-segment ancestor would match every path, so a home link lights up solely at `/`) (`route.ts`, `active.test.ts`).

    **`crumbs` parent-to-leaf** — each crumb `{segment: pattern key, path: cumulative URL (query excluded), params: inherited through that level}`; `notFound` resolution → empty array (`resolve.ts` crumb build). Use `crumb.path` for hrefs, `crumb.segment` for label lookup.

    **`resetRouter` resets everything** — all 10 signals (9 config + `route()`) reset to defaults, listeners detached. Does NOT mutate `window.location` or `history`. Re-init with `router()` after reset.

    **Sync/async `before` asymmetry** — sync `before` can block via `false`/throw/string return; async `before` (returning `Promise`) cannot block — treated as proceed, rejection `.catch`-logged. This is intentional: `navigate` stays `void`; async can't retroactively block a synchronous navigation.

    **Popstate guard failure restores URL** — on `"cancelled"` verdict from popstate/hashchange, the handler calls `window.history.replaceState(null, "", previousPath())` to keep the address bar in sync (`router.ts` popstate/hashchange handlers). No reentrancy risk — `replaceState` does not fire popstate.

    **`route()` is pre-commit in `before` hooks** — `runGuards` executes before the `route()` signal write (`internal/matched.ts`). A `before` hook reading `route()` sees the *previous* route's state, not the incoming one. Params/query are still passed as hook arguments. Use `after` hooks or inline `navigate({meta})` to react to the committed route.

    **Guard return contract** — `before` hook return values: `void`/`true` → proceed, `false` → cancel (URL unchanged), string → redirect, `throw` → cancel + log, `Promise` → proceed (cannot block). No new types exported; contract documented via JSDoc only.

    **Malformed routes tolerated** — string children values, `children: null`, non-function/non-object route values, and `routes: null` all resolve to `handler: null` rather than throwing (`routing.test.ts`, `errors.test.ts`).
  </non-obvious>

  ## Performance

  - **`EMPTY_OBJECT` / `EMPTY_CRUMBS` reuse** — frozen singletons returned for param-less/query-less routes and notFound crumbs (`utils.ts EMPTY_OBJECT`/`EMPTY_CRUMBS`).
  - **`EMPTY_OBJECT` return** — static matches (no `:segment`, optional, or `*` captured) return the frozen singleton instead of the per-call params object (`match.ts matchPattern`).
  - **Single shared `activeFn`** — one closure attached to every `RouteInfo` via `buildRouteInfo`; reads path dynamically instead of rebuilding (`route.ts activeFn` + `resolve.ts buildRouteInfo`).
  - **Early exits** — redirect checks run before nested matching; first nested/flat hit returns immediately.
  - **Single `route` signal** — all routing state co-located; no per-route subscriptions.

  ## Testing

  - Run `bun coverage router`. **NEVER run `bun test` directly** — it tests against stale bundles. Coverage instruments `dist/bundle.js`, not `lib/`.
  - Shared helpers in `tests/helpers.ts`: `setupRouterEnv` (resetTestState + setupContainer + `history.replaceState`), `expectLoggedError` (asserts `[router]` prefix against `suppressConsole` output).
  - One behavior per file: `routing`, `hooks`, `redirects`, `specificity`, `history`, `hash-mode`, `navigate-options`, `href`, `intercept`, `errors`, `guards`, `inherit-meta`, `meta`, `crumbs`, `active`, `scroll`, `url-encoding`, `atomicity`, `base-path`, `memory-mode`, `reset-router`, `ssr`, `validation`. Follow `guides/tests.md` — `mock()` from `bun:test`, explicit imports from `@hellajs/core`/`@hellajs/router/bundle`/`@utils/test-helpers.js`, `flush()` is sync.
</router-package-instructions>
