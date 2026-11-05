# router-best-practices

Compiled by `vp run skills-build` from `rules/` - never hand-edit; regenerate instead.

Best practices for @hellajs/router, the reactive routing package: router() configuration with nested routes, params, meta, redirects, and notFound; the route() signal (path, params, query, crumbs, active, pending); navigate() and href() with typed param substitution; before/after/leave guards including async deferral; history/hash/memory modes, scroll behavior, link interception, and resetRouter. Every rule is grounded in the package source and test suite.

- Version: 1.0.0
- Organization: HellaJS
- Date: 2026-11-04

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Contents
- 1. Route configuration
  - 1.1 Order flat routes specific-first; only nested routes are sorted (`cfg-flat-order-specific-first`)
  - 1.2 Reconfigure routes with a fresh object, never in-place mutation (`cfg-fresh-routes-object`)
  - 1.3 Turn on inheritMeta to cascade meta; leaf replaces by default (`cfg-meta-inheritance`)
  - 1.4 Nest routes with children; params flow parent to leaf (`cfg-nested-params-inherit`)
  - 1.5 Mark optional segments with :param? and read them as possibly absent (`cfg-optional-params`)
  - 1.6 Trust the resolution order: redirects, nested, flat, notFound (`cfg-resolution-order`)
  - 1.7 Capture rest paths with * and insert wildcard values raw (`cfg-wildcard-capture`)
- 2. Navigation and URLs
  - 2.1 Drive nav highlighting with route().active(), not path equality (`nav-active-predicate`)
  - 2.2 Keep patterns base-free; set base once in router config (`nav-base-path`)
  - 2.3 Render breadcrumbs from route().crumbs, not path splitting (`nav-crumbs`)
  - 2.4 Pass params through options, never string interpolation (`nav-encode-params`)
  - 2.5 Build anchor hrefs with href(), not template strings (`nav-href-builder`)
  - 2.6 Pick the right navigate options: replace, scroll, meta (`nav-navigate-options`)
- 3. Lifecycle hooks and guards
  - 3.1 Declare the full (params, query) signature (`hook-arity-full-signature`)
  - 3.2 A Promise-returning guard blocks with route().pending (`hook-async-guards`)
  - 3.3 route() is pre-commit inside before hooks (`hook-before-reads-old-route`)
  - 3.4 Plan around the fixed hook order (`hook-execution-order`)
  - 3.5 Return verdicts from guards, never navigate() inside them (`hook-guard-verdict-contract`)
  - 3.6 Guard departures with leave; override with force (`hook-leave-guards`)
- 4. Modes, scroll, and interception
  - 4.1 Treat route() as one atomic commit (`mode-atomic-writes`)
  - 4.2 Choose the mode deliberately; memory is URL-less (`mode-history-hash-memory`)
  - 4.3 Let intercept handle same-origin anchors (`mode-intercept-links`)
  - 4.4 Configure scroll priority once, override per route or navigation (`mode-scroll-behavior`)
  - 4.5 Resolve server routes with the url option (`mode-ssr-url`)
- 5. Reset and re-init
  - 5.1 Reconfigure by calling router() again (`reset-reinit`)
  - 5.2 Reset between tests with resetRouter (`reset-router-teardown`)

## 1. Route configuration

### 1.1 Order flat routes specific-first; only nested routes are sorted

**Impact: HIGH** - a generic flat pattern listed first permanently shadows every specific one after it, so the wrong handler runs and the bug is invisible until the route is hit

Nested route maps are sorted by specificity at every level (non-wildcard before wildcard, deeper before shallow), but flat entries match in plain object insertion order and the first hit wins. List literal and deeper patterns before param and wildcard patterns at the same level, or model the family as nested `children` and let the sort do it.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    "/users/:id": () => renderUser(), // matches "/users/new" first - the generic
    "/users/new": () => renderCreate(), // pattern shadows it: never reached
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const view = signal("");

router({
  routes: {
    "/users/new": () => view("create"), // specific first
    "/users/:id": () => view("detail"),
    // or nest under "/users" - children are specificity-sorted for you
    "/files": {
      handler: () => view("browser"),
      children: {
        "/:id?": () => view("file"),
        "/*": () => view("folder"),
      },
    },
  },
});
```

Reference: `packages/router/lib/internal/utils.ts sortRoutesBySpecificity` and `packages/router/lib/internal/resolve.ts matchFlatPhase` and `packages/router/tests/specificity.test.ts`

### 1.2 Reconfigure routes with a fresh object, never in-place mutation

**Impact: HIGH** - mutating a registered routes map in place is invisible to the matcher, so new routes never match and stale ones never disappear

Route maps are cached by object identity: `router()` builds each map's sorted entry lists once and reuses them for every navigation. Mutating the registered object in place (`routes["/new"] = handler`) changes the object but not the cached entries - the router keeps matching the snapshot from registration time. Reconfigure by calling `router()` again with a fresh object; that also re-sorts and re-registers cleanly.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

const appRoutes = {
  "/": () => renderHome(),
};

router({ routes: appRoutes });

appRoutes["/about"] = () => renderAbout(); // invisible: the entry cache still
// holds the registration-time snapshot; "/about" resolves to notFound
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const view = signal("home");
const appRoutes = {
  "/": () => view("home"),
};

router({ routes: appRoutes });

// reconfigure with a fresh object - new identity, fresh cache entries
router({
  routes: {
    ...appRoutes,
    "/about": () => view("about"),
  },
});
```

Reference: `packages/router/lib/internal/utils.ts getCachedRouteEntries` and `packages/router/lib/router.ts` and `packages/router/tests/routing.test.ts`

### 1.3 Turn on inheritMeta to cascade meta; leaf replaces by default

**Impact: MEDIUM** - parent meta (layouts, roles, titles) silently disappears on nested matches unless the cascade is opted into or a per-route boundary is set

By default meta is leaf-only: each nested level's `meta` replaces the parent's, and `route().meta` after a match is the leaf's object. `router({ inheritMeta: true })` merges parent-to-child instead (child wins on key conflict); a per-route `inheritMeta` overrides the global - `true` opts one route into the cascade, `false` marks a boundary that drops everything above it while its own meta still flows down. Inline `navigate(path, { meta })` merges over whatever the chain resolved and wins on conflict.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  // expecting route().meta.layout === "admin" on /admin/users - it is
  // undefined: leaf-only default discards the parent's meta
  routes: {
    "/admin": {
      meta: { layout: "admin", requiresAuth: true },
      children: { "/users": { meta: { title: "Users" }, handler: () => {} } },
    },
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const layout = signal("");

router({
  inheritMeta: true, // parent meta cascades, leaf wins on conflict
  routes: {
    "/admin": {
      meta: { layout: "admin", requiresAuth: true },
      children: {
        "/users": { meta: { title: "Users" }, handler: () => layout("admin") },
        // route-level boundary: opts out of the cascade for this subtree
        "/public": { inheritMeta: false, meta: { title: "Public" }, handler: () => layout("bare") },
      },
    },
  },
});
```

Reference: `packages/router/lib/internal/resolve.ts matchNestedPhase` and `packages/router/lib/types.d.ts RouterConfig` and `packages/router/tests/inherit-meta.test.ts`

### 1.4 Nest routes with children; params flow parent to leaf

**Impact: MEDIUM** - hand-parsing route().path to recover parent params duplicates the inheritance the matcher already provides and drifts on pattern changes

A route value with `children` matches its own pattern, then tries children against the remaining path; every nested level's hooks and handler receive the cumulative params (parent captures merged with child captures, child wins on name conflicts). A parent with a handler still matches when no child fits; a parent without one does not. Crumbs mirror the chain. Do not re-derive the parent's `:userId` by splitting `route().path` - read it off the merged params.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    "/users/:userId": {
      children: {
        "/posts/:postId": () => {
          // re-parsing path to recover userId - it is already in params
          const userId = route().path.split("/")[2];
          loadPost(userId, route().path.split("/")[4]);
        },
      },
    },
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const view = signal("");

router({
  routes: {
    "/users/:userId": {
      handler: () => view("profile"), // runs when no child matches
      children: {
        "/posts/:postId": ({ userId, postId }) =>
          view(`post ${postId} of ${userId}`), // inherited params
      },
    },
  },
});
```

Reference: `packages/router/lib/internal/match.ts matchNestedEntry` and `packages/router/lib/internal/resolve.ts matchNestedPhase` and `packages/router/docs/concepts/routing.mdx`

### 1.5 Mark optional segments with :param? and read them as possibly absent

**Impact: MEDIUM** - code that assumes an optional param is always present breaks on the skipped form, where the key is absent from params entirely

A `:param?` segment matches one path segment or is skipped (consume-first backtracking); a skipped optional leaves no key in `params`, so `params.id` is absent, not an empty string. `?` in a pattern always means an optional parameter - patterns never carry query strings. Optionals work mid-pattern (`/posts/:id?/edit`) and combine with wildcards; on the build side an absent optional strips its token together with the preceding slash, so `navigate("/users/:id?")` yields `/users`. Type the value as `string | undefined` and branch on presence.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    // matches both /users and /users/7
    "/users/:id?": (params) => loadUser(params.id), // params.id is undefined on
    // "/users" - and never a path param on this route's query-only visits
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const view = signal("");

router({
  routes: {
    "/users/:id?": ({ id }) => view(id ? "detail:" + id : "list"),
  },
});
```

Reference: `packages/router/lib/internal/match.ts matchSegments` and `packages/router/lib/types.d.ts ExtractParams` and `packages/router/tests/optional-params.test.ts`

### 1.6 Trust the resolution order: redirects, nested, flat, notFound

**Impact: HIGH** - hand-rolled redirects in guards and handlers run late, re-enter resolution mid-flight, and churn leave guards for moves the pipeline does for free

Every navigation resolves through one strict pipeline, first hit wins: global `redirects` entries (array order, `from` matched as a pattern, query ignored), then route-map string values (`"/old": "/new"`), then nested routes (specificity-sorted per level), then flat routes (insertion order), then `notFound` (a string replace-redirects; a function receives the attempted path, query included). Express static moves and 404 handling with these knobs; a `before`-hook or handler-time redirect is a second navigation that re-enters the pipeline while the first is still committing.

**Incorrect (what is wrong):**

```ts
import { navigate, router } from "@hellajs/router";

router({
  routes: {
    "/old": () => navigate("/"), // handler-time redirect: commits "/old" first,
    "/": () => {},               // then re-enters resolution - leave guards and
    // analytics see two navigations, and "/old" lands in history unless replaced
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const view = signal("home");

router({
  redirects: [{ from: ["/old", "/legacy"], to: "/" }],
  routes: {
    "/": () => view("home"),
    "/404": () => view("missing"),
  },
  notFound: "/404", // unmatched paths replace-redirect, never a dead entry
});
```

Reference: `packages/router/lib/internal/resolve.ts tryRedirect` and `packages/router/docs/api/router.mdx`

### 1.7 Capture rest paths with * and insert wildcard values raw

**Impact: MEDIUM** - assuming a leading slash on wildcard captures or pre-encoding wildcard builds yields doubled or broken path joins

A trailing `*` captures the remaining segments without a leading slash: `/files/*` matched against `/files/docs/readme.md` gives `params["*"] === "docs/readme.md"`. On the build side `navigate`/`href` insert the `"*"` value raw (not `encodeURIComponent`'d) because it holds path segments that may contain `/` - unlike `:param` values, which always encode. Join the captured value onto prefixes with an explicit slash, and treat `params["*"]` as possibly absent under strict null checks.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    // expects params["*"] to start with "/": "/api/files" + "docs/x"
    // concatenates to "/api/filesdocs/x"
    "/files/*": (params) => fetchFile("/api/files" + params["*"]),
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { navigate, router } from "@hellajs/router";

const view = signal("");

router({
  routes: {
    "/files/*": (params) => view("/api/files/" + (params["*"] ?? "")),
  },
});

// wildcard values insert raw - already a path, never URL-encoded
navigate("/files/*", { params: { "*": "docs/readme.md" } }); // -> /files/docs/readme.md
```

Reference: `packages/router/lib/internal/match.ts matchPattern` and `packages/router/lib/internal/path.ts buildPath` and `packages/router/tests/url-encoding.test.ts`


## 2. Navigation and URLs

### 2.1 Drive nav highlighting with route().active(), not path equality

**Impact: MEDIUM** - strict path equality leaves parent nav links dead on every subroute, while prefix includes() lights them up on unrelated paths

`route().active(pattern)` is the built-in nav-link predicate: ancestor-aware segment matching (query stripped, segment boundaries respected - `/admin` is active at `/admin/users` but not at `/administrators`), reactive (reads `route().path` dynamically), with root `/` exact-only so a home link lights up only at `/`. Strict equality misses subroutes; hand-rolled `startsWith` overshoots.

**Incorrect (what is wrong):**

```ts
import { route } from "@hellajs/router";

// dead highlight on /admin/users; true on /administrators with startsWith
const adminActive = route().path === "/admin";
const adminPrefix = route().path.startsWith("/admin");
```

**Correct (what is right):**

```ts
import { effect } from "@hellajs/core";
import { route } from "@hellajs/router";

effect(() => {
  const adminActive = route().active("/admin"); // true on /admin and /admin/*
  const homeActive = route().active("/"); // exact-only: false everywhere else
  highlight("admin", adminActive);
  highlight("home", homeActive);
});

function highlight(_id: string, _on: boolean) {}
```

Reference: `packages/router/lib/route.ts activeFn` and `packages/router/lib/internal/match.ts matchPattern` and `packages/router/tests/active.test.ts`

### 2.2 Keep patterns base-free; set base once in router config

**Impact: HIGH** - manually prefixing paths double-applies the base on every history commit, landing users on /app/app/... routes that resolve to notFound

`base: "/app"` is strip-on-read, re-add-on-commit: the router strips it from every URL it reads (initial location, popstate, intercepted clicks, the `url` option) and prefixes it on every history write. Everything inside the pipeline - patterns, `navigate()` targets, `href()` output, `route().path`, `active()`, crumbs - stays logical and base-free. The base must be a `"/"`-prefixed string (else `router()` throws); trailing slashes normalize away; hash mode ignores it entirely (the pathname is never touched).

**Incorrect (what is wrong):**

```ts
import { navigate, router } from "@hellajs/router";

router({
  base: "/app",
  routes: { "/app/dashboard": () => renderDash() }, // pattern carries the base:
});
// the URL /app/app/dashboard is what matches; real /app/dashboard never does
navigate("/app/settings"); // commits /app/app/settings
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { navigate, router } from "@hellajs/router";

const view = signal("");

router({
  base: "/app", // served from https://example.com/app/
  routes: { "/dashboard": () => view("dash") },
});
navigate("/settings"); // commits /app/settings; route().path === "/settings"
```

Reference: `packages/router/lib/router.ts` and `packages/router/lib/internal/utils.ts stripBase` and `packages/router/tests/base-path.test.ts`

### 2.3 Render breadcrumbs from route().crumbs, not path splitting

**Impact: LOW** - path splitting guesses at nesting the router already records, and breaks the moment a pattern gains an optional or wildcard segment

Every matched navigation writes `route().crumbs`: a frozen parent-to-leaf chain, one `Crumb` per nesting level - `segment` is the route-map key that matched at that level, `path` the cumulative matched URL with query excluded (safe for `href`), `params` the params inherited through that level. Flat matches carry a single crumb; a `notFound` resolution carries an empty array. Deriving breadcrumbs by splitting `route().path` re-implements the matcher badly.

**Incorrect (what is wrong):**

```ts
import { route } from "@hellajs/router";

// guesses one crumb per raw path segment: wrong for /users/:id? (0 or 1
// segments), wildcards, and any pattern whose depth differs from the URL's
const crumbs = route().path.split("/").filter(Boolean);
```

**Correct (what is right):**

```ts
import { href, route } from "@hellajs/router";

const labels: Record<string, string> = { "/users": "Users", "/users/:userId": "Profile" };

const trail = route().crumbs.map((crumb) => ({
  label: labels[crumb.segment] ?? crumb.segment, // map key -> label
  url: crumb.path, // cumulative URL, query excluded - safe for href()
}));
const deepLink = href("/users/:userId", { params: { userId: route().params.userId ?? "0" } });
```

Reference: `packages/router/lib/internal/resolve.ts matchNestedPhase` and `packages/router/lib/types.d.ts Crumb` and `packages/router/tests/crumbs.test.ts`

### 2.4 Pass params through options, never string interpolation

**Impact: CRITICAL** - hand-interpolated params with spaces, slashes, or reserved characters change which route matches or silently truncate the path

`navigate` and `href` substitute `:param` tokens with `encodeURIComponent` applied (`"hello world & more!"` becomes `hello%20world%20%26%20more!`), serialize the query, and strip unmatched tokens - all in one shared builder. Template-string interpolation skips the encoding and the type-checked `ExtractParams` mapping: a value containing `/` or `?` splits into extra segments, a `&` or `#` truncates, and a typo'd key fails silently instead of at compile time. Only the wildcard `"*"` value is inserted raw - it is already a path.

**Incorrect (what is wrong):**

```ts
import { navigate } from "@hellajs/router";

const slug = "hello world & more!";
navigate(`/posts/${slug}`); // -> /posts/hello world & more!
// the space and & break the URL; the route matches "/posts/:somethingElse"
// or nothing, and no compile-time check tied the value to the pattern
```

**Correct (what is right):**

```ts
import { navigate } from "@hellajs/router";

const slug = "hello world & more!";
navigate("/posts/:slug", { params: { slug } }); // -> /posts/hello%20world%20%26%20more!
navigate("/search", { query: { q: slug } }); // query values encode too
```

Reference: `packages/router/lib/internal/path.ts buildPath` and `packages/router/docs/api/navigate.mdx` and `packages/router/tests/url-encoding.test.ts`

### 2.5 Build anchor hrefs with href(), not template strings

**Impact: MEDIUM** - hand-built hrefs drift from the pattern's param syntax, skip encoding, and duplicate what href() already guarantees

`href(path, { params, query })` runs the exact same substitution as `navigate` (shared `buildPath`): `:param` values encode, absent `:param?` tokens strip with their slash, `*` inserts raw, query serializes - and the literal path type-checks the params against the pattern. It returns the URL string without touching history; author plain `<a>` elements with it and let link interception route the clicks. Output is base-free like everything else in the pipeline - `base` is re-added only at history-commit time.

**Incorrect (what is wrong):**

```ts
import { navigate } from "@hellajs/router";

const userId = "42";
// hand-rolled href: no encoding, no compile-time tie to the pattern,
// silently wrong the day the route changes shape
navigate(`/users/${userId}/posts`);
```

**Correct (what is right):**

```ts
import { href } from "@hellajs/router";

const userId = "42";
const profileUrl = href("/users/:id", { params: { id: userId } }); // "/users/42"
const tabUrl = href("/users/:id", { params: { id: userId }, query: { tab: "posts" } });
const optionalUrl = href("/users/:id?", {}); // "/users" - token and slash strip
```

Reference: `packages/router/lib/href.ts` and `packages/router/lib/internal/path.ts buildPath` and `packages/router/docs/api/href.mdx`

### 2.6 Pick the right navigate options: replace, scroll, meta

**Impact: MEDIUM** - pushed redirects leave dead history entries the back button walks into, and per-navigation concerns leak into global config when options go unused

`navigate(path, options)` carries per-navigation concerns so config stays global: `replace: true` swaps the history entry instead of pushing (auth redirects, notFound recovery, post-form landing - back never returns to the dead page); `scroll` overrides route and global scroll for this one navigation (`false` disables); `meta` merges over the resolved route meta and wins on key conflicts (titles, analytics context). `force` (leave-guard skip) and `params`/`query` have their own rules.

**Incorrect (what is wrong):**

```ts
import { navigate } from "@hellajs/router";

// after a successful login, back should not return to /login - but a plain
// push leaves it in history
navigate("/dashboard");
```

**Correct (what is right):**

```ts
import { navigate } from "@hellajs/router";

navigate("/dashboard", {
  replace: true, // overwrites /login in history
  scroll: "top", // this navigation only
  meta: { title: "Dashboard", section: "app" }, // merges over route meta
});
```

Reference: `packages/router/lib/navigate.ts` and `packages/router/lib/internal/resolve.ts go` and `packages/router/tests/navigate-options.test.ts`


## 3. Lifecycle hooks and guards

### 3.1 Declare the full (params, query) signature

**Impact: HIGH** - a one-argument handler receives params on param routes but the query object on static routes, so the same style means two different things

Handler and hook dispatch is arity-based: when the route has params, the function is called `(params, query)`; when params are empty, a two-plus-arg function gets `(undefined, query)` and a one-arg function gets `(query)` - the query as its first and only argument. Declaring `(params, query)` on every handler and route hook is the only style that means the same thing on every route. Under strict null checks, read params and query values as possibly undefined.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    "/search": (params) => search(params.q), // works - but "params" IS the query
    "/search/:scope": (params) => search(params.q), // broken - params is now the
    // path params object; q lives in the second argument this style never declares
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const view = signal("");

router({
  routes: {
    "/search": (params, query) => view(`q=${query.q ?? ""}`), // params is undefined
    "/search/:scope": (params, query) => view(`${params.scope}:${query.q ?? ""}`),
  },
});
```

Reference: `packages/router/lib/internal/hooks.ts executeHook` and `packages/router/lib/internal/matched.ts invokeRouteGuard` and `packages/router/tests/hook-arity.test.ts`

### 3.2 A Promise-returning guard blocks with route().pending

**Impact: CRITICAL** - a fire-and-forget async guard proceeds navigation immediately, so unauthenticated users land on the page while the check is still running

Return the Promise from a `before`/`leave` guard and the client defers the whole commit: `route().pending` flips `true`, the URL holds, and the awaited resolution is interpreted as the verdict (`false` cancels, a string redirects, a rejection cancels and logs). The first async guard owns the verdict - guards after it in the chain do not run - and the handler and `after` hooks fire only after the deferred commit. A newer navigation supersedes an in-flight one; its continuation abandons silently. On the server (`url` mode) a Promise never blocks - resolution proceeds and only rejections log - so gate server renders with sync checks. Render your loading UI from `route().pending`, not a hand-rolled signal.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    "/admin": {
      // not returned: navigation proceeds NOW, the check races the render,
      // and the late navigate() re-enters resolution
      before: () => {
        checkAuth().then((ok) => {
          if (!ok) navigateToLogin();
        });
      },
      handler: () => renderAdmin(),
    },
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { navigate, route, router } from "@hellajs/router";

const view = signal("loading");

router({
  routes: {
    "/admin": {
      // returned Promise: the commit defers until it settles
      before: async () => ((await checkAuth()) ? true : "/login"),
      handler: () => view("admin"),
    },
    "/login": () => view("login"),
  },
});

navigate("/admin");
const inFlight = route().pending; // true until the guard settles - spinner state

async function checkAuth(): Promise<boolean> {
  return true;
}
```

Reference: `packages/router/lib/internal/matched.ts interpretGuardResult` and `packages/router/lib/internal/resolve.ts commitMatch` and `packages/router/tests/async-guards.test.ts`

### 3.3 route() is pre-commit inside before hooks

**Impact: HIGH** - analytics and permission checks that read route() in a before hook describe the route being left, not the one arriving

Guards run before the `route()` signal is written, so inside a `before` hook or global `hooks.before`, `route()` still holds the route being left - its `path`, `params`, and `meta` are the old route's. The incoming path arrives as an argument (global hooks receive `(to, from)`; `to` carries the query). React to the committed route in `after` hooks or global `hooks.after` - there `route()` already holds the committed match and `from` supplies the prior path without capturing it yourself.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  hooks: {
    before: () => {
      // route().path is the page being LEFT - every page view reports
      // the previous page
      trackPageView(route().path);
    },
  },
  routes: { "/": () => renderHome() },
});
```

**Correct (what is right):**

```ts
import { router } from "@hellajs/router";

router({
  hooks: {
    // after: route() is committed; (to, from) carry both paths, query included
    after: (to, from) => trackPageView(to, from),
  },
  routes: { "/": () => {}, "/editor": () => {} },
});

function trackPageView(_to: string, _from: string) {}
```

Reference: `packages/router/lib/internal/matched.ts runGuardsNested` and `packages/router/lib/internal/matched.ts runGlobalBefore` and `packages/router/tests/hooks.test.ts`

### 3.4 Plan around the fixed hook order

**Impact: MEDIUM** - setup placed in a parent's after hook is invisible to the child's before hook, which already ran in the other direction

One navigation through a nested match runs, in order: global `leave` -> child `leave` -> parent `leave` -> global `before` -> parent `before` -> child `before` -> `handler` -> child `after` -> parent `after` -> global `after`. The guard chain short-circuits on the first non-pass verdict - a cancelled or redirected navigation never runs the handler or any `after` hook. The leave phase is skipped on init/SSR (nothing matched yet), on same-path navigation, and when the target resolves to `notFound`. Place setup where the order guarantees visibility: leave guards run child-first (teardown), everything else parent-first (setup).

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    "/panel": {
      after: () => initPanelState(), // runs AFTER the child handler - too late
      children: {
        "/stats": {
          before: () => readPanelState(), // undefined: panel not initialized yet
          handler: () => renderStats(),
        },
      },
    },
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const log = signal<string[]>([]);

router({
  hooks: {
    leave: () => log([...log(), "global leave"]),
    before: () => log([...log(), "global before"]),
    after: () => log([...log(), "global after"]),
  },
  routes: {
    "/parent": {
      before: () => log([...log(), "parent before"]), // setup: parent-first
      after: () => log([...log(), "parent after"]), // teardown: child-first
      leave: () => log([...log(), "parent leave"]),
      children: {
        "/child": {
          before: () => log([...log(), "child before"]),
          after: () => log([...log(), "child after"]),
          leave: () => log([...log(), "child leave"]),
          handler: () => log([...log(), "handler"]),
        },
      },
    },
  },
});
```

Reference: `packages/router/lib/internal/matched.ts runGuardsNested` and `packages/router/lib/internal/matched.ts executeRouteWithHooks` and `packages/router/docs/api/router.mdx`

### 3.5 Return verdicts from guards, never navigate() inside them

**Impact: CRITICAL** - a guard that navigates instead of returning a verdict re-enters resolution mid-flight, committing interleaved URL and route writes

`before`/`leave` guards and the global `hooks.before`/`hooks.leave` speak a verdict protocol: return `false` to cancel (no URL, no signal write), a non-empty `string` to redirect there via replace, anything else (`undefined`, `true`) to proceed; a throw cancels and logs. The router interprets the return - so calling `navigate()` inside a guard fights the machinery: the outer navigation is still resolving, the inner call re-enters the pipeline, and URL commits interleave. Return the target path and let the router redirect.

**Incorrect (what is wrong):**

```ts
import { navigate, router } from "@hellajs/router";

router({
  routes: {
    "/admin": {
      // void return = "proceed", AND a second navigation starts mid-resolution
      before: () => {
        if (!isAuthed()) navigate("/login");
      },
      handler: () => renderAdmin(),
    },
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";

const authed = signal(true);
const view = signal("");

router({
  routes: {
    "/admin": {
      before: () => (authed() ? true : "/login"), // string = redirect (replace)
      handler: () => view("admin"),
    },
    "/login": () => view("login"),
  },
});
```

Reference: `packages/router/lib/internal/matched.ts interpretSyncResult` and `packages/router/tests/guards.test.ts` and `packages/router/docs/api/router.mdx`

### 3.6 Guard departures with leave; override with force

**Impact: HIGH** - unconditional leave redirects loop into the hop cap and cancel navigation, while dirty-state checks that miss back/forward lose edits silently

Route-level `leave` hooks and the global `hooks.leave` run on every navigation away from a matched route - including browser back/forward (a cancelled pop restores the URL). Order: global leave first, then child-to-parent with the departed route's params. Same-path navigation (query ignored) skips leave entirely; `navigate(path, { force: true })` skips leave guards for that one navigation - the override path for confirmed discards - while incoming `before` guards still run. Return `false` to block, a string to redirect; condition every leave redirect on mutable state, because an unconditional string different from the current path re-enters resolution and dies at the 20-hop redirect cap.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    "/editor": {
      handler: () => renderEditor(),
      leave: () => "/save", // every departure redirects - including the one
      // away from /save; the loop caps at 20 hops and cancels
    },
  },
});
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";
import { navigate, router } from "@hellajs/router";

const dirty = signal(false);
const view = signal("");

router({
  routes: {
    "/editor": {
      handler: () => view("editor"),
      leave: () => (dirty() ? false : undefined), // block while unsaved
    },
    "/dashboard": () => view("dashboard"),
  },
});

navigate("/dashboard"); // cancelled while dirty: route and URL unchanged
navigate("/dashboard", { force: true }); // after user confirms discard
```

Reference: `packages/router/lib/internal/matched.ts runLeaveGuards` and `packages/router/lib/types.d.ts RouteWithHooks` and `packages/router/tests/leave-guards.test.ts`


## 4. Modes, scroll, and interception

### 4.1 Treat route() as one atomic commit

**Impact: MEDIUM** - params stashed outside the reactive scope go stale after the next navigation, mixing fields from two different matches

Every navigation writes the `route()` signal once - `path`, `params`, `query`, `handler`, `meta`, and `crumbs` always describe the same match, and subscribers fire exactly once per navigation. The documented exceptions are field-preserving spread-writes (the `pending` flip while an async guard holds the commit, and init pre-seeding). So never capture route fields into long-lived variables at setup time; read `route()` inside the effect or computation that consumes it, and branch on fields together rather than caching them apart.

**Incorrect (what is wrong):**

```ts
import { navigate, route } from "@hellajs/router";

// captured once at module scope: still "/list" params after navigating away
const initialParams = route().params;
const targetId = initialParams.id;

navigate("/items/:id", { params: { id: "7" } });
renderItem(targetId); // undefined - stale params from a different match
```

**Correct (what is right):**

```ts
import { effect } from "@hellajs/core";
import { navigate, route } from "@hellajs/router";

effect(() => {
  // inside the effect: one atomic read, always the current committed match
  const { path, params } = route();
  if (path.startsWith("/items")) {
    renderItem(params.id ?? "none");
  }
});

navigate("/items/:id", { params: { id: "7" } });

function renderItem(_id: string) {}
```

Reference: `packages/router/lib/internal/resolve.ts commitMatch` and `packages/router/tests/atomicity.test.ts` and `packages/router/docs/api/route.mdx`

### 4.2 Choose the mode deliberately; memory is URL-less

**Impact: MEDIUM** - memory-mode apps that read window.location or expect the back button to work sit on machinery that is never attached

`mode: "history"` (default) drives clean URLs through pushState/replaceState and popstate; `"hash"` reads and writes `#/path` URLs (plain `#section` anchors are ignored - only `#/` hashes are routes); `"memory"` attaches no listeners and never touches the URL or history - the route advances only via `navigate()`, and there is no `back()`/`forward()` API (no entry stack is kept). In every mode the current route is `route()`; never read `window.location` for it. Re-running `router()` swaps modes cleanly - the previous listeners detach first.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({ mode: "memory", routes: { "/step/:n": () => renderStep() } });

// later: wiring a back button against history that memory mode never writes
window.addEventListener("popstate", () => renderStep()); // never fires
```

**Correct (what is right):**

```ts
import { navigate, route, router } from "@hellajs/router";

router({
  mode: "memory", // wizard flow: no URL to share, no history to respect
  routes: {
    "/": () => {},
    "/step/:n": ({ n }) => step(n ?? ""),
  },
});

navigate("/step/:n", { params: { n: "2" } });
const current = route().path; // "/step/2" - no URL was touched

function step(_n: string) {}
```

Reference: `packages/router/lib/router.ts attachListeners` and `packages/router/lib/internal/resolve.ts go` and `packages/router/tests/memory-mode.test.ts`

### 4.3 Let intercept handle same-origin anchors

**Impact: MEDIUM** - hand-rolled click interceptors duplicate the built-in one and double-navigate, while fighting its skip rules

`intercept` defaults to `true`: same-origin http(s) `<a>` clicks route through `navigate()` with no page reload. The built-in handler already skips what it must - `defaultPrevented`, modifier keys (ctrl/meta/shift/alt), `target !== "_self"`, `download` links, cross-origin and non-http(s) hrefs, malformed hrefs - and in history mode leaves in-page `#anchor` jumps native; hash mode requires `#/`-prefixed hrefs. Author plain anchors with `href()`-built URLs and let this run; set `intercept: false` only when you own click handling yourself.

**Incorrect (what is wrong):**

```ts
import { navigate, router } from "@hellajs/router";

router({ routes: { "/about": () => renderAbout() } });

// duplicate interceptor: both this and the built-in handler fire,
// and none of the built-in skip rules are respected
document.addEventListener("click", (event) => {
  const anchor = (event.target as Element | null)?.closest("a");
  if (anchor) {
    event.preventDefault();
    navigate(anchor.getAttribute("href") ?? "/");
  }
});
```

**Correct (what is right):**

```ts
import { router } from "@hellajs/router";

// plain <a href> authoring: same-origin clicks route through navigate()
router({
  routes: {
    "/": () => {},
    "/about": () => {},
  },
  // intercept defaults to true - omit it
});

// opt out only when you own click handling end to end:
router({
  routes: { "/about": () => {} },
  intercept: false,
});
```

Reference: `packages/router/lib/router.ts attachListeners` and `packages/router/tests/intercept.test.ts` and `packages/router/docs/api/router.mdx`

### 4.4 Configure scroll priority once, override per route or navigation

**Impact: MEDIUM** - hand-rolled window.scrollTo calls in handlers fight the router's scroll machine and lose the saved-position restore on back/forward

Scroll resolution follows one priority chain: inline `navigate(path, { scroll })` > route-level `scroll` > global `scrollBehavior`; `false` at any level disables handling; `"auto"` and `"preserve"` skip `scrollTo` entirely. A custom function receives `(to, from, savedPosition)` where `savedPosition` is non-null only on back/forward (null on pushes and replaces) - the standard app shell is `savedPosition ?? { top: 0 }`. String presets ignore it (`"top"` scrolls top even on back). A throw inside a custom fn is caught and logged; navigation is unaffected.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({
  routes: {
    // manual scrollTo in every handler: no restore-on-back, duplicates the
    // router's own post-commit scroll pass
    "/list": () => {
      renderList();
      window.scrollTo(0, 0);
    },
  },
});
```

**Correct (what is right):**

```ts
import { navigate, router } from "@hellajs/router";

router({
  // restore on back/forward, top otherwise - declared once
  scrollBehavior: (to, from, savedPosition) => savedPosition ?? { top: 0, left: 0 },
  routes: {
    "/list": { handler: () => {}, scroll: "preserve" }, // route override
  },
});
navigate("/chat", { scroll: false }); // per-navigation disable (live updates)
```

Reference: `packages/router/lib/internal/scroll.ts handleScroll` and `packages/router/lib/types.d.ts ScrollBehavior` and `packages/router/tests/scroll.test.ts`

### 4.5 Resolve server routes with the url option

**Impact: HIGH** - server renders that rely on async guards or window-based resolution hang or resolve "/" instead of the request path

On the server pass `url: req.url` (a full URL or a bare path - origin and hash are ignored; an invalid URL throws). Resolution is synchronous and `router()` returns the matched `RouteInfo`, so `route()` is already resolved when it returns - no `handler: null` window, no microtask. Async guards never block in this mode (no window): the navigation proceeds and only rejections are logged - gate server access with sync checks and do async data work outside the router or in `resource` with server-side no-op semantics. A second `router({ url })` call in the same process re-resolves against the new URL.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

// server render: async auth gate never blocks here - it logs and proceeds,
// so the private page renders for unauthenticated requests
router({
  routes: {
    "/admin": {
      before: async () => (await loadSession()).valid,
      handler: () => renderAdmin(),
    },
  },
  url: "/admin",
});
```

**Correct (what is right):**

```ts
import { router } from "@hellajs/router";

const initial = router({
  routes: {
    "/admin": {
      before: () => (sessionIsValid() ? true : "/login"), // sync verdicts only
      handler: () => {},
    },
    "/login": () => {},
  },
  url: "/admin?tab=overview", // req.url: resolved synchronously
});
const tab = initial.query.tab ?? ""; // RouteInfo on return - no await

function sessionIsValid(): boolean {
  return true; // resolved from the request's cookie/header before router()
}
```

Reference: `packages/router/lib/router.ts` and `packages/router/lib/internal/matched.ts interpretGuardResult` and `packages/router/tests/ssr.test.ts`


## 5. Reset and re-init

### 5.1 Reconfigure by calling router() again

**Impact: LOW** - manual listener surgery to "swap routes" duplicates handlers the composed cleanup already replaces

`router()` is re-runnable: it replaces the whole config (routes, hooks, redirects, notFound, mode, base, scrollBehavior, inheritMeta) and re-attaches listeners through a composed cleanup that removes the previous popstate/hashchange and click handlers first - no duplicates, no manual `removeEventListener`. Fresh config deserves a fresh routes object (the entry cache keys on identity) and `resetRouter()` first when route state, the leave chain, or the scroll stack also need clearing.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

router({ routes: { "/": () => renderHome() } });

// manual listener surgery: the old popstate handler is still attached,
// and the new one now double-fires resolutions
window.addEventListener("popstate", () => window.dispatchEvent(new PopStateEvent("popstate")));
router({ routes: { "/v2": () => renderV2() } });
```

**Correct (what is right):**

```ts
import { resetRouter, router } from "@hellajs/router";

router({ routes: { "/": () => {} } });

// swap config in one call: old listeners detach, new config takes over
router({ routes: { "/v2": () => {} }, mode: "hash" });

// full teardown when route state and guards must not leak:
resetRouter();
```

Reference: `packages/router/lib/router.ts attachListeners` and `packages/router/lib/resetRouter.ts` and `packages/router/tests/reset-router.test.ts`

### 5.2 Reset between tests with resetRouter

**Impact: LOW** - re-initializing with router() alone leaves the leave-guard chain, scroll stack, and in-flight deferrals of the previous test armed

`resetRouter()` is the full factory reset: config signals (routes, hooks, redirects, notFound, mode, base, scroll, inheritMeta), the `route()` signal (back to `/`, `pending: false`), the leave-guard chain snapshot, the saved scroll stack, in-flight deferred navigations (abandoned via the epoch bump), and all detached listeners. It never touches `window.location`/`history` - seed the URL separately. Calling `router()` again replaces config but not the leave chain or route state, so test teardown wants both.

**Incorrect (what is wrong):**

```ts
import { router } from "@hellajs/router";

// between tests: config is replaced, but the previous test's leave-guard
// chain is still armed - its leave hooks fire on this test's first navigation
router({
  routes: { "/next": () => renderNext() },
});
```

**Correct (what is right):**

```ts
import { resetRouter, router } from "@hellajs/router";

// teardown: full reset, then fresh init for the next test
resetRouter();
router({
  routes: { "/next": () => {} },
});
```

Reference: `packages/router/lib/resetRouter.ts` and `packages/router/tests/reset-router.test.ts` and `packages/router/tests/helpers.ts setupRouterEnv`

