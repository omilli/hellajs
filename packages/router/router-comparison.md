# HellaJS @hellajs/router vs. TanStack Router / Vue Router / Solid Router / Angular Router / Next.js Router

A ground-up comparison based on the actual source code of `@hellajs/router` v2. Every claim below was verified against `packages/router/lib/`. Competitor versions researched: TanStack Router 1.170 (`@tanstack/react-router` npm manifest + `@tanstack/router-core` 1.171 dist, read this session), Vue Router 5.2 (npm tarball + published types, read this session), `@solidjs/router` 1.0.0 (npm tarball + README, read this session), Angular Router 22.1 (npm tarball + published types, read this session), Next.js 16.3 App Router (current `vercel/next.js` docs, read this session).

---

## 1. At-a-Glance Summary

| Dimension | HellaJS router | TanStack Router | Vue Router | Solid Router | Angular Router | Next.js Router |
|---|---|---|---|---|---|---|
| Routing model | Declarative object map, 5-phase pipeline | Generated route tree, type-safe | `createRouter` + `Routes` array | JSX `<Route>` tree or config array | `Routes` array + DI (`provideRouter`) | File-system (folders = routes) |
| Reactive model | Signals from `@hellajs/core` | `@tanstack/store` | Vue reactivity (proxy) | Solid signals | Angular Signals + RxJS | React state / Server Components |
| Navigation model | History API (`popstate` / `hashchange`) or memory (no URL) | `@tanstack/history` (custom) | Pluggable: web / hash / memory | `window` history behind a Router abstraction | `Location` + `UrlSerializer` + History | App Router + `useRouter` |
| Type safety | Template-literal `ExtractParams<T>`, no codegen | Generated route tree (full, codegen) | Typed routes via bundled codegen | Manual + `MatchFilters` | Manual | File-based `params`/`PageProps` (async) |
| Compile step | None | `routeTree.gen.ts` codegen | Optional (codegen ships in-package) | None | Decorators / standalone | Required (Next.js build) |
| Runtime deps | 0 (+ `@hellajs/core` peer) | 4 (+ react peers) | 17 (codegen toolchain in-package) | 0 (+ solid-js peer) | 1 (+ 4 Angular peers) | 6 (framework-bundled) |
| API surface | 5 exports (`router`, `route`, `navigate`, `href`, `resetRouter`) | Large (router, Link, navigate, loaders, search schemas) | `createRouter`, `RouterView`, `RouterLink`, composables | `<Router>`, `<Route>`, `<A>`, `useX` primitives | `provideRouter`, `RouterOutlet`, `RouterLink`, guards | File conventions + `<Link>` + `useRouter` |
| Anchor interception | Plain `<a>`, default-on (`intercept: false` opts out) | `<Link>` | `<RouterLink>` | Plain `<a>`, default-on (`explicitLinks` opts out) | `RouterLink` | `<Link>` (prefetch + client nav) |

HellaJS is the minimalist here: a standalone signal-driven router with five exports, one resolution algorithm, and no framework entanglement. TanStack and Next.js push toward full-stack type-safe contracts; Vue, Solid, and Angular are coupled to their component trees. HellaJS sits closest architecturally to Solid Router — both are signal-based and intercept plain anchors by default — but HellaJS exposes the entire route state as one reactive signal, keeps resolution synchronous end to end, and runs server-side via a `url` option rather than a framework SSR stack.

---

## 2. Architecture & Routing Strategy

### HellaJS

The router is a singleton state machine over `@hellajs/core` signals: one `route` signal holds the complete current match, and nine config signals (`routes`, `hooks`, `redirects`, `notFound`, `mode`, `base`, `scrollBehavior`, `previousPath`, `inheritMeta`) hold the configuration (`lib/route.ts`, `lib/internal/state.ts`). Re-calling `router()` rewrites all of them and swaps the listeners in place (`lib/router.ts`).

- **Five-phase resolution pipeline with early exit:** global redirects (pattern match with param capture, query ignored) → string redirects in the route map → nested routes (sorted by specificity) → flat routes (object entry order) → `notFound` (string → replace-redirect, function → handler) (`lib/internal/resolve.ts`). A synchronous hop counter caps re-entrant resolutions at 20, and a separate cross-await counter caps deferred redirect chains at 20 async hops — both log `[router] redirect loop detected`-style errors and cancel instead of overflowing the stack on cyclic configs (`lib/internal/resolve.ts`).
- **Synchronous end to end — until a guard goes async.** `router()` resolves the initial route inline and returns the matched `RouteInfo`; `navigate()` with sync guards resolves, writes the signal, and commits history before returning (`lib/router.ts`, `lib/internal/resolve.ts`). A `Promise`-returning guard is the one deferral point: the commit waits on its resolution with `route().pending === true` (client-only; SSR `url` mode stays fully synchronous, where a `Promise` proceeds with only its rejection logged).
- **Server-runnable.** `router({ url })` resolves the initial route against a supplied URL instead of `window.location` — full request URL or path, origin and hash ignored — so the same router runs inside a Node/Bun request handler and re-resolves on every call for per-request SSR (`lib/router.ts`).
- **No rendering coupling.** The matched handler is a user function (typically writing a view signal); the router never touches the DOM. It composes with `@hellajs/dom`, any other renderer, or vanilla JS.

### TanStack Router

TanStack Router builds a generated route tree (`routeTree.gen.ts`) from route files at build time and types every downstream API from it — `<Link to>`, `navigate({ search })`, loaders, `validateSearch` (per its README and the `router-core` dist's `fileRoute`, `searchParams`, `validators`, `structuralSharing` modules). Search params are first-class typed state with parse/validate/serialize/inherit semantics, and the runtime carries loaders, an LRU route cache, prefetch-on-intent, and pending/error UI boundaries (`lru-cache`, `load-client`/`load-server`, `scroll-restoration`, `not-found` modules in `@tanstack/router-core`). It is the heaviest non-framework router here and the only one that requires codegen as the primary path.

### Vue Router

Vue Router configures a `Routes` array through `createRouter({ history, routes })` and renders matches through `<RouterView>` with `<RouterLink>` for navigation, on Vue's proxy reactivity. History is pluggable via `createWebHistory` / `createWebHashHistory` / `createMemoryHistory` (verified in the 5.2 published types). The v5 package ships the file-based-routing and typed-routes codegen in-package — `vue-router/unplugin` and `vue-router/vite` exports, a `vue-router-auto-resolver` generated at build time by the bundled unplugin — which is why its `dependencies` list includes the toolchain (chokidar, unplugin, tinyglobby, magic-string, and 13 more). Data loaders live behind an `experimental/pinia-colada` export with `@pinia/colada` as an optional peer.

### Solid Router

Solid Router renders a `<Router>` component whose children are `<Route path component>` elements (or a config array), with nesting expressed through `props.children` instead of an `<Outlet>`. It is the most data-rich client router after TanStack: `preload` functions fire on link hover with an `intent` argument, `query` dedupes fetches with a 5-second preload cache and a 5-minute back/forward cache, `action` handles mutations with revalidation, and `createAsync`/`createAsyncStore` bridge results into Solid reactivity (per the 1.0 README). SSR works by passing `url` to the server-side `<Router>`.

### Angular Router

Angular Router configures routes through `provideRouter(routes, ...features)` with deep DI integration — guards, resolvers, `data`, `providers`, lazy `loadChildren`/`loadComponent` all ride the route definitions (verified in the 22.1 published types). It is the maximalist of the config-object camp: four guard types, `RouteReuseStrategy`, `PreloadingStrategy`, `TitleStrategy`, `withComponentInputBinding` (route state → component `input()`s), `withInMemoryScrolling`, matrix params, and custom `UrlMatcher` functions.

### Next.js Router

Next.js removes the configuration object entirely: folders under `app/` are URL segments, and `page`/`layout`/`loading`/`error`/`not-found` files define each segment's UI (per current nextjs.org docs read this session). Routes render on the server by default with `params` and `searchParams` as async `Promise`s, `<Link>` prefetches on viewport entry, and navigation is a client-side transition over streamed server output. It is a full-stack framework paradigm, not a client router you adopt — there is no `createRouter` and no route map to inspect.

**Verdict:** HellaJS, Solid Router, and Vue Router share the client-side declarative-map shape; TanStack and Angular push maximalist type/data contracts; Next.js is a different paradigm. HellaJS is the only one here that treats routing as pure reactive state with no opinion about components, rendering, or data fetching — closest sibling Solid Router, which ships more router (preload, queries, actions) coupled to Solid's component context.

---

## 3. Dependencies

| | HellaJS (router) | TanStack Router | Vue Router | Solid Router | Angular Router | Next.js Router |
|---|---|---|---|---|---|---|
| Runtime deps | 0 | 4 (`@tanstack/router-core`, `@tanstack/history`, `@tanstack/react-store`, `isbot`) | 17 (incl. `unplugin`, `chokidar`, `tinyglobby`, `magic-string`, `@babel/generator`) | 0 | 1 (`tslib`) | 6 (`@next/env`, `@swc/helpers`, `postcss`, `styled-jsx`, …) |
| Peer deps | `@hellajs/core` | `react`, `react-dom` | `vue`, `vite`, `@vue/compiler-sfc`, `pinia`, `@pinia/colada` | `solid-js` | `@angular/common`, `@angular/core`, `@angular/platform-browser`, `rxjs` | `react`, `react-dom`, `sass`, … |

Sources: each package's published `package.json`, fetched from the npm registry this session.

- HellaJS declares zero runtime dependencies and a single peer — the reactivity core (`package.json`). The published `dist/` ships a per-module tree-shakable layout (`./navigate`, `./route`, …) plus a pre-bundled `@hellajs/router/bundle` entry; its only imports from core are `signal` and four utility functions re-exported through one internal shim (`lib/internal/core.ts`).
- TanStack is the heaviest non-framework router: the React adapter plus `router-core`, a custom history package, a store, and `isbot` — the cost of the generated-type and loader/search-schema runtime.
- Vue Router's dependency footprint is the largest in the group because the v5 package ships its file-based-routing/typed-routes codegen in-package; the browser entry doesn't execute the toolchain, but a plain `npm install vue-router` pulls all 17 packages.
- Solid Router is the leanest framework-coupled option: zero dependencies of its own, one peer.
- Angular Router is meaningless without the rest of Angular (four Angular peers plus `rxjs`). Next.js's router is not separately installable — it ships with the framework.

HellaJS and Solid Router are the only two here with zero runtime dependencies; HellaJS is additionally the only one whose single peer is a reactivity package rather than a framework.

---

## 4. Route Matching

| Router | Matching strategy | Specificity | Wildcards | Custom matcher |
|---|---|---|---|---|
| HellaJS | `split("/")` segment walk per pattern; nested recursion | Sort: non-wildcard first, then deeper (`lib/internal/utils.ts`) | `*` captures rest, no leading slash; `:param?` optional | No |
| TanStack | Generated route tree; ranked matches | Codegen-resolved | `*` splats, optional params | Param parsers at match time |
| Vue Router | Path-to-regex; first match wins | Manual order | `:param(.*)`, `/*` | Custom regex per param |
| Solid Router | Path rank by segments | Auto-ranked | `*`, `*name` | `matchFilters` (enum/regex/predicate) |
| Angular | First match wins; `pathMatch: full\|prefix` | Manual order | `**` | `UrlMatcher` function |
| Next.js | File-system, build-time | Folder precedence | `[...slug]` catch-all | — |

HellaJS's matcher is the simplest in this group — no regex engine, no codegen, one comparison function:

- **Segment walk with deferred allocation.** `matchPattern()` splits pattern and path on `/`, compares segment by segment, extracts `:param` keys (a `:param?` segment matches-or-skips via backtracking), and returns the frozen `EMPTY_OBJECT` singleton for static matches so param-less routes share one object (`lib/internal/match.ts`, `lib/internal/utils.ts`).
- **Specificity sort at every nesting level.** Nested candidates are sorted non-wildcard-before-wildcard, then by segment depth, before iteration (`lib/internal/utils.ts`, `lib/internal/match.ts`) — `/api/v1/users` beats `/api/*` regardless of declaration order. Flat routes are deliberately unsorted: first declaration wins, so specific patterns belong earlier in the object (`lib/internal/resolve.ts`).
- **Nested param inheritance by spread.** Child params merge over parent params at each level (`{ ...match.params, ...childMatch.params }`), so parent keys flow to the leaf and child keys win on conflict (`lib/internal/match.ts`).
- **Parent fallback.** A nested match whose remaining path matches no child falls back to the parent's handler when one exists, or fails the whole branch when not (`lib/internal/match.ts`).
- **Wildcard captures without a leading slash** — `/files/*` at `/files/docs/readme.md` yields `params["*"] === "docs/readme.md"` (`lib/internal/match.ts`).
- **No regex or type constraints.** Unlike Vue Router (`:id(\d+)`), Solid Router (`matchFilters`), and Angular (`UrlMatcher`), a `:param` matches any non-empty segment; validation belongs to the handler. Optional `:param?` segments are supported — `?` in a pattern always means optional, never a query separator.

**Verdict:** HellaJS's matcher trades the power features (regex constraints, typed matchers, ranked codegen trees) for a small, allocation-conscious segment walk that covers static, dynamic, optional, wildcard, and nested cases. The omission of regex matching is a real gap when you need route-level validation; the payoff is a matcher you can hold in your head.

---

## 5. Navigation & History Integration

### HellaJS

Navigation funnels through one guard-aware path: `go()` runs the full resolution pipeline first and only commits `pushState`/`replaceState` when the verdict is `"matched"` — a cancelled guard never leaves a stray history entry (`lib/internal/resolve.ts`). Hash mode prefixes the target with `#` and ignores `base`; history mode uses the path as-is, prefixed with the configured `base` on commit and stripped again on every URL read (init, `popstate`, intercepted clicks) so subpath deploys — GitHub Pages, `/~user/`, shared hosts — never hand-prefix patterns or links (`lib/internal/resolve.ts`, `lib/internal/utils.ts`); memory mode skips the history commit entirely — `route()` advances while the URL stays untouched (`lib/internal/resolve.ts`).

- `navigate(pattern, options)` substitutes `:param` values through `encodeURIComponent`, inserts `*` raw via a replacer function (wildcards carry path slashes; the function form defeats `$&`/`$$` interpretation), strips unmatched `:param` tokens, and serializes query keys and values encoded (`lib/navigate.ts`).
- One `popstate` listener (history mode) or `hashchange` listener (hash mode) drives browser back/forward; on a cancelled guard the handler restores the previous URL with `replaceState` so the address bar never lies (`lib/router.ts`). Hash mode ignores hashes that don't start with `#/` — plain in-page anchors stay native (`lib/router.ts`).
- **Plain-`<a>` interception is default-on**: a bubble-phase `click` listener on `document` resolves `event.target.closest("a")` and routes same-origin http(s) clicks through `navigate()` (`lib/router.ts`). The skip list is exhaustive: already-default-prevented events, modifier keys, `target !== "_self"`, `download`, malformed hrefs, cross-origin links, non-`#/` hashes in hash mode, and — in history mode — hrefs differing from the current URL only by hash, so in-page anchor jumps stay native (`lib/router.ts`). `intercept: false` restores full page navigation.
- Re-calling `router()` detaches the previous listeners via a composed cleanup closure before attaching fresh ones (`lib/router.ts`).

### Competitors

Every router here integrates the History API behind its own abstraction layer, and every one intercepts anchor clicks — through a component (`<Link>` / `<RouterLink>` / `<A>`) or, for Solid and HellaJS, plain `<a>` tags by default.

- Solid opts out via `explicitLinks: true`, HellaJS via `intercept: false`.
- **Vue Router** decouples history strategy into factory functions (web/hash/memory) and takes the deploy subpath as `createWebHistory(base)`; HellaJS folds both into config — one `mode` field with three values and a `base` field (history mode only) that keeps route patterns and `navigate()` targets base-free (`lib/types.d.ts`, `lib/router.ts`).
- **Solid Router's** `useBeforeLeave` hook offers `preventDefault` and `retry(force?)` for unsaved-form flows; HellaJS covers the same flow with route-level `leave` guards and the `navigate({ force: true })` override (`lib/internal/matched.ts`, `lib/navigate.ts`).
- **Next.js** prefetches `<Link>` targets on viewport entry — link-granular prefetching none of the others match (TanStack and Solid preload via route hooks, not link visibility).
- **TanStack** abstracts history behind `@tanstack/history` to support its own navigation lifecycles and streaming transitions.

**Verdict:** HellaJS and Solid are the only routers here that intercept plain `<a>` clicks out of the box, and HellaJS's guard-aware `go()` means history and route state can never disagree. The remaining gap is link prefetching (Next.js only, at viewport granularity).

---

## 6. Lifecycle Hooks & Guards

### HellaJS

Guards run before the route signal is written — a cancelled navigation produces no observable route change, no handler execution, and no history commit (`lib/internal/matched.ts`). The execution order is strict: departing-route `leave` guards (global `leave` → child `leave` → parent `leave`) → global `before` → parent `before` → child `before` (top-down) → `handler` → child `after` → parent `after` (bottom-up, LIFO) → global `after`, with each nested level's hooks receiving that level's cumulative inherited params (`lib/internal/matched.ts`).

- **Sync guards block with three verdicts:** `false` cancels, a non-empty string redirects via replace, a throw cancels and logs `[router] …`; `void`/`true`/anything else proceeds (`lib/internal/matched.ts`). The first non-pass verdict short-circuits the chain — a failing parent `before` means the child's never runs.
- **Leave guards guard the departed route.** A module-level snapshot of the last committed match (root→leaf route values, recorded in `commitMatch`, cleared on notFound commits and `resetRouter`) backs `leave` guards: global `hooks.leave(to, from)` runs first, then the chain's `leave` hooks child→parent with the departed route's params/query, sharing the same verdict interpretation. `navigate({ force: true })` skips them, same-path navigation (query ignored) never fires them, and they never run on init/SSR — there is no chain until the first commit (`lib/internal/matched.ts`, `lib/navigate.ts`).
- **Global hooks carry navigation context.** `hooks.before`/`after` receive `(to, from)` paths — `to` is the incoming path including its query string, `from` is the pre-commit source path — so redirect-to-login-with-`?next=<target>` guards and analytics read the destination directly (`lib/internal/matched.ts`, `lib/internal/hooks.ts`).
- **Async guards block via fast-path deferral.** On the client, a returned `Promise` defers the commit: `route().pending` flips `true` (previous match preserved), the URL/handler/history stay untouched, and the resolution is interpreted as the verdict (`false` cancels, non-empty string redirect-replaces, else proceeds; rejection cancels + logs) (`lib/internal/matched.ts`, `lib/internal/resolve.ts`). A second navigation during the wait supersedes the deferred one via an epoch check; cross-await redirect chains carry their own 20-hop cap. SSR `url` mode cannot block — a `Promise` proceeds with only its rejection logged, keeping `router()` synchronous on the server (`lib/internal/matched.ts`).
- **Arity-based dispatch.** On param-less routes, `executeHook()` inspects `fn.length`: two-or-more parameters receives `(undefined, query)`, otherwise `(query)` — so the recommended full `(params, query)` signature receives query on every route shape (`lib/internal/hooks.ts`).
- **Error isolation throughout.** Handler and hook throws, and async rejections, are caught and logged with a `[router]` prefix; the route signal is never corrupted by a hook error, and every error in a single navigation is logged (`lib/internal/hooks.ts`).
- **Redirect loops cancel.** Mutually redirecting guards or cyclic redirect rules hit the 20-hop cap and cancel with a logged error rather than overflowing the stack (`lib/internal/resolve.ts`).

### Competitors

The framework routers treat guards as async-capable first-class citizens, with the richest surface in Angular.

- **Vue Router** supports `beforeEach`, `beforeEnter`, `beforeRouteEnter`/`Update`/`Leave`, all capable of async cancellation or redirect by returning `false`, a route location, or a `Promise`.
- **Angular** has the most guard surface: `CanActivate`, `CanActivateChild`, `CanDeactivate` (with the component instance for unsaved-form checks), and `CanMatch` (runs during matching, can fall through to sibling routes); all return `boolean | UrlTree | RedirectCommand | Promise | Observable` (verified in the 22.1 types).
- **TanStack** routes declare `beforeLoad`, which throws typed `redirect()` objects and integrates with the loader pipeline — blocking and async by design.
- **Solid Router** has `useBeforeLeave` with `preventDefault()` and `retry(force?)`; its `preload` functions run on hover/navigate with an `intent` argument.
- **Next.js** handles gates at the segment level (middleware, layout server checks), not through per-route hooks.

**Verdict:** HellaJS ships real guards with atomic pre-commit semantics — cancel, redirect, URL restoration on popstate/hashchange cancels, departing-route `leave` guards with a `force` override (Angular `CanDeactivate` / Vue `onBeforeRouteLeave` / Solid `useBeforeLeave` parity), and client-side async blocking with a `pending` flag — matching the guard capability set of Vue/Angular/TanStack. The remaining asymmetry is server-side: async guards cannot block an SSR render (SSR stays synchronous by design), so server-validated navigation flows still resolve client-side after hydration.

---

## 7. Parameter, Query & Meta Handling

### HellaJS

Params and query are plain string records, decoded symmetrically with how `navigate()` encodes them; metadata travels on routes and merges through the nested chain.

- **Compile-time param typing without codegen.** `ExtractParams<T>` recursively parses a template-literal path into an exact param-object type, carried through `navigate<T>(path, options)` so `navigate("/users/:id", { params: { wrongKey: "x" } })` is a TypeScript error (`lib/types.d.ts`, `lib/navigate.ts`). At runtime the wrong key is silently dropped and the unmatched `:id` stripped from the URL.
- **Symmetric URL coding.** `:param` values encode via `encodeURIComponent` on the way out and decode on the way in — segment values and wildcard captures both pass through `decodeURIComponent` at match time; query keys and values encode and decode the same way (`lib/navigate.ts`, `lib/internal/match.ts`).
- **Meta with an opt-in cascade.** By default the leaf route's `meta` wins. Global `inheritMeta: true` merges parent→child with child precedence; each route can override the flag in either direction — `false` creates a boundary that drops ancestors above, `true` opts in when the global is off (`lib/internal/resolve.ts`). Inline `navigate({ meta })` merges over the resolved result and wins on conflict (`lib/internal/resolve.ts`).
- **Match-chain introspection built in.** `route().crumbs` exposes the parent-to-leaf chain, each crumb carrying the route-map key (`segment`), the cumulative linkable URL (`path`), and the params inherited through that level; `notFound` resolves to an empty frozen array (`lib/internal/resolve.ts`, `lib/internal/utils.ts`). `route().active(pattern)` is a shared reactive predicate with ancestor semantics and segment boundaries — `/admin` is not active at `/administrators`, and root `/` matches exactly so a home link lights up only at `/` (`lib/route.ts`).
- **All values are strings.** No query schema validation, no parsed params (contrast TanStack's `validateSearch` and structural sharing).

### Competitors

The competitors layer progressively more typing and data structure onto params and query.

- **TanStack** treats search params as first-class typed state — schemas, parsing, inheritance, structural sharing — the gold standard for query handling in this group.
- **Vue Router** supports per-param regex, repeatable and optional params, and typed routes generated by the bundled codegen.
- **Solid Router** validates params with `matchFilters` and names wildcards (`*any`); `useSearchParams` is a typed signal.
- **Angular** uniquely supports matrix params scoped to individual segments, and `withComponentInputBinding` binds params/query/data straight to component `input()`s.
- **Next.js** exposes `params`/`searchParams` as async `Promise`s on server pages (`string | string[]` values), with `useSearchParams` on the client.

**Verdict:** HellaJS's template-literal typing is a genuine zero-cost differentiator, and `crumbs`/`active()` give it built-in match-chain ergonomics the others build by hand (Vue's `route.matched`, TanStack's `useMatches`, Solid's `useCurrentMatches`). The data-richness gap is query schemas and param validation — values stay strings with no parse layer.

---

## 8. Built-in Features Matrix

| Feature | HellaJS | TanStack | Vue Router | Solid Router | Angular Router | Next.js Router |
|---|---|---|---|---|---|---|
| Nested routes | Yes (`children`, param inheritance) | Yes (route tree) | Yes (`children` + `<RouterView>`) | Yes (`<Route>` + `props.children`) | Yes (`children` + `<router-outlet>`) | Yes (nested folders + layouts) |
| Dynamic segments | `:id` | `:id` | `:id` (+ regex) | `:id` (+ `matchFilters`) | `:id` | `[id]` folder |
| Wildcard / catch-all | `*` | `*` splat | `:param(.*)` | `*` / `*name` | `**` | `[...slug]` |
| Optional params | Yes (`:id?`) | Yes | Yes (`:id?`) | Yes (`:id?`) | No | Route groups |
| Regex matchers | No | Param parsers | Yes | Yes (filters) | Yes (`UrlMatcher`) | No |
| History modes | `history`, `hash`, `memory` | Custom history | web, hash, memory | web, hash, memory, static | Path, Hash | History (built-in) |
| Base path | Yes (`base` config, history mode) | Yes (`basepath`) | Yes (`createWebHistory(base)`) | Yes (`base`) | Yes (`APP_BASE_HREF`) | Yes (`basePath`) |
| Programmatic navigation | `navigate()` | `navigate()` | `router.push/replace` | `useNavigate()` | `router.navigate` | `useRouter().push/replace` |
| Anchor interception | Plain `<a>`, default-on | `<Link>` | `<RouterLink>` | Plain `<a>`, default-on | `RouterLink` | `<Link>` |
| Global hooks | `hooks.leave`/`before`/`after` (guards block, sync or async) | `beforeLoad` per route | `beforeEach`/`afterEach` | `useBeforeLeave` | Guards | Middleware |
| Per-route guards | `before` incoming, `leave` departing (blocking) | `beforeLoad` (blocking) | `beforeEnter` (blocking) | `useBeforeLeave` (blocking) | `CanActivate` etc. (blocking) | Layout/middleware checks |
| Leave guards | `leave` (blocking) + `navigate({ force })` override | No | `beforeRouteLeave` (blocking) | `useBeforeLeave` (blocking) | `CanDeactivate` (blocking) | No |
| Async-blocking guards | Yes (client; SSR proceeds) | Yes | Yes | Partial (leave only) | Yes | n/a (server-side) |
| Loaders / data fetching | No (pair `@hellajs/resource`) | Yes (typed loaders, cache, prefetch) | Experimental (`pinia-colada`) | Yes (`preload`, `query`, `createAsync`) | Yes (resolvers, blocking) | Yes (Server Components) |
| Redirects | String map + `redirects` array (pattern `from`, param substitution), 20-hop loop cap | `redirect()` helper | `redirect` on route/config | `throw redirect()` | `redirectTo`, `RedirectCommand` | `redirect()` server-side |
| 404 handling | `notFound` (fn receives attempted path, or string) | `notFoundComponent` | Catch-all route | `*404` route | `**` route | `not-found` file |
| Route metadata | Per-route `meta` + opt-in cascade + inline merge | Route `meta`, `staticData` | Route `meta` fields | Route `info` | Route `data` + resolvers | `metadata` export |
| Match chain / breadcrumbs | `route().crumbs` built-in | `useMatches()` | `route.matched` | `useCurrentMatches()` | `ActivatedRoute.pathFromRoot` | — |
| Active-link helper | `route().active()` (ancestor, reactive) | `<Link activeOptions>` | `router-link-active` classes | `<A activeClass end>` | `routerLinkActive` | `usePathname` manual |
| Scroll control | 3 tiers + custom fn `(to, from, savedPosition)` | `scrollRestoration` | `scrollBehavior(to, from, saved)` | `noScroll` per link | `withInMemoryScrolling` | `scroll={false}` per `<Link>` |
| Type-safe routes | `ExtractParams<T>`, no codegen | Generated route tree (full) | Codegen (bundled) | Manual + `MatchFilters` | Manual | `PageProps` (async params) |
| SSR | `router({ url })` + `@hellajs/ssr` hydrate | Yes (TanStack Start) | Yes (Nuxt) | Yes (`<Router url>`) | Yes (Angular SSR) | Native |
| Code splitting | User-managed (dom `Lazy`) | Built-in (route files) | `() => import(...)` | `lazy(() => import(...))` | `loadComponent`/`loadChildren` | Built-in per route |

### Notable HellaJS differentiators

- **Five exports, period** — `router`, `route`, `navigate`, `href`, `resetRouter` (`lib/index.ts`). No link component, no outlet, no `useX` hooks, no provider, no DI.
- **Single reactive route signal** — `route()` exposes handler, params, query, path, meta, crumbs, and the shared `active` predicate in one object (`lib/route.ts`). No `useParams` + `useLocation` + `useMatch` decomposition.
- **Atomic route commits** — every navigation path (`navigate`, `popstate`, `hashchange`, init) funnels through one `route()` write inside `commitMatch`, so path/params/query/handler/meta/crumbs always describe the same match (`lib/internal/resolve.ts`).
- **Sync init + server `url` mode** — `router()` returns the resolved `RouteInfo`, and `router({ url })` re-resolves per call for request-scoped SSR with no `window` (`lib/router.ts`).
- **`resetRouter()` teardown** — factory-resets all ten signals and detaches listeners without touching the URL, for HMR and session resets (`lib/resetRouter.ts`).
- **Three-tier scroll behavior** — inline `navigate({ scroll })` > route-level `scroll` > global `scrollBehavior`, with custom `(to, from, savedPosition) => { top, left? } | null` functions (`savedPosition` restores the captured position on back/forward; the stack mirrors pushState entries — replaces never push), `false` to disable at any tier, and an auto-skip when `to === from` (`lib/internal/matched.ts`, `lib/internal/resolve.ts`).
- **Frozen singletons on the hot path** — param-less matches and childless crumbs reuse `EMPTY_OBJECT`/`EMPTY_CRUMBS`; params allocation defers behind `hasParams` (`lib/internal/utils.ts`, `lib/internal/match.ts`).
- **Reactive reconfiguration** — re-calling `router()` swaps the whole route map, hooks, redirects, and listeners atomically (`lib/router.ts`).

---

## 9. Ergonomics & Syntax

```js
import { signal, effect } from "@hellajs/core";
import { router, route, navigate } from "@hellajs/router";

const currentView = signal(null);

router({
  routes: {
    "/":            () => currentView(HomePage()),
    "/users/:id":   (params) => currentView(UserProfile({ id: params.id })),
    "/search":      (params, query) => currentView(Search({ q: query.q })),
    "/files/*":     (params) => currentView(FileViewer({ path: params["*"] })),
    "/dashboard": {
      before: () => authed() ? true : "/login",   // sync guard: false / string / throw
      handler: () => currentView(Dashboard()),
      after:  () => trackPageView("dashboard"),
      meta:   { title: "Dashboard" },
      scroll: "top",
      children: { "/settings": () => currentView(Settings()) }
    },
    "/old": "/new"                                  // string redirect
  },
  redirects: [{ from: ["/tasks", "/items"], to: "/todos" }],
  hooks: { before: () => loading(true), after: () => loading(false) },
  notFound: () => currentView(NotFound())
});

effect(() => {
  document.title = route().meta?.title ?? "My App";
});

navigate("/users/:id", {
  params: { id: "123" },       // typed by ExtractParams<"/users/:id">
  query:  { tab: "overview" },
  replace: true,
  meta:   { analytics: "profile-view" }
});
```

The API is a configuration object plus four functions, not a component tree. Vue and Angular also use config objects but require a render outlet (`<RouterView>` / `<router-outlet>`); HellaJS handlers are plain functions that typically write to a signal the consumer owns. Solid and TanStack lean on JSX and context-bound primitives (`useNavigate`, `useParams`, `useMatch`) — familiar, but more API to learn and unusable outside their framework. Next.js removes configuration entirely (the file system is the config) at the cost of the framework's build pipeline. Active links and breadcrumbs read straight off `route()` — `route().active("/dashboard")` and `route().crumbs.map(c => c.path)` — where Solid needs `<A>`/`useCurrentMatches`, Vue needs `RouterLink` classes/`route.matched`, and TanStack needs `activeOptions`/`useMatches`.

---

## Bottom Line

Architecturally, HellaJS router is the minimalist of this group: a signal-driven config-object router with a five-phase resolution pipeline, nested param inheritance, a complete sync hook lifecycle, and built-in match-chain introspection — five exports, zero runtime dependencies, no build step. It belongs in the client-side reactive-router camp alongside Solid Router, with Vue Router as the mature elder sibling and TanStack/Angular as the maximalist alternatives; Next.js is a different paradigm and not directly comparable on mechanism.

What sets HellaJS apart — and no single competitor matches all of:

1. **Routing as one reactive signal, five exports total** — `route()` carries the entire match (handler, params, query, meta, crumbs, `active`) with no provider, outlet, hooks, or DI; usable outside any UI framework (`lib/route.ts`, `lib/index.ts`).
2. **Zero runtime dependencies, one reactivity peer** — the only router here whose sole dependency is a signals package rather than a framework (`package.json`).
3. **Synchronous resolution by default** — init and `navigate()` with sync guards return fully resolved, with guard-aware history commits that never leave a stray entry; async guards defer explicitly through `route().pending` rather than an implicit microtask window (`lib/router.ts`, `lib/internal/resolve.ts`).
4. **Server-runnable without a framework** — `router({ url })` resolves per request against the incoming URL, pairing with `@hellajs/ssr` and `hydrate` for isomorphic apps (`lib/router.ts`).
5. **Compile-time param typing without codegen** — `ExtractParams<T>` infers param names from any string literal at zero runtime cost; TanStack and Next.js need generated files for the same guarantee (`lib/types.d.ts`).
6. **Atomic pre-commit guards — incoming `before` and departing `leave`, sync or async — with URL restoration** — guards run before the signal write and history commit; async guards defer with `route().pending`; cancelled popstate/hashchange restores the address bar via `replaceState`, and `navigate({ force: true })` overrides leave guards for unsaved-form flows (`lib/internal/matched.ts`, `lib/router.ts`).
7. **Built-in match-chain ergonomics** — `crumbs` (linkable parent-to-leaf chain) and the shared `active()` ancestor predicate come off the route signal; competitors assemble these from `route.matched`/`useMatches`/`useCurrentMatches` by hand (`lib/internal/resolve.ts`, `lib/route.ts`).

Its gaps: **no loaders, data cache, or prefetching** (pair `@hellajs/resource`; TanStack and Solid ship these), **no query-param schemas or regex matchers** (params and query stay string records, and optional params stay untyped `string | undefined` at the handler), **no route-level code-splitting primitives** (dom's `Lazy` is user-managed), **async guards that cannot block an SSR render** (the server resolution stays synchronous; client-side blocking begins after hydration), a **single global router instance** — configuration is module-level singleton state, so concurrent streaming SSR relies on synchronous resolution rather than a router-per-request scope (documented in `docs/patterns/routing-ssr.mdx`) — and an **ecosystem** orders of magnitude behind Vue Router and Next.js. If you need typed search schemas, loaders, or link prefetching, TanStack Router or one of the framework routers is the better tool. If you want a tiny, framework-agnostic reactive router with default-on SPA links, sync-by-default guards that also block on async, and SSR without a meta-framework, HellaJS is the leanest option here.
