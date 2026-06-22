# HellaJS @hellajs/router vs. TanStack Router / Vue Router / Solid Router / Angular Router / Next.js Router

A ground-up comparison based on the actual source code of `@hellajs/router` v2. Every claim below was verified against `packages/router/lib/`. Competitor versions researched: TanStack Router (latest, per tanstack.com/router, mid-2026), Vue Router 4 (current v4.x docs, per router.vuejs.org), `@solidjs/router` 0.16.1 (per Bundlephobia + GitHub README), Angular Router 22 (per angular.dev/guide/routing), Next.js App Router (current docs, per nextjs.org/docs/app).

---

## 1. At-a-Glance Summary

| Dimension | HellaJS router | TanStack Router | Vue Router | Solid Router | Angular Router | Next.js Router |
|---|---|---|---|---|---|---|
| Routing model | Reactive signals, declarative map | Generated route tree, type-safe | Component-based `Routes` array | JSX or config array, signal-driven | `Routes` array + DI + `provideRouter` | File-system based (folders = routes) |
| Reactive model | Signals from `@hellajs/core` | Internal store (`@tanstack/store`) | Vue reactivity (refs/proxies) | Solid signals | Angular Signals + RxJS | React state / Server Components |
| Navigation model | History API (`popstate`/`hashchange`) | Custom history (`@tanstack/history`) | `createWebHistory` / `createWebHashHistory` / memory | `window` history + Router abstraction | `Location` + `UrlSerializer` + History | App Router (extends `<a>`) + `useRouter` |
| Type safety | Template-literal param extraction | Generated route tree (full) | Optional (typed routes opt-in) | Manual + `MatchFilters` | Manual | File-based typed `params`/`PageProps` |
| Gzipped size | ~2.3 KB (router only, min) | ~39.5 KB (react adapter) | ~24 KB (with devtools deps) | ~9.3 KB | ~30.7 KB | Bundled in Next.js (~100+ KB framework) |
| External deps | 0 + core peer | 4 (`@tanstack/router-core`, history, store, seroval) | Bundles `@vue/devtools-kit` etc. | 0 (peer on solid-js) | Many (Angular + rxjs) | Next.js framework |
| Compile step | None | Codegen (`routeTree.gen.ts`) | Optional (typed routes) | None (JSX or object) | Decorators / standalone | Required (Next.js build) |
| API surface | 3 exports (`router`, `route`, `navigate`) | Large (router, link, navigate, loaders, search schemas) | `createRouter`, `RouterView`, `RouterLink`, composables | `<Router>`, `<Route>`, `useNavigate`, `useParams`, etc. | `provideRouter`, `RouterOutlet`, `RouterLink`, guards | File conventions + `<Link>` + `useRouter` |
| Anchor interception | No (programmatic only) | Yes (`<Link>`) | Yes (`<RouterLink>`) | Yes (anchors by default; opt-out via `explicitLinks`) | Yes (`RouterLink`) | Yes (`<Link>` prefetch + client nav) |

HellaJS is the minimalist here: a standalone signal-driven router with three exports, a single resolution algorithm, and no framework entanglement. TanStack and Next.js push toward full-stack type-safe contracts; Vue/Solid/Angular are deeply coupled to their component trees. HellaJS is closest architecturally to Solid Router (signal-based, framework-light), but ships at roughly a quarter of the bytes and exposes the entire route state as one reactive signal rather than a constellation of hooks.

---

## 2. Architecture & Routing Strategy

### HellaJS

- **Single route signal.** The entire current route state (handler, params, query, path, meta) lives in one signal: `route()` (`lib/state.ts`). Components read it directly; no `useX` hooks, no provider.
- **Five-phase resolution algorithm** with early-exit at each phase: global redirects → string redirects in the route map → nested routes (sorted by specificity) → flat routes (object entry order) → `notFound` (`lib/utils.ts`). Each phase returns `true` on first match.
- **Reactive configuration.** Routes, hooks, redirects, `notFound`, mode, scroll behavior, and previous path are each stored as their own signal (`lib/state.ts`). Re-calling `router()` reconfigures everything, and the previous `popstate`/`hashchange` listener is removed (`lib/router.ts`).
- **First resolution deferred.** `queueMicrotask(() => updateRoute())` (`lib/router.ts`) avoids a race with signal subscriptions set up inside the same tick. `router()` returns immediately with `handler: null` until the microtask fires.
- **No rendering coupling.** HellaJS executes the matched handler (a user-supplied function, typically writing to a `currentView` signal); it never touches the DOM. This is what makes it usable with `@hellajs/dom`, React, vanilla JS, or anything else.

### TanStack Router

- A **generated route tree** (`routeTree.gen.ts`) is built from route files at build time and types every downstream API: `<Link to>`, `navigate({ search })`, `useLoaderData`, `validateSearch` (per tanstack.com/router overview). The route file is the application contract.
- Internal stack: `@tanstack/router-core`, `@tanstack/history`, `@tanstack/store`, `seroval` (serialization), `@tanstack/react-store` (per Bundlephobia dependency sizes). This is the heaviest non-framework router here.
- First-class **search-param schemas** with parse/validate/serialize/inherit semantics — HellaJS only parses queries into a string record.
- Built-in **loaders, prefetch on intent, caching, pending UI boundaries**, all tied to the route.

### Vue Router

- Official Vue router, configured via `createRouter({ history, routes })` and registered as a Vue plugin with `app.use(router)` (per router.vuejs.org guide). Component-coupled: routes map paths to Vue components rendered through `<RouterView>`.
- History is pluggable: `createWebHistory`, `createWebHashHistory`, `createMemoryHistory`.
- Reactive `useRoute()`/`useRouter()` composables; current route is a reactive proxy.
- Mature feature set: named routes, named views, aliases, programmatic `push`/`replace`, navigation guards (`beforeEach`, `beforeEnter`, `afterEach`), typed routes (opt-in).

### Solid Router

- Signal-driven router for SolidJS, configured via JSX `<Route>` children of `<Router>` or a route-definition array (per GitHub README). Component-coupled: `<Route component={...}>` with nested `<Route>` rendering through `props.children` (no `<Outlet>`).
- History modes: `<Router>` (history), `<HashRouter>`, `<MemoryRouter>`, plus SSR static routing.
- **Preload + Data APIs**: `preload` functions on routes, `query` (dedup + 5s preload cache + 5min back/forward cache), `action`, `createAsync`/`createAsyncStore`. This is the most data-rich client router after TanStack.
- `explicitLinks` prop disables default anchor interception; default is intercept all `<a>` tags.

### Angular Router

- Configured via `provideRouter(routes, ...features)` (standalone) or `RouterModule.forRoot()` (per angular.dev/guide/routing). Heavy DI integration; routes can declare `children`, `loadChildren`, `loadComponent`, guards, resolvers, `data`, `providers`.
- First-match-wins path matching with `pathMatch: 'prefix' | 'full'`, wildcard `**`, custom `UrlMatcher` functions, and `RedirectFunction`.
- Four guard types (`CanActivate`, `CanActivateChild`, `CanDeactivate`, `CanMatch`) all support functional forms. Resolvers block navigation and run before activation.
- **Matrix params** (URL-segment-scoped `;key=value`) — unique to Angular among this group.
- Feature-rich: `RouteReuseStrategy` (component state preservation), `PreloadingStrategy`, `TitleStrategy`, `withComponentInputBinding` (route state → component `input()`s), `withInMemoryScrolling`.

### Next.js Router

- **File-system based**: folders under `app/` map to URL segments; `page.tsx`/`layout.tsx`/`loading.tsx`/`error.tsx`/`not-found.tsx` files define the UI for each segment (per nextjs.org/docs/app).
- Server Components by default; `params`/`searchParams` are async `Promise`s on server pages. `<Link>` does route prefetching and client-side transitions.
- Route segments can be static, dynamic (`[slug]`), catch-all (`[...slug]`), parallel (`@folder`), intercepting (`(..)folder`).
- Not a drop-in client router — it's a full-stack framework routing paradigm. No `createRouter` config object; the file system is the configuration.

**Verdict:** HellaJS, Solid Router, and Vue Router share the "client-side declarative map" shape. TanStack and Angular push toward maximalist type/data contracts. Next.js is a different paradigm entirely. HellaJS is the only one here that treats routing as a pure reactive signal with no opinion about components, rendering, or data fetching — the closest sibling is Solid Router, but Solid ships more router (preload, queries, actions, `<A>` interception) at ~4× the byte cost.

---

## 3. Bundle Size & Dependencies

|  | HellaJS (router only) | HellaJS (+ core peer) | TanStack Router | Vue Router | Solid Router | Angular Router |
|---|---|---|---|---|---|---|
| Min+gzip | ~2.3 KB | ~5.2 KB | ~39.5 KB | ~24 KB | ~9.3 KB | ~30.7 KB |
| Minified | ~5.4 KB | ~14 KB | ~126 KB | ~72 KB | ~25 KB | ~122 KB |
| Runtime deps | 0 | + core | 4 | bundles devtools | 0 | many |

Sources: HellaJS numbers from `packages/router/dist/sizes.json` (router min variant 5.44 KB / 2.27 KB gzip); competitors from Bundlephobia (`@tanstack/react-router`, `vue-router`, `@solidjs/router` 0.16.1, `@angular/router` 22.0.2, fetched this session).

- HellaJS declares zero runtime dependencies and one peer dep (`@hellajs/core` ^1.0.6) (`packages/router/package.json:26-28`). The published `dist/` ships a tree-shakable per-module layout (`./match`, `./navigate`, `./hooks`, etc.) plus a pre-bundled `@hellajs/router/bundle` entry (`packages/router/package.json:7-20`).
- TanStack is the heaviest non-framework router in this group: ~39.5 KB min+gzip with `@tanstack/router-core` (146 KB), `seroval` (74 KB), `@tanstack/history`, `@tanstack/store`, and `@tanstack/react-store` pulled in. That cost buys generated type safety and the loader/search-schema runtime.
- Solid Router is the leanest framework-coupled option at ~9.3 KB with zero dependencies of its own (peer on `solid-js`). Vue Router's Bundlephobia entry pulls in `@vue/devtools-kit` (~172 KB raw) — production cost is smaller but the install footprint is larger than HellaJS's entire bundle.
- Angular Router is meaningless without the rest of Angular (peer on `@angular/core`, `@angular/common`, `@angular/platform-browser`, `rxjs`).
- Next.js "router" is not separately installable; it ships with the framework.

HellaJS is the smallest standalone router here by an order of magnitude vs. TanStack and Angular, and roughly a quarter the size of Solid Router. The trade-off is feature surface: no built-in loaders, no devtools, no SSR, no codegen.

---

## 4. Route Matching

| Router | Matching strategy | Specificity | Wildcards | Custom matcher |
|---|---|---|---|---|
| HellaJS | Single-pass `split('/')` per pattern; nested recursion | Sort by non-wildcard-then-depth | `*` captures rest without leading slash | No |
| TanStack | Generated route tree; ranked matches | Codegen-resolved | `*` splats, optional params | `-loader` files, params parse |
| Vue Router | Path-to-regex; first match wins | Manual order | `:param(.*)` regex, `/*` wildcard | Custom regex per param |
| Solid Router | Path rank by segments | Auto-ranked | `*` and `*name` | `matchFilters` (enum/regex/predicate) |
| Angular | First match wins; `pathMatch: full\|prefix` | Manual order | `**` wildcard | `UrlMatcher` function |
| Next.js | File-system, build-time | Folder precedence | `[...slug]` catch-all | — |

HellaJS's matcher is the simplest in this group — `matchPattern()` splits both pattern and path by `/`, compares segment by segment, and extracts `:param` keys into a flat object (`lib/match.ts`). Notable details:

- **Specificity sort for nested routes.** `sortRoutesBySpecificity()` orders non-wildcard patterns before wildcard patterns, then deeper paths before shallower ones (`lib/utils.ts`). Applied to nested route entries before iteration in `matchNestedRoute()` (`lib/match.ts`) and to top-level nested candidates in `tryMatchRoute()` (`lib/utils.ts`). This means `/api/v1/users` beats `/api/*` regardless of declaration order.
- **Flat routes match in object-entry order, unsorted.** The flat-route loop iterates `Object.keys(routeMap)` without sorting (`lib/utils.ts`). Author intent matters here — list specific patterns before generic ones. The specificity tests (`tests/specificity.test.ts`) confirm flat-route ordering is declaration order.
- **Wildcard captures without leading slash.** `params["*"] = pathParts.slice(baseLength).join("/")` (`lib/match.ts`) — so `/files/docs/readme.md` matched against `/files/*` yields `params["*"] === "docs/readme.md"`. The same key is reused at every nesting level.
- **Single-pass param allocation.** A `hasParams` flag defers params-object creation until a `:param` or `*` segment actually matches (`lib/match.ts 66, 75, 82`). If no dynamic segment is present, the function returns the frozen `EMPTY_OBJECT` (`lib/utils.ts`) — zero allocation for static routes.
- **Nested param inheritance via spread.** Child params are merged over parent params with `{ ...match.params, ...childMatch.params }` (`lib/match.ts`), so child keys override parent keys on conflict and parent keys flow through. The three-level inheritance test (`tests/hooks.test.ts`) verifies this end-to-end.
- **No regex matchers.** Unlike Vue Router (`:param(\\d+)`) or Solid Router (`matchFilters`), HellaJS patterns are pure segment equality or `:param` substitution. Type validation happens at the handler level.

**Verdict:** HellaJS's matcher is the leanest here. It forgoes the power features (regex constraints, typed matchers, codegen-ranked trees) in exchange for ~3.5 KB of matching code (`dist/sizes.json` match module) that handles static, dynamic, wildcard, and nested cases. The omission of regex matching is a real gap if you need route-level validation.

---

## 5. Navigation & History Integration

### HellaJS

- `navigate(pattern, options)` performs `:param` substitution with `encodeURIComponent`, raw (un-encoded) `*` substitution, and strips unmatched `:param` patterns from the resulting path (`lib/navigate.ts`). Query params are URL-encoded and joined with `&` (`lib/navigate.ts`).
- The `go()` helper either `pushState`s or `replaceState`s, then writes the new path into the `route` signal and triggers `updateRoute()` (`lib/utils.ts`).
- The router attaches a single `popstate` listener (history mode) or `hashchange` listener (hash mode) and cleans up the previous listener on re-init (`lib/router.ts`). Default mode is `"history"` (`lib/router.ts`).
- **No anchor interception.** HellaJS does not intercept `<a href>` clicks; client-side navigation requires explicit `navigate()` calls or user-installed event handlers (documented in `docs/api/router.mdx`). This is a deliberate scope decision — and a real ergonomic gap vs. every other router here.
- **Navigation is asynchronous.** Because the first `updateRoute()` is deferred via `queueMicrotask` (`lib/router.ts`), `route().path` is not immediately current after `navigate()` returns; effects are the intended read site.

### Competitors

- **TanStack, Vue, Solid, Angular, Next.js all intercept anchor clicks** via their `<Link>` / `<RouterLink>` / `<a>` equivalents. Solid Router even makes interception the default for plain `<a>` tags, requiring `explicitLinks` to opt out.
- **Vue Router** decouples history strategy into `createWebHistory`/`createWebHashHistory`/`createMemoryHistory` factories — HellaJS folds this into a single `mode` config field.
- **Angular** exposes `browserUrl` to let the address bar differ from the matched route, plus `UrlSerializer` customization. None of the others (including HellaJS) offer this.
- **Next.js** does route prefetching on `<Link>` hover/viewport — none of the others have built-in prefetch at this granularity (TanStack and Solid preload via route hooks, not link hover).
- **Solid Router** has a `useBeforeLeave` hook with `preventDefault` and `retry(force?)` for unsaved-form guards. HellaJS has nothing equivalent — its hooks cannot block navigation (`lib/hooks.ts`).

**Verdict:** HellaJS covers the essentials (history/hash modes, push/replace, params, query) but intentionally skips anchor interception, link prefetching, and navigation blocking. If you want `<a>` tags to behave like SPA links, you write the listener yourself. The upside is a tiny, predictable surface with zero DOM coupling.

---

## 6. Lifecycle Hooks & Guards

### HellaJS

- **Two scopes: global hooks (`hooks.before` / `hooks.after`) and per-route hooks (`before` / `after` inside a `RouteWithHooks`)** (`lib/types.d.ts 95-100`).
- **Strict execution order:** global.before → parent.before → child.before → handler → child.after → parent.after → global.after (`lib/internal/matched.ts`). After hooks iterate in reverse via a decrementing loop (`lib/internal/matched.ts`) — LIFO cleanup order, so parents clean up after children.
- **Hooks never block navigation.** All errors are caught and logged via `console.error("[router] …")` (`lib/hooks.ts` for sync, `lib/hooks.ts` for async promises). Async errors are caught with `.catch()` rather than awaited. Multiple errors in a single navigation are all logged (5 errors logged in `tests/errors.test.ts`), and the handler always runs.
- **Arity-based argument dispatch.** For static routes with no params, `executeHook()` inspects `handler.length`: 2+ arity receives `(undefined, query)`, otherwise `(query)` (`lib/hooks.ts`). This lets you write `(params, query) => …` consistently and still get `query` on param-less routes. Dynamic routes always pass `(params, query)`.
- **No guard concept.** `before` hooks fire before the handler but cannot prevent it. The documented pattern is to `navigate('/login')` from the hook and re-check auth inside the handler (`docs/concepts/routing.mdx:202-231`). This is honest about what it is — and is weaker than real guards.

### Competitors

- **Vue Router** supports `beforeEach`, `beforeEnter`, `beforeRouteEnter`, `beforeRouteUpdate`, `beforeRouteLeave`, all of which can cancel or redirect navigation by returning `false` or a route location. Guards are first-class.
- **Angular** has the most guard types: `CanActivate`, `CanActivateChild`, `CanDeactivate` (with component instance for unsaved-form checks), and `CanMatch` (runs during matching, can fall through to other routes). All return `boolean | UrlTree | RedirectCommand | Promise | Observable`.
- **Solid Router** has `useBeforeLeave` with `preventDefault` and `retry(force?)`.
- **TanStack** handles "guards" via `beforeLoad` on the route definition, which can throw `redirect()` — type-safe and integrated with the loader pipeline.
- **Next.js** handles auth at the segment level (middleware, `layout.tsx` server checks, or `loading.tsx`/`error.tsx` boundaries), not via per-route hooks.

**Verdict:** This is HellaJS's biggest functional gap. Every other router here can block or redirect a navigation before the handler runs; HellaJS cannot. The trade-off is simplicity (one execution model, never blocks, all errors are non-fatal) and a tiny code footprint (`lib/hooks.ts` is 61 lines total). If you need real guards, you'll either work around it (handler-side checks) or pick a different router.

---

## 7. Parameter, Query & Meta Handling

### HellaJS

- **Type-safe param extraction at compile time.** `ExtractParams<T>` recursively parses a template-literal path string into an exact param object type (`lib/types.d.ts`), and `navigate<T extends string>(path: T, options?: NavigateOptions<T>)` carries that type through to `options.params` (`lib/navigate.ts`, `lib/types.d.ts`). Call `navigate("/users/:id", { params: { wrongKey: "x" } })` and TypeScript rejects it; at runtime, the wrong key is silently dropped and `:id` is stripped from the URL (`tests/routing.test.ts`).
- **URL encoding by default.** `:param` substitution runs through `encodeURIComponent` (`lib/navigate.ts`). Query values are encoded the same way (`lib/navigate.ts`). Matching uses `decodeURIComponent` on both segment values (`lib/match.ts`) and wildcard captures (`lib/match.ts`), so round-tripping is symmetric.
- **Wildcard substitution is raw (not encoded)**, by design — wildcard values may contain `/` (`lib/navigate.ts`).
- **Meta from the leaf route only.** `tryMatchRoute` reads meta off `lastMatch` (the final entry in `nestedMatches`) when computing `route().meta` (`lib/utils.ts`). Parent-route meta is not inherited — verified in `tests/features.test.ts` where `/admin` has `meta: { section: "admin" }` and `/admin/users` exposes only the child's `{ title: "User Management" }`.
- **Inline meta merges with route meta.** `mergeMeta()` spreads `inlineMeta` over `routeMeta` so per-navigation overrides win (`lib/utils.ts`). Verified in `tests/features-nav.test.ts` where inline `{ title: "Override" }` is merged over route `{ title: "About", section: "info" }` to produce `{ title: "Override", section: "info" }`.
- **All values are strings.** Cast in user code (`docs/api/route.mdx:135-141`). No parser hooks (contrast TanStack's `Param Parsers` experiment and Vue Router's custom regex params).

### Competitors

- **TanStack** treats search params as first-class typed state with `validateSearch` (Zod schemas), inheritance, structural sharing, and parsed (non-string) values. This is the gold standard for query handling in this group.
- **Vue Router** supports per-param regex (`:id(\\d+)`), repeatable params (`:id+`), optional (`:id?`), and converts types based on the regex.
- **Solid Router** has `matchFilters` (enum arrays, regex, predicate functions) and uses `*name` for named wildcards.
- **Angular** uniquely has **matrix params** (`/products;view=grid;filter=new`) scoped to individual segments, plus query params and route data. `withComponentInputBinding` auto-binds all of them to component `input()`s.
- **Next.js** exposes `params` and `searchParams` as async `Promise`s on Server Components, and `useSearchParams` on the client — values can be `string | string[]`.

**Verdict:** HellaJS's compile-time param typing is genuinely nice — `ExtractParams` is a clean template-literal trick with zero runtime cost. But the meta-from-leaf-only rule (a documented behavior, not a bug) and the absence of query schema validation put it behind TanStack and Vue Router on data richness. Matrix params are entirely out of scope.

---

## 8. Built-in Features Matrix

| Feature | HellaJS | TanStack | Vue Router | Solid Router | Angular Router | Next.js Router |
|---|---|---|---|---|---|---|
| Nested routes | Yes (`children`, param inheritance) | Yes (route tree) | Yes (`children` + `<RouterView>`) | Yes (`<Route>` + `props.children`) | Yes (`children` + `<router-outlet>`) | Yes (nested folders + layouts) |
| Dynamic segments (`:id`) | Yes | Yes | Yes (+ regex) | Yes (+ `matchFilters`) | Yes | Yes (`[id]` folder) |
| Wildcard / catch-all | `*` | `*` splat | `:param(.*)` | `*` / `*name` | `**` | `[...slug]` |
| Optional params | No | Yes | Yes (`:id?`) | Yes (`:id?`) | No | No (folder optional via `(group)`) |
| Regex matchers | No | No (parse-time only) | Yes | Yes (filters) | Yes (`UrlMatcher`) | No |
| History mode | `history`, `hash` | Custom history | web, hash, memory | web, hash, memory, static | `PathLocationStrategy`, `HashLocationStrategy` | History (built-in) |
| Programmatic navigation | `navigate()` | `navigate()` | `router.push/replace` | `useNavigate()` | `router.navigate` | `useRouter().push/replace` |
| Anchor interception | No | Yes (`<Link>`) | Yes (`<RouterLink>`) | Yes (default; opt-out) | Yes (`RouterLink`) | Yes (`<Link>`) |
| Global hooks | `hooks.before` / `after` (non-blocking) | `beforeLoad` per route (can redirect) | `beforeEach` / `afterEach` (can cancel) | `useBeforeLeave` (can prevent) | Guards (can cancel/redirect) | Middleware |
| Per-route guards | `before` (non-blocking) | `beforeLoad` (blocking) | `beforeEnter` (blocking) | `useBeforeLeave` (blocking) | `CanActivate` etc. (blocking) | Layout/middleware checks |
| Loaders / data fetching | No | Yes (typed loaders, cache, prefetch) | Yes (`data loaders`, Colada) | Yes (`preload`, `query`, `createAsync`) | Yes (`resolve`, blocking) | Yes (Server Components, `generateStaticParams`) |
| Redirects | String map + `redirects` array | `redirect()` helper | `redirect: string \| function` | `throw redirect()` | `redirectTo`, `RedirectFunction` | `redirect()` server-side |
| 404 handling | `notFound` (function or string) | `notFoundComponent` | Catch-all route | `*404` route | `**` route | `not-found.tsx` |
| Route metadata | Per-route `meta` (leaf only) | Route `meta`, `staticData` | Route `meta` fields | Route `info` | Route `data` + resolvers | `metadata` export |
| Scroll restoration | 3 levels (global, route, inline) + custom fn | `scrollRestoration` | `scrollBehavior(to, from, savedPosition)` | `noScroll` per link | `withInMemoryScrolling` | `scroll={false}` per `<Link>` |
| Type-safe routes | Template-literal params | Generated route tree (full) | Opt-in typed routes | Manual + `MatchFilters` | Manual | `PageProps`/`LayoutProps` helpers |
| SSR | No | Yes (Start) | Yes (Nuxt) | Yes (Solid Start) | Yes (Angular Universal) | Native |
| Code splitting | User-managed (any signal-driven lazy) | Built-in (route files) | `() => import(...)` components | `lazy(() => import(...))` | `loadComponent` / `loadChildren` | Built-in per route |

### Notable HellaJS differentiators

- **Three exports, period.** `router`, `route`, `navigate` (`lib/index.ts`). No `RouterLink`, no `RouterView`, no `useX` hooks, no provider component. Any UI framework can drive it.
- **Single reactive route signal.** `route()` exposes handler, params, query, path, and meta in one object (`lib/state.ts`). No `useParams()` + `useLocation()` + `useMatch()` decomposition.
- **Three-tier scroll behavior** with inline > route > global precedence and a custom `(to, from) => { top, left? } | null` function shape (`lib/internal/matched.ts`). Auto-skips when `to === from` (`lib/internal/matched.ts`).
- **Inline meta merging.** `navigate(path, { meta })` spreads inline meta over route-level meta, preserving non-overridden keys (`lib/utils.ts`).
- **Reactive reconfiguration.** Calling `router()` again swaps the entire route map, hooks, redirects, and listener atomically (`lib/router.ts`). Useful for HMR or runtime route injection.
- **Compile-time param typing without codegen.** `ExtractParams<T>` infers param names from any string literal at zero runtime cost (`lib/types.d.ts`). TanStack and Next.js need build-time codegen for the same effect.
- **Non-blocking hooks by design.** Navigation always completes; all hook errors are caught and logged (`lib/hooks.ts`). The handler always runs. Predictable at the cost of guard semantics.
- **`EMPTY_OBJECT` reuse for param/query-free routes.** A single frozen `{}` is returned for every static match (`lib/utils.ts`), eliminating per-navigation allocation in the common case.

---

## 9. Ergonomics & Syntax

```js
import { effect, signal } from "@hellajs/core";
import { router, navigate, route } from "@hellajs/router";

const currentView = signal(null);

router({
  routes: {
    "/":                  () => currentView(<HomePage />),
    "/users/:id":         (params) => currentView(<UserProfile id={params.id} />),
    "/files/*":           (params) => currentView(<FileViewer path={params["*"]} />),
    "/search":            (params, query) => currentView(<Search q={query.q} />),
    "/dashboard": {
      before: () => { if (!authed()) navigate("/login"); },
      handler: () => { if (authed()) currentView(<Dashboard />); },
      after:  () => trackPageView("dashboard"),
      meta:   { title: "Dashboard" },
      scroll: "top",
      children: {
        "/settings": () => currentView(<Settings />)
      }
    },
    "/old": "/new"  // string redirect
  },
  redirects: [{ from: ["/tasks", "/items"], to: "/todos" }],
  hooks: { before: () => loading(true), after: () => loading(false) },
  notFound: () => currentView(<NotFound />),
  mode: "history",
  scrollBehavior: "top"
});

// Reactive route access
effect(() => {
  document.title = route().meta?.title ?? "My App";
});

// Type-safe navigation
navigate("/users/:id", {
  params: { id: "123" },
  query:  { tab: "overview" },
  replace: true,
  scroll: "top",
  meta: { analytics: "profile-view" }
});
```

HellaJS's API shape is closer to a configuration object than a component tree. Vue Router and Angular also use config objects, but both require a component to render into (`<RouterView>` / `<router-outlet>`); HellaJS's handlers are plain functions that typically write to a signal the consumer controls. Solid Router and TanStack Router lean on JSX (`<Route>`) and hooks (`useNavigate`, `useParams`, `useMatch`) — more familiar to React-era developers, but more API to learn. Next.js removes the configuration step entirely (the file system is the config), at the cost of locking you into the Next.js build pipeline.

The closest sibling in spirit is Solid Router: both expose the route as a reactive primitive rather than a component tree. HellaJS trades Solid's preload/data APIs and `<A>` interception for ~7 KB smaller gzip and a single `route()` signal instead of `useParams` + `useSearchParams` + `useLocation` + `useMatch` + `useCurrentMatches`.

---

## Bottom Line

Architecturally, HellaJS router is the minimalist of this group: a signal-driven, config-object router that does five-phase resolution, nested param inheritance, and a complete hook lifecycle in ~5 KB minified. It belongs firmly in the "client-side reactive router" camp alongside Solid Router, with Vue Router as the elder sibling and TanStack/Angular as the maximalist alternatives. Next.js is a different paradigm (full-stack, file-system) and isn't directly comparable on mechanism.

What sets HellaJS apart — and no single competitor matches all of:

1. **Smallest in the group** — ~2.3 KB gzip standalone (~5.2 KB with core peer), vs. Solid Router at ~9.3 KB, Angular at ~30.7 KB, TanStack at ~39.5 KB. Zero runtime dependencies.
2. **Single route signal, no provider** — `route()` exposes the entire current route state with no `useX` hooks, no `<Router>` wrapper, no DI. Usable outside any UI framework.
3. **No rendering coupling** — handlers are plain functions; pair with `@hellajs/dom`, React, vanilla JS, or anything else. Vue/Solid/Angular/Next.js all assume a specific component tree.
4. **Compile-time param typing without codegen** — `ExtractParams<T>` infers param names from any string literal at write time, no `routeTree.gen.ts` step (unlike TanStack) and no build pipeline (unlike Next.js).
5. **Reactive reconfiguration** — re-calling `router()` atomically swaps routes, hooks, redirects, and listener (`lib/router.ts`). HMR-friendly with no teardown ceremony.
6. **Non-blocking hook execution** — predictable "navigation always completes" model with full error logging (`lib/hooks.ts`). Every other router here allows hooks to cancel or redirect; HellaJS chooses simplicity over guard semantics.
7. **Three-tier scroll control** — global `scrollBehavior`, per-route `scroll`, inline `navigate({ scroll })`, with custom `(to, from) => { top, left? } | null` functions and explicit `false` to disable (`lib/internal/matched.ts`).

Its gaps are the predictable ones: **no anchor interception** (you write `<a>` handlers yourself), **no real guards** (`before` hooks can't block navigation — a deliberate but limiting choice), **no built-in loaders / data fetching / cache** (use `@hellajs/resource` or anything else), **no SSR**, **no code splitting primitives**, **no devtools**, **no regex route matchers**, **meta from leaf route only** (not inherited up the tree), and **ecosystem maturity** orders of magnitude behind Vue Router and Next.js. If you need any of loaders, search-param schemas, guard-driven redirects, or SSR, TanStack Router or one of the framework routers is the better choice. If you want a tiny, reactive, framework-agnostic client router that gets out of the way, HellaJS is the leanest option here.
